import { z } from 'zod';
import { FUNDING_STATUSES } from '../constants/domain.js';
import { CriterionSchema, RequirementEvidenceSchema, VerdictSchema } from './compliance.js';

export const FundingProgramEvaluationSchema = z.object({
  programId: z.string(),
  ruleId: z.string(),
  name: z.string(),
  administrator: z.string(),
  description: z.string(),
  status: z.enum(FUNDING_STATUSES),
  criteria: z.array(CriterionSchema),
  informationRequirements: z.array(RequirementEvidenceSchema),
  verdict: VerdictSchema.nullable(),
  /** How the project's compliance status feeds the application. */
  complianceLinks: z.array(z.object({ label: z.string(), detail: z.string() })),
  nextAction: z.string().nullable(),
});
export type FundingProgramEvaluation = z.infer<typeof FundingProgramEvaluationSchema>;

export const FundingResponseSchema = z.object({
  programs: z.array(FundingProgramEvaluationSchema),
  note: z.string(),
});
export type FundingResponse = z.infer<typeof FundingResponseSchema>;
