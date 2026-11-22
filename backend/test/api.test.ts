import { createHash } from 'node:crypto';
import {
  type ComplianceResult,
  type EvidenceItem,
  type LivePassport,
  type ProjectDetail,
  type ProjectMaterialsResponse,
  type ProjectSummary,
  SESSION_COOKIE_NAME,
} from '@greenforce/shared';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { demoPdf } from '../src/db/seed/demo-pdf.js';
import { createTestApp, DEMO_EMAIL, DEMO_PASSWORD, type TestContext } from './test-app.js';

const API = '/api/v1';
let ctx: TestContext;
let agent: ReturnType<typeof request.agent>;
let projectId: string;

const http = () => ctx.app.getHttpServer();

beforeAll(async () => {
  ctx = await createTestApp();
  agent = request.agent(http());
  await agent.post(`${API}/auth/login`).send({ email: DEMO_EMAIL, password: DEMO_PASSWORD }).expect(200);
});

afterAll(async () => {
  await ctx?.close();
});

describe('health & docs', () => {
  it('reports the database as up without a session', async () => {
    const res = await request(http()).get(`${API}/health`).expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up', demoMode: false });
  });

  it('serves an OpenAPI document generated from the shared Zod schemas', async () => {
    const res = await request(http()).get('/api/docs/openapi.json').expect(200);
    const login = res.body.paths[`${API}/auth/login`].post;
    expect(JSON.stringify(login.requestBody)).toContain('email');
  });
});

