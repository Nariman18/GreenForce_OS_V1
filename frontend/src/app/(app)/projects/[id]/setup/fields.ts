import { SETUP_OPTION_LABELS as L } from '@greenforce/shared';
import type { FieldDef } from '@/components/declaration-form';

/** Brief §3 — Denmark: nature, building type, heating, funding route, construction & fire class, exempt use, date. */
export const DK_SETUP_FIELDS: FieldDef[] = [
  { name: 'projectNature', label: 'Project nature', type: 'select', options: L.dkProjectNature },
  { name: 'buildingType', label: 'Building type', type: 'select', options: L.dkBuildingType },
  { name: 'heating', label: 'Heating', type: 'select', options: L.dkHeating },
  { name: 'fundingRoute', label: 'Funding route', type: 'select', options: L.dkFundingRoute },
  {
    name: 'constructionClass',
    label: 'Construction class',
    type: 'select',
    options: L.dkConstructionClass,
    hint: 'Konstruktionsklasse — sets the structural documentation required.',
  },
  {
    name: 'fireClass',
    label: 'Fire class',
    type: 'select',
    options: L.dkFireClass,
    hint: 'Brandklasse — sets the fire documentation required.',
  },
  { name: 'exemptUse', label: 'Exempt use', type: 'select', options: L.dkExemptUse },
  {
    name: 'applicationDate',
    label: 'Application date',
    type: 'date',
    hint: 'Decides which BR18 edition is in force.',
  },
  { name: 'grossFloorAreaM2', label: 'Gross floor area', type: 'number', unit: 'm²' },
];

export const DK_MEASUREMENT_FIELDS: FieldDef[] = [
  {
    name: 'lcaGwpTotal',
    label: 'LCA result — whole-life climate impact',
    type: 'number',
    unit: 'kg CO₂e/m²/yr',
    hint: 'From LCAbyg, 50-year reference period.',
  },
  {
    name: 'lcaConstructionProcess',
    label: 'Construction-process emissions',
    type: 'number',
    unit: 'kg CO₂e/m²/yr',
  },
  { name: 'energyDemandKwh', label: 'Energy demand (Be18)', type: 'number', unit: 'kWh/m²/yr' },
];

/** Germany: declarations for a demonstration documentation checklist. */
export const DE_SETUP_FIELDS: FieldDef[] = [
  { name: 'projectNature', label: 'Project nature', type: 'select', options: L.deProjectNature },
  { name: 'buildingType', label: 'Building type', type: 'select', options: L.deBuildingType },
  { name: 'fundingRoute', label: 'Funding route', type: 'select', options: L.deFundingRoute },
  {
    name: 'buildingClass',
    label: 'Building class (Gebäudeklasse)',
    type: 'select',
    options: L.deBuildingClass,
  },
  {
    name: 'applicationDate',
    label: 'Application date',
    type: 'date',
    hint: 'Selects the demo checklist version. Legal editions require professional review.',
  },
  { name: 'grossFloorAreaM2', label: 'Gross floor area', type: 'number', unit: 'm²' },
  {
    name: 'energyTargetKwh',
    label: 'Project energy target',
    type: 'number',
    unit: 'kWh/m²/yr',
    hint: 'Design target only; not a statutory energy limit.',
  },
];
export const DE_MEASUREMENT_FIELDS: FieldDef[] = [
  { name: 'energyDemandKwh', label: 'Design energy demand', type: 'number', unit: 'kWh/m²/yr' },
];
