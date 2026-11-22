import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, DEMO_EMAIL, DEMO_PASSWORD, type TestContext } from './test-app.js';

const API = '/api/v1';
let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp({ DEMO_MODE: 'true' });
});

afterAll(async () => {
  await ctx?.close();
});

describe('demo reset', () => {
  it('requires a session', async () => {
    await request(ctx.app.getHttpServer()).post(`${API}/demo/reset`).expect(401);
  });

  it('restores the seeded projects and keeps the session valid', async () => {
    const agent = request.agent(ctx.app.getHttpServer());
    await agent.post(`${API}/auth/login`).send({ email: DEMO_EMAIL, password: DEMO_PASSWORD }).expect(200);
    await agent
      .post(`${API}/projects`)
      .send({ jurisdiction: 'DK', sourceRef: 'dk-odde-lyngvej-4', name: 'Holiday home extension' })
      .expect(201);
    expect((await agent.get(`${API}/projects`)).body).toHaveLength(4);

    await agent.post(`${API}/demo/reset`).expect(204);

    const projects = (await agent.get(`${API}/projects`).expect(200)).body as { name: string }[];
    expect(projects).toHaveLength(3);
    expect(projects.map((project) => project.name)).not.toContain('Holiday home extension');
  });
});
