import type {
  Applicability,
  ComputedCheck,
  Criterion,
  EvidenceItem,
  EvidenceRequirement,
  Jurisdiction,
  MaterialCategory,
  Overlay,
  ProjectMeasurements,
  ProjectSetup,
  PropertyData,
  RuleCategory,
} from '@greenforce/shared';

export interface EditionDef {
  id: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

/** The slice of a catalog material the engine needs for material-based checks. */
export interface EngineMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  gwp: number | null;
  gwpUnit: string;
  epdValid: boolean;
  supplierCounted: boolean;
  attributes: { euroclass?: string; fireRatingMinutes?: number };
}

/** Everything the engine evaluates. Built from persisted state; the engine itself does no I/O. */
export interface EvaluationInput {
  projectId: string;
  setup: ProjectSetup;
  measurements: ProjectMeasurements;
  property: { data: PropertyData; overlays: Overlay[] };
  evidence: EvidenceItem[];
  selectedMaterials: EngineMaterial[];
  /** ISO date used for validity checks; injected for deterministic tests. */
  today: string;
}

/** Jurisdiction-specific view of the input that rules are written against. */
export interface BaseContext<S, M, D> {
  setup: S;
  measurements: M;
  data: D;
  overlays: Overlay[];
  edition: EditionDef | null;
  selectedMaterials: EngineMaterial[];
  today: string;
}

export interface ApplicabilityResult {
  status: Applicability;
  reason: string;
  missing?: string[];
}

export interface MaterialFitResult {
  result: 'PASS' | 'FAIL' | 'INFO';
  detail: string;
}

export interface RuleDefinition<C> {
  id: string;
  code: string;
  title: string;
  category: RuleCategory;
  /** Plain-language statement of what the rule demands. */
  requirement: string;
  citation: string;
  /** When true (default) the rule cannot be decided until an edition is resolved. */
  requiresEdition?: boolean;
  applicability(ctx: C): ApplicabilityResult;
  evidence?(ctx: C): EvidenceRequirement[];
  check?(ctx: C): ComputedCheck;
  criteria?(ctx: C): Criterion[];
  /** Specific remediation advice when the computed check fails. */
  failAction?(ctx: C, check: ComputedCheck): string;
  /** How a catalog material relates to this rule; null when unrelated. */
  materialFit?(material: EngineMaterial, ctx: C): MaterialFitResult | null;
}

export interface Ruleset<C> {
  jurisdiction: Jurisdiction;
  basisLabel: string;
  editions: EditionDef[];
  /** The declared date that selects the edition, if any. */
  basisDate(input: EvaluationInput): string | undefined;
  /** Message when a basis date exists but predates every modelled edition. */
  unmodelledEditionNote: string;
  toContext(input: EvaluationInput, edition: EditionDef | null): C;
  rules: RuleDefinition<C>[];
}