describe('auth', () => {
  it('rejects requests without a session in the ApiError shape', async () => {
    const res = await request(http()).get(`${API}/projects`).expect(401);
    expect(res.body).toEqual({ statusCode: 401, error: 'Unauthorized', message: 'Sign in to continue' });
  });

  it('validates the login body with the shared schema', async () => {
    const res = await request(http()).post(`${API}/auth/login`).send({ email: 'nope' }).expect(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.details).toEqual(expect.arrayContaining([expect.stringMatching(/^email:/)]));
  });

  it('rejects a wrong password and sets an httpOnly cookie on success', async () => {
    await request(http())
      .post(`${API}/auth/login`)
      .send({ email: DEMO_EMAIL, password: 'wrong-password' })
      .expect(401);
    const res = await request(http())
      .post(`${API}/auth/login`)
      .send({ email: DEMO_EMAIL.toUpperCase(), password: DEMO_PASSWORD })
      .expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('rejects a tampered token', async () => {
    await request(http())
      .get(`${API}/auth/me`)
      .set('Cookie', `${SESSION_COOKIE_NAME}=forged.token.value`)
      .expect(401);
  });
});

describe('seeded demo projects', () => {
  it('lists projects with readiness and open issues', async () => {
    const res = await agent.get(`${API}/projects`).expect(200);
    const projects = res.body as ProjectSummary[];
    expect(projects).toHaveLength(3);
    const nordhavn = projects.find((project) => project.name.startsWith('Nordhavn'))!;
    expect(nordhavn.greenforceId).toMatch(/^GF-DK-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(nordhavn.openIssues).toBeGreaterThan(0);
  });

  it('shows the Nordhavn office failing the 2025 climate limit', async () => {
    const list = (await agent.get(`${API}/projects`)).body as ProjectSummary[];
    const id = list.find((project) => project.name.startsWith('Nordhavn'))!.id;
    const result = (await agent.get(`${API}/projects/${id}/compliance`).expect(200)).body as ComplianceResult;
    expect(result.edition?.id).toBe('BR18-2025');
    const limit = result.rules.find((rule) => rule.ruleId === 'DK-LCA-LIMIT')!;
    expect(limit.verdict).toBe('FAILS');
    expect(result.fixList[0]?.ruleId).toBe('DK-LCA-LIMIT');
  });
});

describe('primary journey — German building documentation', () => {
  it('searches and resolves the property', async () => {
    const search = await agent
      .get(`${API}/properties/search`)
      .query({ jurisdiction: 'DE', q: 'karl-marx' })
      .expect(200);
    expect(search.body).toHaveLength(1);
    const preview = await agent
      .get(`${API}/properties/resolve`)
      .query({ jurisdiction: 'DE', sourceRef: search.body[0].sourceRef })
      .expect(200);
    expect(preview.body.overlays.map((overlay: { code: string }) => overlay.code)).toContain('DE-HERITAGE');
    expect(preview.body.source.isDemo).toBe(true);
  });

  it('creates the project and issues a stable GreenForce ID', async () => {
    const res = await agent
      .post(`${API}/projects`)
      .send({ jurisdiction: 'DE', sourceRef: 'de-berlin-karl-marx-allee-12', name: 'Berlin renovation' })
      .expect(201);
    const project = res.body as ProjectDetail;
    projectId = project.id;
    expect(project.property.greenforceId).toMatch(/^GF-DE-/);

    const again = await agent
      .post(`${API}/projects`)
      .send({ jurisdiction: 'DE', sourceRef: 'de-berlin-karl-marx-allee-12', name: 'Second scheme' })
      .expect(201);
    expect(again.body.property.greenforceId).toBe(project.property.greenforceId);
  });

  it("starts with rules that can't be decided, then resolves them from the setup", async () => {
    const before = (await agent.get(`${API}/projects/${projectId}/compliance`)).body as ComplianceResult;
    expect(before.edition).toBeNull();
    expect(before.summary.verdictCounts.CANT_DECIDE).toBeGreaterThan(0);

    await agent
      .put(`${API}/projects/${projectId}/setup`)
      .send({
        jurisdiction: 'DE',
        projectNature: 'new_build',
        buildingClass: 'GK3',
        fundingRoute: 'private',
        applicationDate: '2026-02-10',
        grossFloorAreaM2: 2600,
        energyTargetKwh: 50,
      })
      .expect(200);
    await agent
      .put(`${API}/projects/${projectId}/measurements`)
      .send({ jurisdiction: 'DE', energyDemandKwh: 45 })
      .expect(200);

    const after = (await agent.get(`${API}/projects/${projectId}/compliance`)).body as ComplianceResult;
    expect(after.edition?.id).toBe('DE-DEMO-2024');
    const fire = after.rules.find((rule) => rule.ruleId === 'DE-FIRE')!;
    expect(fire).toMatchObject({ applicability: 'APPLIES', verdict: 'PROOF_MISSING' });
    expect(after.rules.find((rule) => rule.ruleId === 'DE-FLOOD')!.applicability).toBe('SET_ASIDE');
    expect(after.rules.find((rule) => rule.ruleId === 'DE-HERITAGE')!.verdict).toBe('PROOF_MISSING');
  });

  it('rejects declarations from another jurisdiction', async () => {
    const res = await agent
      .put(`${API}/projects/${projectId}/setup`)
      .send({ jurisdiction: 'DK', projectNature: 'new_build' })
      .expect(400);
    expect(res.body.message).toMatch(/This project is in DE/);
  });

  it('uploads, fingerprints, verifies, downloads and removes evidence', async () => {
    const pdf = demoPdf('Fire strategy', ['State-specific fire review.']);
    const res = await agent
      .post(`${API}/projects/${projectId}/evidence`)
      .field('ruleId', 'DE-FIRE')
      .field('requirementKey', 'fire-strategy')
      .field('note', 'Reviewed by project team')
      .attach('file', pdf, { filename: 'fire-strategy.pdf', contentType: 'application/pdf' })
      .expect(201);
    const item = res.body as EvidenceItem;
    expect(item.sha256).toBe(createHash('sha256').update(pdf).digest('hex'));

    const compliance = (await agent.get(`${API}/projects/${projectId}/compliance`)).body as ComplianceResult;
    expect(compliance.rules.find((rule) => rule.ruleId === 'DE-FIRE')!.verdict).toBe('PROOF_IN_PROGRESS');

    const verified = await agent
      .patch(`${API}/projects/${projectId}/evidence/${item.id}/verify`)
      .send({ verified: true })
      .expect(200);
    expect(verified.body.verified).toBe(true);

    const download = await agent
      .get(`${API}/projects/${projectId}/evidence/${item.id}/file`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(Buffer.compare(download.body as Buffer, pdf)).toBe(0);

    await agent.delete(`${API}/projects/${projectId}/evidence/${item.id}`).expect(204);
    await agent.get(`${API}/projects/${projectId}/evidence/${item.id}/file`).expect(404);
  });

  it('rejects disguised files and evidence for rules that do not apply', async () => {
    await agent
      .post(`${API}/projects/${projectId}/evidence`)
      .field('ruleId', 'DE-FIRE')
      .field('requirementKey', 'fire-strategy')
      .attach('file', Buffer.from('MZ not really a pdf'), {
        filename: 'x.pdf',
        contentType: 'application/pdf',
      })
      .expect(415);
    await agent
      .post(`${API}/projects/${projectId}/evidence`)
      .field('ruleId', 'DE-FLOOD')
      .field('requirementKey', 'flood-assessment')
      .attach('file', demoPdf('x', []), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(400);
  });

  it('recommends classified insulation and links a selected one as evidence', async () => {
    const recs = (await agent.get(`${API}/projects/${projectId}/materials`).expect(200))
      .body as ProjectMaterialsResponse;
    const insulation = recs.recommendations.find((entry) => entry.material.name === 'Mineral wool board CI')!;
    const unclassified = recs.recommendations.find(
      (entry) => entry.material.name === 'Unclassified insulation board',
    )!;
    expect(insulation.recommended).toBe(true);
    expect(unclassified.recommended).toBe(false);
    expect(unclassified.fits[0]?.result).toBe('FAIL');

    const notSelected = await agent
      .post(`${API}/projects/${projectId}/evidence/link-material`)
      .send({ ruleId: 'DE-FIRE', requirementKey: 'insulation', materialId: insulation.material.id })
      .expect(400);
    expect(notSelected.body.message).toMatch(/Select the material/);

    const selected = (
      await agent.post(`${API}/projects/${projectId}/materials/${insulation.material.id}`).expect(201)
    ).body as ProjectMaterialsResponse;
    expect(selected.selectedCount).toBe(1);

    const linked = await agent
      .post(`${API}/projects/${projectId}/evidence/link-material`)
      .send({ ruleId: 'DE-FIRE', requirementKey: 'insulation', materialId: insulation.material.id })
      .expect(201);
    expect(linked.body).toMatchObject({ source: 'catalog', materialId: insulation.material.id });

    await agent
      .post(`${API}/projects/${projectId}/evidence/link-material`)
      .send({ ruleId: 'DE-FIRE', requirementKey: 'fire-strategy', materialId: insulation.material.id })
      .expect(400);
  });

  it('issues hash-chained passport versions', async () => {
    const live1 = (await agent.get(`${API}/projects/${projectId}/passport`).expect(200)).body as LivePassport;
    const live2 = (await agent.get(`${API}/projects/${projectId}/passport`).expect(200)).body as LivePassport;
    expect(live1.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(live2.fingerprint).toBe(live1.fingerprint);
    expect(live1.changedSinceLatestSnapshot).toBe(true);
    expect(live1.content.statement.audience).toContain('Lender');

    const v1 = (
      await agent
        .post(`${API}/projects/${projectId}/passport/snapshots`)
        .send({ note: 'For local Bauaufsicht' })
        .expect(201)
    ).body;
    expect(v1).toMatchObject({ version: 1, fingerprint: live1.fingerprint, previousFingerprint: null });

    const unchanged = (await agent.get(`${API}/projects/${projectId}/passport`)).body as LivePassport;
    expect(unchanged.changedSinceLatestSnapshot).toBe(false);

    await agent
      .put(`${API}/projects/${projectId}/measurements`)
      .send({ jurisdiction: 'DE', energyDemandKwh: 65 })
      .expect(200);
    const v2 = (await agent.post(`${API}/projects/${projectId}/passport/snapshots`).send({}).expect(201))
      .body;
    expect(v2.version).toBe(2);
    expect(v2.previousFingerprint).toBe(v1.fingerprint);
    expect(v2.fingerprint).not.toBe(v1.fingerprint);

    const frozen = await agent.get(`${API}/projects/${projectId}/passport/snapshots/1`).expect(200);
    expect(frozen.body.content.measurements.energyDemandKwh).toBe(45);
    await agent.get(`${API}/projects/${projectId}/passport/snapshots/9`).expect(404);
  });

  it('records the project history', async () => {
    const res = await agent.get(`${API}/projects/${projectId}/history`).expect(200);
    const types = (res.body as { type: string }[]).map((event) => event.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'project.created',
        'evidence.uploaded',
        'material.selected',
        'passport.issued',
      ]),
    );
  });
});

describe('funding', () => {
  it('evaluates Landsbyggefonden for the Tingbjerg renovation', async () => {
    const list = (await agent.get(`${API}/projects`)).body as ProjectSummary[];
    const id = list.find((project) => project.name.startsWith('Tingbjerg'))!.id;
    const res = await agent.get(`${API}/projects/${id}/funding`).expect(200);
    const [program] = res.body.programs;
    expect(program).toMatchObject({ status: 'ELIGIBLE', verdict: 'PROOF_IN_PROGRESS' });
    expect(program.informationRequirements).toHaveLength(5);
  });

  it('has no funding programs for Germany yet', async () => {
    const res = await agent.get(`${API}/projects/${projectId}/funding`).expect(200);
    expect(res.body.programs).toEqual([]);
  });
});

describe('authorization & validation', () => {
  it("hides other users' projects", async () => {
    await ctx.db.user.create({
      data: {
        email: 'other@greenforce.test',
        name: 'Other Contractor',
        organization: 'Elsewhere',
        passwordHash: await bcrypt.hash('other-password', 4),
      },
    });
    const other = request.agent(http());
    await other
      .post(`${API}/auth/login`)
      .send({ email: 'other@greenforce.test', password: 'other-password' })
      .expect(200);
    expect((await other.get(`${API}/projects`).expect(200)).body).toEqual([]);
    await other.get(`${API}/projects/${projectId}`).expect(404);
    await other.get(`${API}/projects/${projectId}/passport`).expect(404);
  });

  it('validates path parameters', async () => {
    await agent.get(`${API}/projects/not-a-uuid`).expect(400);
  });

  it('hides demo reset outside demo mode', async () => {
    await agent.post(`${API}/demo/reset`).expect(404);
  });
});
