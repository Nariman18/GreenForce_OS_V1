import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, JurisdictionSchema } from './common.js';
import {
  ComplianceSummarySchema,
  EditionSchema,
  EvidenceItemSchema,
  RuleEvaluationSchema,
} from './compliance.js';
import { ProjectMeasurementsSchema, ProjectSetupSchema, ReadinessSchema } from './project.js';
import { PropertyRecordSchema } from './property.js';

export const PassportMaterialSchema = z.object({
  id: IdSchema,
  name: z.string(),
  category: z.string(),
  supplier: z.string(),
  epdNumber: z.string().nullable(),
  gwp: z.number().nullable(),
  gwpUnit: z.string(),
});

export const PassportStatementSchema = z.object({
  headline: z.string(),
  paragraphs: z.array(z.string()),
  audience: z.array(z.string()),
});
export type PassportStatement = z.infer<typeof PassportStatementSchema>;

/** The content that is fingerprinted. Deterministic for a given project state. */
export const PassportContentSchema = z.object({
  greenforceId: z.string(),
  projectId: IdSchema,
  projectName: z.string(),
  jurisdiction: JurisdictionSchema,
  property: PropertyRecordSchema,
  setup: ProjectSetupSchema,
  measurements: ProjectMeasurementsSchema,
  edition: EditionSchema.nullable(),
  summary: ComplianceSummarySchema,
  readiness: ReadinessSchema,
  applicableRules: z.array(RuleEvaluationSchema),
  setAsideRules: z.array(RuleEvaluationSchema),
  undecidedRules: z.array(RuleEvaluationSchema),
  evidence: z.array(EvidenceItemSchema),
  materials: z.array(PassportMaterialSchema),
  statement: PassportStatementSchema,
  disclaimer: z.string(),
});
export type PassportContent = z.infer<typeof PassportContentSchema>;

export const PassportSnapshotSummarySchema = z.object({
  id: IdSchema,
  version: z.number().int().positive(),
  fingerprint: z.string(),
  previousFingerprint: z.string().nullable(),
  readinessOverall: z.number(),
  note: z.string().nullable(),
  issuedBy: z.string(),
  issuedAt: IsoDateTimeSchema,
});
export type PassportSnapshotSummary = z.infer<typeof PassportSnapshotSummarySchema>;

export const PassportSnapshotSchema = PassportSnapshotSummarySchema.extend({
  content: PassportContentSchema,
});
export type PassportSnapshot = z.infer<typeof PassportSnapshotSchema>;

export const LivePassportSchema = z.object({
  content: PassportContentSchema,
  /** SHA-256 of the canonical JSON of `content`. */
  fingerprint: z.string(),
  generatedAt: IsoDateTimeSchema,
  latestSnapshot: PassportSnapshotSummarySchema.nullable(),
  /** True when the live record differs from the latest issued snapshot. */
  changedSinceLatestSnapshot: z.boolean(),
});
export type LivePassport = z.infer<typeof LivePassportSchema>;

export const IssueSnapshotRequestSchema = z.object({
  note: z.string().trim().max(500).optional(),
});
export type IssueSnapshotRequest = z.infer<typeof IssueSnapshotRequestSchema>;

export const SnapshotParamsSchema = z.object({
  id: IdSchema,
  version: z.coerce.number().int().positive(),
});

export const AuditEventSchema = z.object({
  id: IdSchema,
  type: z.string(),
  summary: z.string(),
  actor: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;
