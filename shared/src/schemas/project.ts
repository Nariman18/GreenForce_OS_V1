import { z } from 'zod';
import { IdSchema, IsoDateSchema, IsoDateTimeSchema, JurisdictionSchema } from './common.js';
import { PropertyRecordSchema } from './property.js';

/* ------------------------------------------------------------------ *
 * Setup options. Every option list has a label map so the web app,
 * the passport and the API all describe a declaration the same way.
 * ------------------------------------------------------------------ */

export const DK_PROJECT_NATURES = ['new_build', 'major_renovation', 'extension', 'change_of_use'] as const;
export const DK_BUILDING_TYPES = [
  'single_family',
  'multi_storey_residential',
  'office',
  'institution',
  'holiday_home',
  'industrial_warehouse',
  'other',
] as const;
export const DK_HEATING = [
  'district_heating',
  'heat_pump',
  'electric',
  'natural_gas',
  'oil',
  'biomass',
] as const;
export const DK_FUNDING_ROUTES = ['private', 'social_housing', 'public'] as const;
export const DK_CONSTRUCTION_CLASSES = ['CC1', 'CC2', 'CC3', 'CC4'] as const;
export const DK_FIRE_CLASSES = ['BK1', 'BK2', 'BK3', 'BK4'] as const;
export const DK_EXEMPT_USES = ['none', 'small_building', 'temporary', 'agricultural'] as const;

export const DE_PROJECT_NATURES = ['new_build', 'major_renovation', 'extension', 'change_of_use'] as const;
export const DE_BUILDING_TYPES = ['residential', 'office', 'education', 'industrial', 'other'] as const;
export const DE_FUNDING_ROUTES = ['private', 'public', 'subsidised_housing'] as const;
export const DE_BUILDING_CLASSES = ['GK1', 'GK2', 'GK3', 'GK4', 'GK5'] as const;

export const SETUP_OPTION_LABELS = {
  dkProjectNature: {
    new_build: 'New build',
    major_renovation: 'Major renovation',
    extension: 'Extension',
    change_of_use: 'Change of use',
  },
  dkBuildingType: {
    single_family: 'Single-family / terraced house',
    multi_storey_residential: 'Multi-storey residential (etagebolig)',
    office: 'Office',
    institution: 'Institution (school, care, daycare)',
    holiday_home: 'Holiday home (sommerhus)',
    industrial_warehouse: 'Industrial / warehouse',
    other: 'Other',
  },
  dkHeating: {
    district_heating: 'District heating (fjernvarme)',
    heat_pump: 'Heat pump',
    electric: 'Direct electric',
    natural_gas: 'Natural gas boiler',
    oil: 'Oil boiler',
    biomass: 'Biomass',
  },
  dkFundingRoute: {
    private: 'Private',
    social_housing: 'Social housing (almen bolig)',
    public: 'Public building',
  },
  dkConstructionClass: { CC1: 'CC1', CC2: 'CC2', CC3: 'CC3', CC4: 'CC4' },
  dkFireClass: { BK1: 'BK1', BK2: 'BK2', BK3: 'BK3', BK4: 'BK4' },
  dkExemptUse: {
    none: 'None',
    small_building: 'Small building ≤ 50 m²',
    temporary: 'Temporary building',
    agricultural: 'Agricultural building',
  },
  deProjectNature: {
    new_build: 'New build',
    major_renovation: 'Major renovation',
    extension: 'Extension',
    change_of_use: 'Change of use',
  },
  deBuildingType: {
    residential: 'Residential',
    office: 'Office',
    education: 'Education',
    industrial: 'Industrial / warehouse',
    other: 'Other',
  },
  deFundingRoute: { private: 'Private', public: 'Public building', subsidised_housing: 'Subsidised housing' },
  deBuildingClass: { GK1: 'GK1', GK2: 'GK2', GK3: 'GK3', GK4: 'GK4', GK5: 'GK5' },
} as const;

/* ------------------------------------------------------------------ *
 * Project setup — the contractor's declarations. Fields are optional:
 * an undeclared fact makes dependent rules "Can't decide yet" rather
 * than blocking the save.
 * ------------------------------------------------------------------ */

