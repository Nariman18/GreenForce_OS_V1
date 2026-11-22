import { Injectable } from '@nestjs/common';
import {
  type FundingProgramEvaluation,
  type FundingResponse,
  type FundingStatus,
  type RuleEvaluation,
  type User,
  VERDICT_LABELS,
} from '@greenforce/shared';
import { ComplianceService } from '../compliance/compliance.service.js';

interface ProgramMeta {
  programId: string;
  name: string;
  administrator: string;
  description: string;
  /** Compliance rules whose documentation feeds the funding application. */
  relatedRules: { ruleId: string; why: string }[];
}

const PROGRAMS: Record<string, ProgramMeta> = {
  'DK-FUND-LBF': {
    programId: 'dk-landsbyggefonden-renovation',
    name: 'Landsbyggefonden — renovation support',
    administrator: 'Landsbyggefonden (National Building Fund)',
    description:
      'Support for physical renovation of social-housing departments (almene boliger): capital for works, financing of loans and rent support, granted on the basis of a comprehensive plan.',
    relatedRules: [
      {
        ruleId: 'DK-ENERGY-RENO',
        why: 'Energy documentation for renewed building parts supports the helhedsplan.',
      },
      { ruleId: 'DK-FIRE', why: 'Fire-safety upgrades are typically part of the renovation scope.' },
      { ruleId: 'DK-STRUCT', why: 'Structural documentation underpins the technical condition survey.' },
    ],
  },
};

function statusFor(rule: RuleEvaluation): FundingStatus {
  if (rule.verdict === 'FAILS' || rule.applicability === 'SET_ASIDE') return 'NOT_ELIGIBLE';
  if (rule.verdict === 'CANT_DECIDE' || rule.applicability === 'UNDECIDED') return 'UNDECIDED';
  return 'ELIGIBLE';
}

@Injectable()
export class FundingService {
  constructor(private readonly compliance: ComplianceService) {}

  async evaluate(user: User, projectId: string): Promise<FundingResponse> {
    const { result } = await this.compliance.evaluateOwned(projectId, user.id);
    const byId = new Map(result.rules.map((rule) => [rule.ruleId, rule]));

    const programs: FundingProgramEvaluation[] = result.rules
      .filter((rule) => rule.category === 'funding' && PROGRAMS[rule.ruleId])
      .map((rule) => {
        const meta = PROGRAMS[rule.ruleId]!;
        return {
          programId: meta.programId,
          ruleId: rule.ruleId,
          name: meta.name,
          administrator: meta.administrator,
          description: meta.description,
          status: statusFor(rule),
          criteria: rule.criteria,
          informationRequirements: rule.evidence,
          verdict: rule.verdict,
          complianceLinks: meta.relatedRules.flatMap(({ ruleId, why }) => {
            const related = byId.get(ruleId);
            if (!related || related.applicability !== 'APPLIES' || !related.verdict) return [];
            return [{ label: `${related.title} — ${VERDICT_LABELS[related.verdict]}`, detail: why }];
          }),
          nextAction: rule.applicability === 'SET_ASIDE' ? rule.reason : rule.nextAction,
        };
      });

    return {
      programs,
      note:
        programs.length > 0
          ? 'Eligibility is indicative. Funding decisions are made by the program administrator.'
          : 'No funding programs are modelled for this jurisdiction yet.',
    };
  }
}
