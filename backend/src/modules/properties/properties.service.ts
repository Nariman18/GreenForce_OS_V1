import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type Jurisdiction,
  OverlaySchema,
  type PropertyCandidate,
  PropertyDataSchema,
  type PropertyPreview,
  type PropertyRecord,
} from '@greenforce/shared';
import { z } from 'zod';
import type { Property } from '../../generated/prisma/client.js';
import { type Database, PRISMA } from '../../db/prisma.js';
import { greenforceId } from './greenforce-id.js';
import { PROPERTY_DATA_PROVIDER, type PropertyDataProvider } from './property-provider.js';

const PropertySourceRowSchema = z.object({
  provider: z.string(),
  label: z.string(),
  isDemo: z.boolean(),
  retrievedAt: z.string(),
});

@Injectable()
export class PropertiesService {
  constructor(
    @Inject(PRISMA) private readonly db: Database,
    @Inject(PROPERTY_DATA_PROVIDER) private readonly provider: PropertyDataProvider,
  ) {}

  search(jurisdiction: Jurisdiction, query: string): Promise<PropertyCandidate[]> {
    return this.provider.search(jurisdiction, query);
  }

  /** Resolves a candidate into a full property record without persisting it. */
  async preview(jurisdiction: Jurisdiction, sourceRef: string): Promise<PropertyPreview> {
    const resolved = await this.provider.resolve(jurisdiction, sourceRef);
    if (!resolved) throw new NotFoundException('Property not found in the registry');
    return {
      greenforceId: greenforceId(resolved.jurisdiction, resolved.parcelId),
      jurisdiction: resolved.jurisdiction,
      address: resolved.address,
      parcelId: resolved.parcelId,
      data: resolved.data,
      overlays: resolved.overlays,
      source: { ...this.provider.info, retrievedAt: new Date().toISOString() },
    };
  }

  /**
   * Resolves the property server-side (client input is only a reference) and returns the stored row.
   * The GreenForce ID is stable, so a property shared by several projects is stored once.
   */
  async upsert(jurisdiction: Jurisdiction, sourceRef: string): Promise<PropertyRecord> {
    const preview = await this.preview(jurisdiction, sourceRef);
    // Upsert on the unique GreenForce ID: concurrent creations of the same property converge on one row.
    const row = await this.db.property.upsert({
      where: { greenforceId: preview.greenforceId },
      update: {},
      create: {
        greenforceId: preview.greenforceId,
        jurisdiction: preview.jurisdiction,
        sourceRef,
        address: preview.address,
        parcelId: preview.parcelId,
        data: preview.data,
        overlays: preview.overlays,
        source: preview.source,
      },
    });
    return toPropertyRecord(row);
  }
}

/** Re-validates JSON columns on the way out so a corrupt row fails loudly instead of leaking. */
export function toPropertyRecord(row: Property): PropertyRecord {
  return {
    id: row.id,
    greenforceId: row.greenforceId,
    jurisdiction: row.jurisdiction as Jurisdiction,
    address: row.address,
    parcelId: row.parcelId,
    data: PropertyDataSchema.parse(row.data),
    overlays: z.array(OverlaySchema).parse(row.overlays),
    source: PropertySourceRowSchema.parse(row.source),
  };
}
