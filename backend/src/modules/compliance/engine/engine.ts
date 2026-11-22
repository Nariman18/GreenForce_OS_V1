import {
  type ComplianceResult,
  type ComputedCheck,
  type Criterion,
  type Edition,
  type EvidenceItem,
  type EvidenceRequirement,
  type FixItem,
  type Jurisdiction,
  type MaterialFit,
  type Readiness,
  REGULATORY_DISCLAIMER,
  type RequirementEvidence,
  type RuleEvaluation,
  type Verdict,
  VERDICTS,
} from '@greenforce/shared';
import { denmarkRuleset } from './rules/denmark.js';
import { germanyRuleset } from './rules/germany.js';
import type {
  ApplicabilityResult,
  EditionDef,
  EngineMaterial,
  EvaluationInput,
  RuleDefinition,
  Ruleset,
} from './types.js';

// Each ruleset is typed by its own context; the engine only needs the shared shape.
const RULESETS: Record<Jurisdiction, Ruleset<unknown>> = {
  DK: denmarkRuleset as Ruleset<unknown>,
  DE: germanyRuleset as Ruleset<unknown>,
};

export const rulesetFor = (jurisdiction: Jurisdiction): Ruleset<unknown> => RULESETS[jurisdiction];

/** Picks the edition in force on the basis date (application date in Denmark and Germany). */
export function resolveEdition(
  ruleset: Ruleset<unknown>,
  basisDate: string | undefined,
): { edition: EditionDef | null; note: string | null } {
  if (!basisDate) {
    return {
      edition: null,
      note: `Declare the ${ruleset.basisLabel.toLowerCase()} to resolve the edition in force.`,
    };
  }
  const edition = ruleset.editions.find(
    (candidate) =>
      candidate.effectiveFrom <= basisDate &&
      (candidate.effectiveTo === null || basisDate <= candidate.effectiveTo),
  );
  return edition ? { edition, note: null } : { edition: null, note: ruleset.unmodelledEditionNote };
}

function evidenceStatus(items: EvidenceItem[]): RequirementEvidence['status'] {
  if (items.some((item) => item.verified)) return 'VERIFIED';
  return items.length ? 'PROVIDED' : 'MISSING';
}

/**
 * Verdict precedence — the most actionable state wins:
 * can't decide → fails → proof missing → proof in progress → pack complete → passes → confirmed.
 */
export function computeVerdict(args: {
  applicability: ApplicabilityResult['status'];
  check: ComputedCheck | null;
  criteria: Criterion[];
  evidence: RequirementEvidence[];
}): Verdict | null {
  const { applicability, check, criteria, evidence } = args;
  if (applicability === 'SET_ASIDE') return null;
  if (applicability === 'UNDECIDED' || check?.status === 'UNDECIDED') return 'CANT_DECIDE';
  if (criteria.some((criterion) => criterion.status === 'NOT_MET') || check?.status === 'FAIL')
    return 'FAILS';
  if (criteria.some((criterion) => criterion.status === 'UNKNOWN')) return 'CANT_DECIDE';
  if (evidence.length) {
    const provided = evidence.filter((entry) => entry.status !== 'MISSING').length;
    if (provided === 0) return 'PROOF_MISSING';
    if (provided < evidence.length) return 'PROOF_IN_PROGRESS';
    return 'PACK_COMPLETE';
  }
  return check?.status === 'PASS' ? 'PASSES' : 'CONFIRMED';
}

function nextAction<C>(
  rule: RuleDefinition<C>,
  ctx: C,
  evaluation: Pick<RuleEvaluation, 'verdict' | 'missingFacts' | 'check' | 'criteria' | 'evidence'>,
): string | null {
  const { verdict, check } = evaluation;
  switch (verdict) {
    case 'CANT_DECIDE':
      if (evaluation.missingFacts.length) return `Declare in Setup: ${evaluation.missingFacts.join(', ')}.`;
      if (check?.status === 'UNDECIDED') return check.explanation;
      return 'Resolve the unknown eligibility criteria.';
    case 'FAILS': {
      if (check?.status === 'FAIL') return rule.failAction?.(ctx, check) ?? check.explanation;
      const unmet = evaluation.criteria.filter((criterion) => criterion.status === 'NOT_MET');
      return `Not met: ${unmet.map((criterion) => criterion.label).join('; ')}.`;
    }
    case 'PROOF_MISSING':
    case 'PROOF_IN_PROGRESS': {
      const missing = evaluation.evidence.filter((entry) => entry.status === 'MISSING');
      return `Provide: ${missing.map((entry) => entry.requirement.title).join('; ')}.`;
    }
    default:
      return null;
  }
}

const pct = (done: number, total: number) => (total === 0 ? 100 : Math.round((done / total) * 100));

/**
 * Readiness = mean of three components (brief §8):
 * rules decided (all checked rules resolved), proof in (required evidence provided),
 * computed checks passing (measurable checks that currently pass).
 */
