/**
 * Domain vocabulary shared by the API and the web app.
 * Values are stable identifiers; labels are the human-readable wording from the MVP brief.
 */

export const JURISDICTIONS = ['DK', 'DE'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  DK: 'Denmark',
  DE: 'Germany',
};

/** The date that decides which regulatory edition is in force. */
export const EDITION_BASIS_LABELS: Record<Jurisdiction, string> = {
  DK: 'Application date',
  DE: 'Application date',
};

export const VERDICTS = [
  'CONFIRMED',
  'PASSES',
  'FAILS',
  'PROOF_MISSING',
  'PROOF_IN_PROGRESS',
  'PACK_COMPLETE',
  'CANT_DECIDE',
] as const;
export type Verdict = (typeof VERDICTS)[number];

export const VERDICT_LABELS: Record<Verdict, string> = {
  CONFIRMED: 'Confirmed',
  PASSES: 'Passes',
  FAILS: 'Fails — fix needed',
  PROOF_MISSING: 'Proof missing',
  PROOF_IN_PROGRESS: 'Proof in progress',
  PACK_COMPLETE: 'Pack complete',
  CANT_DECIDE: "Can't decide yet",
};

export const APPLICABILITY = ['APPLIES', 'SET_ASIDE', 'UNDECIDED'] as const;
export type Applicability = (typeof APPLICABILITY)[number];

export const APPLICABILITY_LABELS: Record<Applicability, string> = {
  APPLIES: 'Applies',
  SET_ASIDE: 'Set aside',
  UNDECIDED: "Can't decide yet",
};

export const CHECK_STATUSES = ['PASS', 'FAIL', 'UNDECIDED'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export const RULE_CATEGORIES = [
  'permitting',
  'climate',
  'energy',
  'structural',
  'fire',
  'wildfire',
  'flood',
  'coastal',
  'materials',
  'waste',
  'funding',
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  permitting: 'Permitting',
  climate: 'Climate & LCA',
  energy: 'Energy',
  structural: 'Structural',
  fire: 'Fire safety',
  wildfire: 'Wildfire',
  flood: 'Flood',
  coastal: 'Coastal',
  materials: 'Materials & embodied carbon',
  waste: 'Construction waste',
  funding: 'Funding',
};

export const EVIDENCE_KINDS = [
  'LCA_REPORT',
  'EPD',
  'MATERIAL_DOC',
  'WORKSHEET',
  'DECLARATION',
  'FIRE_DOC',
  'PRODUCT_INFO',
  'CERTIFICATE',
  'PLAN',
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  LCA_REPORT: 'LCA report',
  EPD: 'EPD',
  MATERIAL_DOC: 'Material documentation',
  WORKSHEET: 'Worksheet',
  DECLARATION: 'Declaration',
  FIRE_DOC: 'Fire-resistance documentation',
  PRODUCT_INFO: 'Product information',
  CERTIFICATE: 'Certificate',
  PLAN: 'Plan / report',
};

export const EVIDENCE_STATUSES = ['MISSING', 'PROVIDED', 'VERIFIED'] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  MISSING: 'Missing',
  PROVIDED: 'Provided',
  VERIFIED: 'Verified',
};

export const MATERIAL_CATEGORIES = [
  'concrete',
  'structural_steel',
  'rebar',
  'flat_glass',
  'mineral_wool',
  'timber',
  'roofing',
  'vents',
  'windows',
  'cladding',
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  concrete: 'Concrete',
  structural_steel: 'Structural steel',
  rebar: 'Reinforcing steel',
  flat_glass: 'Flat glass',
  mineral_wool: 'Mineral wool insulation',
  timber: 'Timber',
  roofing: 'Roofing',
  vents: 'Vents',
  windows: 'Windows',
  cladding: 'Cladding',
};

export const SUPPLIER_RESULTS = ['QUALIFIED', 'CONDITIONAL', 'NOT_QUALIFIED'] as const;
export type SupplierResult = (typeof SUPPLIER_RESULTS)[number];

export const SUPPLIER_RESULT_LABELS: Record<SupplierResult, string> = {
  QUALIFIED: 'Qualified',
  CONDITIONAL: 'Conditional',
  NOT_QUALIFIED: 'Not qualified',
};

export const FUNDING_STATUSES = ['ELIGIBLE', 'NOT_ELIGIBLE', 'UNDECIDED'] as const;
export type FundingStatus = (typeof FUNDING_STATUSES)[number];

export const FUNDING_STATUS_LABELS: Record<FundingStatus, string> = {
  ELIGIBLE: 'Eligible',
  NOT_ELIGIBLE: 'Not eligible',
  UNDECIDED: "Can't decide yet",
};

export const CRITERION_STATUSES = ['MET', 'NOT_MET', 'UNKNOWN'] as const;
export type CriterionStatus = (typeof CRITERION_STATUSES)[number];

/** Upload limits enforced by the API and pre-checked by the web app. */
export const EVIDENCE_UPLOAD = {
  maxBytes: 10 * 1024 * 1024,
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  acceptAttribute: '.pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx',
} as const;

export const REGULATORY_DISCLAIMER =
  'Demonstration rule set based on public summaries of the cited regulations. Thresholds and applicability must be verified by a qualified professional before relying on them.';
