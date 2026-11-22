import { z } from 'zod';
import { MATERIAL_CATEGORIES, SUPPLIER_RESULTS } from '../constants/domain.js';
import { IdSchema, IsoDateSchema, JurisdictionSchema } from './common.js';

export const MaterialCategorySchema = z.enum(MATERIAL_CATEGORIES);

export const SupplierSchema = z.object({
  id: IdSchema,
  name: z.string(),
  country: z.string(),
  ratingScore: z.number().int().min(0).max(100),
  result: z.enum(SUPPLIER_RESULTS),
  documentationValidTo: IsoDateSchema,
  /** True while the supplier's documentation is valid and therefore counted. */
  counted: z.boolean(),
  additionalInfoRequired: z.boolean(),
  additionalInfoNote: z.string().nullable(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

export const EpdSchema = z.object({
  number: z.string(),
  programOperator: z.string(),
  validFrom: IsoDateSchema,
  validTo: IsoDateSchema,
  /** True when today's date is inside the validity window. */
  valid: z.boolean(),
});

export const MaterialAttributesSchema = z.object({
  euroclass: z.string().optional(),
  fireRatingMinutes: z.number().int().optional(),
  recycledContentPct: z.number().optional(),
});

export const MaterialSchema = z.object({
  id: IdSchema,
  name: z.string(),
  manufacturer: z.string(),
  category: MaterialCategorySchema,
  description: z.string(),
  declaredUnit: z.string(),
  gwp: z.number().nullable(),
  gwpUnit: z.string(),
  epd: EpdSchema.nullable(),
  attributes: MaterialAttributesSchema,
  regions: z.array(JurisdictionSchema),
  supplier: SupplierSchema,
});
export type Material = z.infer<typeof MaterialSchema>;

export const MaterialListQuerySchema = z.object({
  jurisdiction: JurisdictionSchema.optional(),
  category: MaterialCategorySchema.optional(),
});
export type MaterialListQuery = z.infer<typeof MaterialListQuerySchema>;

export const MaterialFitSchema = z.object({
  ruleId: z.string(),
  code: z.string(),
  title: z.string(),
  /** PASS: the material satisfies the rule's material criterion; FAIL: it does not; INFO: relevant but unscored. */
  result: z.enum(['PASS', 'FAIL', 'INFO']),
  detail: z.string(),
});
export type MaterialFit = z.infer<typeof MaterialFitSchema>;

export const MaterialRecommendationSchema = z.object({
  material: MaterialSchema,
  fits: z.array(MaterialFitSchema),
  /** Recommended = every scored fit passes, EPD valid, supplier counted and not "Not qualified". */
  recommended: z.boolean(),
  selected: z.boolean(),
  warnings: z.array(z.string()),
});
export type MaterialRecommendation = z.infer<typeof MaterialRecommendationSchema>;

export const ProjectMaterialsResponseSchema = z.object({
  recommendations: z.array(MaterialRecommendationSchema),
  selectedCount: z.number().int(),
});
export type ProjectMaterialsResponse = z.infer<typeof ProjectMaterialsResponseSchema>;

export const ProjectMaterialParamsSchema = z.object({ id: IdSchema, materialId: IdSchema });
