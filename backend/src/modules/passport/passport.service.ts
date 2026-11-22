import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  JURISDICTION_LABELS,
  type LivePassport,
  type PassportContent,
  PassportContentSchema,
  type PassportSnapshot,
  type PassportSnapshotSummary,
  type PassportStatement,
  REGULATORY_DISCLAIMER,
  type User,
  VERDICT_LABELS,
} from '@greenforce/shared';
import { Prisma, type PassportSnapshot as SnapshotRow } from '../../generated/prisma/client.js';
import { type Database, PRISMA } from '../../db/prisma.js';
import { AuditService } from '../audit/audit.service.js';
import { ComplianceService, type ProjectEvaluation } from '../compliance/compliance.service.js';
import { ProjectsRepository } from '../projects/projects.repository.js';
import { fingerprint } from './fingerprint.js';

const ISSUER = { issuedBy: { select: { name: true } } } as const;

@Injectable()
export class PassportService {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    private readonly compliance: ComplianceService,
    private readonly repository: ProjectsRepository,
    private readonly audit: AuditService,
  ) {}

  async live(user: User, projectId: string): Promise<LivePassport> {
    const evaluation = await this.compliance.evaluateOwned(projectId, user.id);
    const content = buildPassportContent(evaluation);
    const print = fingerprint(content);
    const latest = await this.latestSnapshot(projectId);
    return {
      content,
      fingerprint: print,
      generatedAt: new Date().toISOString(),
      latestSnapshot: latest,
      changedSinceLatestSnapshot: latest ? latest.fingerprint !== print : true,
    };
  }

  /** Freezes the current record as an immutable, versioned snapshot chained to the previous fingerprint. */
  async issue(user: User, projectId: string, note: string | undefined): Promise<PassportSnapshotSummary> {
    const evaluation = await this.compliance.evaluateOwned(projectId, user.id);
    const content = buildPassportContent(evaluation);
    const print = fingerprint(content);
    const previous = await this.latestSnapshot(projectId);

    let row: SnapshotRow;
    try {
      row = await this.db.passportSnapshot.create({
        data: {
          projectId,
          version: (previous?.version ?? 0) + 1,
          fingerprint: print,
          previousFingerprint: previous?.fingerprint ?? null,
          readinessOverall: content.readiness.overall,
          note: note || null,
          content,
          issuedById: user.id,
        },
      });
    } catch (error) {
      // Unique (project, version) index: another snapshot was issued concurrently.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A newer passport version was just issued — refresh and try again');
      }
      throw error;
    }
    await this.audit.record(projectId, user.id, 'passport.issued', `Passport v${row.version} issued`, {
      fingerprint: print,
    });
    return toSummary(row, user.name);
  }

  async listSnapshots(user: User, projectId: string): Promise<PassportSnapshotSummary[]> {
    await this.repository.findOwned(projectId, user.id);
    const rows = await this.db.passportSnapshot.findMany({
      where: { projectId },
      include: ISSUER,
      orderBy: { version: 'desc' },
    });
    return rows.map((row) => toSummary(row, row.issuedBy.name));
  }

  async getSnapshot(user: User, projectId: string, version: number): Promise<PassportSnapshot> {
    await this.repository.findOwned(projectId, user.id);
    const row = await this.db.passportSnapshot.findUnique({
      where: { projectId_version: { projectId, version } },
      include: ISSUER,
    });
    if (!row) throw new NotFoundException(`Passport version ${version} not found`);
    return { ...toSummary(row, row.issuedBy.name), content: PassportContentSchema.parse(row.content) };
  }

  private async latestSnapshot(projectId: string): Promise<PassportSnapshotSummary | null> {
    const row = await this.db.passportSnapshot.findFirst({
      where: { projectId },
      include: ISSUER,
      orderBy: { version: 'desc' },
    });
    return row ? toSummary(row, row.issuedBy.name) : null;
  }
}

