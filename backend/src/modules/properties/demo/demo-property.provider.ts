import { Injectable } from '@nestjs/common';
import type { Jurisdiction, PropertyCandidate } from '@greenforce/shared';
import type { PropertyDataProvider, ResolvedProperty } from '../property-provider.js';
import { DEMO_PROPERTIES } from './fixtures.js';

const MAX_RESULTS = 8;

/** Lower-case and strip accents so "tingbjerg alle" finds "Tingbjerg Allé". */
const normalise = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/å/gi, 'a')
    .toLowerCase();

/** Demo adapter over a curated in-memory registry. Clearly flagged as demo data in every response. */
@Injectable()
export class DemoPropertyProvider implements PropertyDataProvider {
  readonly info = {
    provider: 'demo-registry',
    label: 'GreenForce demo registry (sample data)',
    isDemo: true,
  };

  async search(jurisdiction: Jurisdiction, query: string): Promise<PropertyCandidate[]> {
    const terms = normalise(query).split(/\s+/).filter(Boolean);
    return DEMO_PROPERTIES.filter((property) => property.jurisdiction === jurisdiction)
      .filter((property) => {
        const haystack = normalise(`${property.address} ${property.parcelId} ${property.locality}`);
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, MAX_RESULTS)
      .map((property) => ({
        sourceRef: property.sourceRef,
        jurisdiction: property.jurisdiction,
        address: property.address,
        parcelId: property.parcelId,
        locality: property.locality,
        summary:
          property.data.jurisdiction === 'DK'
            ? `${property.data.bbrUseText}${property.data.yearBuilt ? ` · built ${property.data.yearBuilt}` : ''}`
            : `${property.data.landUse}${property.data.yearBuilt ? ` · built ${property.data.yearBuilt}` : ''}`,
      }));
  }

  async resolve(jurisdiction: Jurisdiction, sourceRef: string): Promise<ResolvedProperty | null> {
    return (
      DEMO_PROPERTIES.find(
        (property) => property.jurisdiction === jurisdiction && property.sourceRef === sourceRef,
      ) ?? null
    );
  }
}