export function computeReadiness(rules: RuleEvaluation[]): Readiness {
  const decided = rules.filter((rule) => rule.verdict !== 'CANT_DECIDE').length;
  const applicable = rules.filter((rule) => rule.applicability === 'APPLIES');
  const requirements = applicable.flatMap((rule) => rule.evidence);
  const proofIn = requirements.filter((entry) => entry.status !== 'MISSING').length;
  const checks = applicable.filter((rule) => rule.check !== null);
  const passing = checks.filter((rule) => rule.check!.status === 'PASS').length;

  const rulesDecided = { done: decided, total: rules.length, pct: pct(decided, rules.length) };
  const proof = { done: proofIn, total: requirements.length, pct: pct(proofIn, requirements.length) };
  const checksPassing = { done: passing, total: checks.length, pct: pct(passing, checks.length) };
  return {
    rulesDecided,
    proofIn: proof,
    checksPassing,
    overall: Math.round((rulesDecided.pct + proof.pct + checksPassing.pct) / 3),
  };
}

const FIX_ORDER: Verdict[] = ['FAILS', 'CANT_DECIDE', 'PROOF_MISSING', 'PROOF_IN_PROGRESS'];

export function evaluate(input: EvaluationInput, now: Date = new Date()): ComplianceResult {
  const ruleset = rulesetFor(input.setup.jurisdiction);
  const basisDate = ruleset.basisDate(input);
  const { edition, note } = resolveEdition(ruleset, basisDate);
  const ctx = ruleset.toContext(input, edition);

  const rules: RuleEvaluation[] = ruleset.rules.map((rule) => {
    const needsEdition = rule.requiresEdition !== false && edition === null;
    const applicability: ApplicabilityResult = needsEdition
      ? {
          status: 'UNDECIDED',
          reason: note ?? 'No edition resolved.',
          missing: basisDate ? [] : [ruleset.basisLabel],
        }
      : rule.applicability(ctx);
    const active = applicability.status === 'APPLIES';

    const evidence: RequirementEvidence[] = active
      ? (rule.evidence?.(ctx) ?? []).map((requirement: EvidenceRequirement) => {
          const items = input.evidence.filter(
            (item) => item.ruleId === rule.id && item.requirementKey === requirement.key,
          );
          return { requirement, items, status: evidenceStatus(items) };
        })
      : [];
    const check = active && rule.check ? rule.check(ctx) : null;
    const criteria = active && rule.criteria ? rule.criteria(ctx) : [];
    const verdict = computeVerdict({ applicability: applicability.status, check, criteria, evidence });
    const partial = { verdict, missingFacts: applicability.missing ?? [], check, criteria, evidence };

    return {
      ruleId: rule.id,
      code: rule.code,
      title: rule.title,
      category: rule.category,
      requirement: rule.requirement,
      citation: rule.citation,
      applicability: applicability.status,
      reason: applicability.reason,
      ...partial,
      nextAction: nextAction(rule, ctx, partial),
    };
  });

  const verdictCounts = Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])) as Record<
    Verdict,
    number
  >;
  for (const rule of rules) if (rule.verdict) verdictCounts[rule.verdict] += 1;

  const fixList: FixItem[] = rules
    .filter((rule) => rule.verdict !== null && FIX_ORDER.includes(rule.verdict) && rule.nextAction)
    .sort((a, b) => FIX_ORDER.indexOf(a.verdict!) - FIX_ORDER.indexOf(b.verdict!))
    .map((rule) => ({
      ruleId: rule.ruleId,
      code: rule.code,
      title: rule.title,
      verdict: rule.verdict!,
      action: rule.nextAction!,
    }));

  const resolvedEdition: Edition | null =
    edition && basisDate ? { ...edition, basisLabel: ruleset.basisLabel, basisDate } : null;

  return {
    projectId: input.projectId,
    jurisdiction: input.setup.jurisdiction,
    edition: resolvedEdition,
    editionNote: note,
    evaluatedAt: now.toISOString(),
    rules,
    summary: {
      checked: rules.length,
      applies: rules.filter((rule) => rule.applicability === 'APPLIES').length,
      setAside: rules.filter((rule) => rule.applicability === 'SET_ASIDE').length,
      undecided: rules.filter((rule) => rule.applicability === 'UNDECIDED').length,
      verdictCounts,
    },
    readiness: computeReadiness(rules),
    fixList,
    disclaimer: REGULATORY_DISCLAIMER,
  };
}

/** How a catalog material relates to each rule that currently applies to the project. */
export function materialFits(
  input: EvaluationInput,
  material: EngineMaterial,
  result: ComplianceResult,
): MaterialFit[] {
  const ruleset = rulesetFor(input.setup.jurisdiction);
  const { edition } = resolveEdition(ruleset, ruleset.basisDate(input));
  const ctx = ruleset.toContext(input, edition);
  const applicable = new Set(
    result.rules.filter((rule) => rule.applicability === 'APPLIES').map((rule) => rule.ruleId),
  );

  return ruleset.rules.flatMap((rule) => {
    if (!applicable.has(rule.id) || !rule.materialFit) return [];
    const fit = rule.materialFit(material, ctx);
    return fit ? [{ ruleId: rule.id, code: rule.code, title: rule.title, ...fit }] : [];
  });
}