function toSummary(row: SnapshotRow, issuedBy: string): PassportSnapshotSummary {
  return {
    id: row.id,
    version: row.version,
    fingerprint: row.fingerprint,
    previousFingerprint: row.previousFingerprint,
    readinessOverall: row.readinessOverall,
    note: row.note,
    issuedBy,
    issuedAt: row.issuedAt.toISOString(),
  };
}

/** Deterministic passport content: no timestamps of its own, so equal project state ⇒ equal fingerprint. */
export function buildPassportContent(evaluation: ProjectEvaluation): PassportContent {
  const { detail, result, input, selected } = evaluation;
  const applicableRules = result.rules.filter((rule) => rule.applicability === 'APPLIES');
  return {
    greenforceId: detail.property.greenforceId,
    projectId: detail.id,
    projectName: detail.name,
    jurisdiction: detail.jurisdiction,
    property: detail.property,
    setup: detail.setup,
    measurements: detail.measurements,
    edition: result.edition,
    summary: result.summary,
    readiness: result.readiness,
    applicableRules,
    setAsideRules: result.rules.filter((rule) => rule.applicability === 'SET_ASIDE'),
    undecidedRules: result.rules.filter((rule) => rule.applicability === 'UNDECIDED'),
    evidence: input.evidence,
    materials: selected.map((material) => ({
      id: material.id,
      name: material.name,
      category: material.category,
      supplier: material.supplier.name,
      epdNumber: material.epd?.number ?? null,
      gwp: material.gwp,
      gwpUnit: material.gwpUnit,
    })),
    statement: buildStatement(evaluation),
    disclaimer: REGULATORY_DISCLAIMER,
  };
}

function buildStatement({ detail, result, input }: ProjectEvaluation): PassportStatement {
  const { summary, readiness, edition, fixList } = result;
  const property = detail.property;
  const open = fixList.length;
  const counts = Object.entries(summary.verdictCounts)
    .filter(([, count]) => count > 0)
    .map(([verdict, count]) => `${VERDICT_LABELS[verdict as keyof typeof VERDICT_LABELS]}: ${count}`)
    .join(', ');

  const paragraphs = [
    `This statement records the compliance status of "${detail.name}" at ${property.address} (${JURISDICTION_LABELS[detail.jurisdiction]}), GreenForce ID ${property.greenforceId}, parcel ${property.parcelId}.`,
    edition
      ? `Requirements were evaluated against ${edition.name}, in force on the declared ${edition.basisLabel.toLowerCase()} of ${edition.basisDate}.`
      : `No regulatory edition could be resolved yet: ${result.editionNote ?? 'the governing date has not been declared'}.`,
    `GreenForce checked ${summary.checked} rules: ${summary.applies} apply, ${summary.setAside} were set aside with reasons, and ${summary.undecided} cannot be decided yet. Verdicts: ${counts || 'none'}.`,
    `Readiness is ${readiness.overall}% — rules decided ${readiness.rulesDecided.pct}%, proof in ${readiness.proofIn.pct}% (${readiness.proofIn.done}/${readiness.proofIn.total} documents), computed checks passing ${readiness.checksPassing.pct}%.`,
    `${input.evidence.length} evidence item(s) are recorded, each identified by a SHA-256 fingerprint${input.evidence.some((item) => item.verified) ? `; ${input.evidence.filter((item) => item.verified).length} verified` : ''}.`,
    open === 0
      ? 'There are no open compliance actions at the time of this statement.'
      : `${open} action(s) remain open, led by: ${fixList
          .slice(0, 3)
          .map((item) => `${item.title} (${VERDICT_LABELS[item.verdict]})`)
          .join('; ')}.`,
  ];

  return {
    headline: open === 0 ? 'Compliance pack complete' : `Compliance in progress — ${open} open action(s)`,
    paragraphs,
    audience: ['Owner', 'Lender', 'Plan checker / building authority'],
  };
}
