import { z } from 'zod';
import { IdSchema, IsoDateTimeSchema, JurisdictionSchema } from './common.js';

export const PropertySearchQuerySchema = z.object({
  jurisdiction: JurisdictionSchema,
  q: z.string().trim().min(2, 'Type at least 2 characters').max(120),
});
export type PropertySearchQuery = z.infer<typeof PropertySearchQuerySchema>;

export const PropertyCandidateSchema = z.object({
  sourceRef: z.string(),
  jurisdiction: JurisdictionSchema,
  address: z.string(),
  parcelId: z.string(),
  locality: z.string(),
  summary: z.string(),
});
export type PropertyCandidate = z.infer<typeof PropertyCandidateSchema>;

export const OverlaySchema = z.object({
  code: z.string(),
  name: z.string(),
  category: z.enum(['wildfire', 'flood', 'coastal', 'heritage', 'planning', 'environmental', 'utility']),
  source: z.string(),
  note: z.string().optional(),
});
export type Overlay = z.infer<typeof OverlaySchema>;

/** Denmark: BBR (building register), cadastre (matrikel) and municipality data. */
export const DkPropertyDataSchema = z.object({
  jurisdiction: z.literal('DK'),
  bfeNumber: z.string(),
  cadastralParcel: z.string(),
  bbrUseCode: z.string(),
  bbrUseText: z.string(),
  yearBuilt: z.number().int().nullable(),
  buildingAreaM2: z.number().nonnegative().nullable(),
  plotAreaM2: z.number().nonnegative(),
  storeys: z.number().int().nullable(),
  dwellingUnits: z.number().int().nullable(),
  heating: z.string().nullable(),
  municipality: z.string(),
  municipalityCode: z.string(),
  authority: z.string(),
  fundingRoute: z.string(),
});
export type DkPropertyData = z.infer<typeof DkPropertyDataSchema>;

/** Germany: illustrative cadastral and municipal intelligence, not a live registry. */
export const DePropertyDataSchema = z.object({
  jurisdiction: z.literal('DE'),
  cadastralParcel: z.string(),
  cadastralDistrict: z.string(),
  landUse: z.string(),
  yearBuilt: z.number().int().nullable(),
  buildingAreaM2: z.number().nonnegative().nullable(),
  plotAreaM2: z.number().nonnegative(),
  storeys: z.number().int().nullable(),
  dwellingUnits: z.number().int().nullable(),
  heating: z.string().nullable(),
  municipality: z.string(),
  federalState: z.string(),
  authority: z.string(),
  zoning: z.string(),
  fundingRoute: z.string(),
});
export type DePropertyData = z.infer<typeof DePropertyDataSchema>;

export const PropertyDataSchema = z.discriminatedUnion('jurisdiction', [
  DkPropertyDataSchema,
  DePropertyDataSchema,
]);
export type PropertyData = z.infer<typeof PropertyDataSchema>;

export const PropertySourceSchema = z.object({
  provider: z.string(),
  label: z.string(),
  isDemo: z.boolean(),
  retrievedAt: IsoDateTimeSchema,
});

export const PropertyRecordSchema = z.object({
  id: IdSchema,
  greenforceId: z.string(),
  jurisdiction: JurisdictionSchema,
  address: z.string(),
  parcelId: z.string(),
  data: PropertyDataSchema,
  overlays: z.array(OverlaySchema),
  source: PropertySourceSchema,
});
export type PropertyRecord = z.infer<typeof PropertyRecordSchema>;

/** Preview returned before a project is created: the resolved record without a database id. */
export const PropertyPreviewSchema = PropertyRecordSchema.omit({ id: true });
export type PropertyPreview = z.infer<typeof PropertyPreviewSchema>;
