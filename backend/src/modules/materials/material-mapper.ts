import {
  type Jurisdiction,
  type Material,
  type MaterialCategory,
  type Supplier,
  type SupplierResult,
} from '@greenforce/shared';
import type { Material as MaterialRow, Supplier as SupplierRow } from '../../generated/prisma/client.js';
import { dateOnly } from '../../common/clock.js';
import type { EngineMaterial } from '../compliance/engine/types.js';

export function toSupplier(row: SupplierRow, today: string): Supplier {
  const documentationValidTo = dateOnly(row.documentationValidTo);
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    ratingScore: row.ratingScore,
    result: row.result as SupplierResult,
    documentationValidTo,
    counted: documentationValidTo >= today,
    additionalInfoRequired: row.additionalInfoRequired,
    additionalInfoNote: row.additionalInfoNote,
  };
}

export function toMaterial(row: MaterialRow & { supplier: SupplierRow }, today: string): Material {
  const validFrom = row.epdValidFrom ? dateOnly(row.epdValidFrom) : null;
  const validTo = row.epdValidTo ? dateOnly(row.epdValidTo) : null;
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer,
    category: row.category as MaterialCategory,
    description: row.description,
    declaredUnit: row.declaredUnit,
    gwp: row.gwp,
    gwpUnit: row.gwpUnit,
    epd:
      row.epdNumber && validFrom && validTo
        ? {
            number: row.epdNumber,
            programOperator: row.epdProgramOperator ?? 'Unknown',
            validFrom,
            validTo,
            valid: validFrom <= today && today <= validTo,
          }
        : null,
    attributes: row.attributes as Material['attributes'],
    regions: row.regions as Jurisdiction[],
    supplier: toSupplier(row.supplier, today),
  };
}

export function toEngineMaterial(material: Material): EngineMaterial {
  return {
    id: material.id,
    name: material.name,
    category: material.category,
    gwp: material.gwp,
    gwpUnit: material.gwpUnit,
    epdValid: material.epd?.valid ?? false,
    supplierCounted: material.supplier.counted,
    attributes: material.attributes,
  };
}
