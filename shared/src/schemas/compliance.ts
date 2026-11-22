import { z } from 'zod';
import {
  APPLICABILITY,
  CHECK_STATUSES,
  CRITERION_STATUSES,
  EVIDENCE_KINDS,
  EVIDENCE_STATUSES,
  MATERIAL_CATEGORIES,
  RULE_CATEGORIES,
  VERDICTS,
} from '../constants/domain.js';
import { IdSchema, IsoDateSchema, IsoDateTimeSchema, JurisdictionSchema } from './common.js';
import { ReadinessSchema } from './project.js';

export const VerdictSchema = z.enum(VERDICTS);
export const RuleCategorySchema = z.enum(RULE_CATEGORIES);
export const EvidenceKindSchema = z.enum(EVIDENCE_KINDS);
export const EvidenceStatusSchema = z.enum(EVIDENCE_STATUSES);

export const EvidenceItemSchema = z.object({
  id: IdSchema,
  ruleId: z.string(),
  requirementKey: z.string(),
  kind: EvidenceKindSchema,
  source: z.enum(['upload', 'catalog']),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  note: z.string().nullable(),
  materialId: IdSchema.nullable(),
  verified: z.boolean(),
  verifiedAt: IsoDateTimeSchema.nullable(),
  uploadedBy: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const EvidenceRequirementSchema = z.object({
  key: z.string(),
  kind: EvidenceKindSchema,
  title: z.string(),
  description: z.string(),
  /** When set, a selected catalog material of one of these categories can satisfy the requirement. */
  materialCategories: z.array(z.enum(MATERIAL_CATEGORIES)).optional(),
});
export type EvidenceRequirement = z.infer<typeof EvidenceRequirementSchema>;

export const RequirementEvidenceSchema = z.object({
  requirement: EvidenceRequirementSchema,
  status: EvidenceStatusSchema,
  items: z.array(EvidenceItemSchema),
});
export type RequirementEvidence = z.infer<typeof RequirementEvidenceSchema>;

export const ComputedCheckSchema = z.object({
  status: z.enum(CHECK_STATUSES),
  label: z.string(),
  measured: z.number().nullable(),
  limit: z.number().nullable(),
  unit: z.string(),
  comparator: z.enum(['lte', 'gte', 'eq']),
  explanation: z.string(),
});
export type ComputedCheck = z.infer<typeof ComputedCheckSchema>;

export const CriterionSchema = z.object({
  label: z.string(),
  status: z.enum(CRITERION_STATUSES),
  detail: z.string(),
});
export type Criterion = z.infer<typeof CriterionSchema>;

export const RuleEvaluationSchema = z.object({
  ruleId: z.string(),
  code: z.string(),
  title: z.string(),
  category: RuleCategorySchema,
  requirement: z.string(),
  citation: z.string(),
  applicability: z.enum(APPLICABILITY),
  reason: z.string(),
  missingFacts: z.array(z.string()),
  check: ComputedCheckSchema.nullable(),
  criteria: z.array(CriterionSchema),
  evidence: z.array(RequirementEvidenceSchema),
  /** Null when the rule is set aside. */
  verdict: VerdictSchema.nullable(),
  nextAction: z.string().nullable(),
});
export type RuleEvaluation = z.infer<typeof RuleEvaluationSchema>;

export const EditionSchema = z.object({
  id: z.string(),
  name: z.string(),
  effectiveFrom: IsoDateSchema,
  effectiveTo: IsoDateSchema.nullable(),
  basisLabel: z.string(),
  basisDate: IsoDateSchema,
});
export type Edition = z.infer<typeof EditionSchema>;

export const FixItemSchema = z.object({
  ruleId: z.string(),
  code: z.string(),
  title: z.string(),
  verdict: VerdictSchema,
  action: z.string(),
});
export type FixItem = z.infer<typeof FixItemSchema>;

export const ComplianceSummarySchema = z.object({
  checked: z.number().int(),
  applies: z.number().int(),
  setAside: z.number().int(),
  undecided: z.number().int(),
  verdictCounts: z.record(VerdictSchema, z.number().int()),
});
export type ComplianceSummary = z.infer<typeof ComplianceSummarySchema>;

export const ComplianceResultSchema = z.object({
  projectId: IdSchema,
  jurisdiction: JurisdictionSchema,
  edition: EditionSchema.nullable(),
  /** Explains why no edition could be resolved (e.g. date not declared). */
  editionNote: z.string().nullable(),
  evaluatedAt: IsoDateTimeSchema,
  rules: z.array(RuleEvaluationSchema),
  summary: ComplianceSummarySchema,
  readiness: ReadinessSchema,
  fixList: z.array(FixItemSchema),
  disclaimer: z.string(),
});
export type ComplianceResult = z.infer<typeof ComplianceResultSchema>;

/* Evidence requests */

/** Multipart text fields accompanying an evidence upload. */
export const UploadEvidenceFieldsSchema = z.object({
  ruleId: z.string().min(1).max(64),
  requirementKey: z.string().min(1).max(64),
  note: z.string().trim().max(500).optional(),
});
export type UploadEvidenceFields = z.infer<typeof UploadEvidenceFieldsSchema>;

export const LinkMaterialEvidenceRequestSchema = z.object({
  ruleId: z.string().min(1).max(64),
  requirementKey: z.string().min(1).max(64),
  materialId: IdSchema,
});
export type LinkMaterialEvidenceRequest = z.infer<typeof LinkMaterialEvidenceRequestSchema>;

export const VerifyEvidenceRequestSchema = z.object({
  verified: z.boolean(),
});
export type VerifyEvidenceRequest = z.infer<typeof VerifyEvidenceRequestSchema>;

export const EvidenceParamsSchema = z.object({ id: IdSchema, evidenceId: IdSchema });