export const DkSetupSchema = z.object({
  jurisdiction: z.literal('DK'),
  projectNature: z.enum(DK_PROJECT_NATURES).optional(),
  buildingType: z.enum(DK_BUILDING_TYPES).optional(),
  heating: z.enum(DK_HEATING).optional(),
  fundingRoute: z.enum(DK_FUNDING_ROUTES).optional(),
  constructionClass: z.enum(DK_CONSTRUCTION_CLASSES).optional(),
  fireClass: z.enum(DK_FIRE_CLASSES).optional(),
  exemptUse: z.enum(DK_EXEMPT_USES).optional(),
  applicationDate: IsoDateSchema.optional(),
  grossFloorAreaM2: z.number().positive('Must be greater than 0').max(1_000_000).optional(),
});
export type DkSetup = z.infer<typeof DkSetupSchema>;

export const DeSetupSchema = z.object({
  jurisdiction: z.literal('DE'),
  projectNature: z.enum(DE_PROJECT_NATURES).optional(),
  buildingType: z.enum(DE_BUILDING_TYPES).optional(),
  fundingRoute: z.enum(DE_FUNDING_ROUTES).optional(),
  buildingClass: z.enum(DE_BUILDING_CLASSES).optional(),
  applicationDate: IsoDateSchema.optional(),
  grossFloorAreaM2: z.number().positive('Must be greater than 0').max(1_000_000).optional(),
  /** Project design target, not a statutory energy limit. */
  energyTargetKwh: z.number().positive().max(1000).optional(),
});
export type DeSetup = z.infer<typeof DeSetupSchema>;

export const ProjectSetupSchema = z.discriminatedUnion('jurisdiction', [DkSetupSchema, DeSetupSchema]);
export type ProjectSetup = z.infer<typeof ProjectSetupSchema>;

/* ------------------------------------------------------------------ *
 * Measurements — design data that computed checks compare to limits.
 * ------------------------------------------------------------------ */

export const DkMeasurementsSchema = z.object({
  jurisdiction: z.literal('DK'),
  /** Whole-life climate impact from the LCA, kg CO₂e/m²/year (50-year reference period). */
  lcaGwpTotal: z.number().min(0).max(200).optional(),
  /** Construction-process (site) emissions, kg CO₂e/m²/year. */
  lcaConstructionProcess: z.number().min(0).max(50).optional(),
  /** Calculated energy demand for the energy frame, kWh/m²/year. */
  energyDemandKwh: z.number().min(0).max(1000).optional(),
});
export type DkMeasurements = z.infer<typeof DkMeasurementsSchema>;

export const DeMeasurementsSchema = z.object({
  jurisdiction: z.literal('DE'),
  /** Design energy demand compared only with the declared project target. */
  energyDemandKwh: z.number().min(0).max(1000).optional(),
});
export type DeMeasurements = z.infer<typeof DeMeasurementsSchema>;

export const ProjectMeasurementsSchema = z.discriminatedUnion('jurisdiction', [
  DkMeasurementsSchema,
  DeMeasurementsSchema,
]);
export type ProjectMeasurements = z.infer<typeof ProjectMeasurementsSchema>;

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */

export const ProjectNameSchema = z
  .string()
  .trim()
  .min(3, 'Name must be at least 3 characters')
  .max(120, 'Name must be at most 120 characters');

export const CreateProjectRequestSchema = z.object({
  jurisdiction: JurisdictionSchema,
  sourceRef: z.string().min(1).max(64),
  name: ProjectNameSchema,
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const ReadinessPartSchema = z.object({
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  /** 0–100. When total is 0 the component is treated as complete (100). */
  pct: z.number().min(0).max(100),
});

export const ReadinessSchema = z.object({
  rulesDecided: ReadinessPartSchema,
  proofIn: ReadinessPartSchema,
  checksPassing: ReadinessPartSchema,
  overall: z.number().min(0).max(100),
});
export type Readiness = z.infer<typeof ReadinessSchema>;

export const ProjectSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  jurisdiction: JurisdictionSchema,
  greenforceId: z.string(),
  address: z.string(),
  readiness: ReadinessSchema,
  openIssues: z.number().int().nonnegative(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const ProjectDetailSchema = z.object({
  id: IdSchema,
  name: z.string(),
  jurisdiction: JurisdictionSchema,
  property: PropertyRecordSchema,
  setup: ProjectSetupSchema,
  measurements: ProjectMeasurementsSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
