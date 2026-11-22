import type { Jurisdiction, Overlay, PropertyCandidate, PropertyData } from '@greenforce/shared';

/** What a registry adapter returns for one property, before GreenForce assigns its ID. */
export interface ResolvedProperty {
  sourceRef: string;
  jurisdiction: Jurisdiction;
  address: string;
  parcelId: string;
  locality: string;
  data: PropertyData;
  overlays: Overlay[];
}

export interface ProviderInfo {
  provider: string;
  label: string;
  isDemo: boolean;
}

/**
 * Port for jurisdiction-specific property sources (BBR/Datafordeler, German cadastral and municipal registries…).
 * The MVP ships only the DemoPropertyProvider; live adapters implement the same contract.
 */
export interface PropertyDataProvider {
  readonly info: ProviderInfo;
  search(jurisdiction: Jurisdiction, query: string): Promise<PropertyCandidate[]>;
  resolve(jurisdiction: Jurisdiction, sourceRef: string): Promise<ResolvedProperty | null>;
}

export const PROPERTY_DATA_PROVIDER = Symbol('PROPERTY_DATA_PROVIDER');
