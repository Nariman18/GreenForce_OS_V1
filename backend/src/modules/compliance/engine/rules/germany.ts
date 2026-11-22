import type { DeMeasurements, DePropertyData, DeSetup } from '@greenforce/shared';
import { applies, limitCheck, missingFacts, setAside, undecided } from '../helpers.js';
import type { BaseContext, RuleDefinition, Ruleset } from '../types.js';

type DeContext = BaseContext<DeSetup, DeMeasurements, DePropertyData>;

/** Demo documentation workflow, not a validated German regulatory pack or legal edition history. */
const rules: RuleDefinition<DeContext>[] = [
  {
    id: 'DE-AUTH',
    code: 'DE · Authority',
    title: 'Building authority & state review',
    category: 'permitting',
    requirement:
      'Confirm the local authority, state building code, permit route and applicable legal edition with a qualified reviewer.',
    citation: 'Local Bauaufsicht / applicable Landesbauordnung; manual review required.',
    requiresEdition: false,
    applicability: ({ data }) =>
      applies(`${data.authority}; federal state: ${data.federalState}. Demo property intelligence only.`),
    evidence: () => [
      {
        key: 'authority-review',
        title: 'Authority and legal-edition review',
        kind: 'DECLARATION',
        description:
          'Record the authority, permit route, exemptions and legal editions confirmed by a professional.',
      },
    ],
  },
  {
    id: 'DE-ENERGY',
    code: 'DE · Energy',
    title: 'Energy documentation & project target',
    category: 'energy',
    requirement:
      'Provide an energy assessment. The computed check compares design demand with the declared project target only; statutory compliance requires professional review.',
    citation:
      'Federal building-energy legislation: https://www.gesetze-im-internet.de/geg/ — applicable version and calculation method must be reviewed.',
    applicability: ({ setup }) =>
      setup.projectNature
        ? applies(`Energy documentation checklist for ${setup.projectNature.replaceAll('_', ' ')}.`)
        : undecided(['Project nature']),
    evidence: () => [
      {
        key: 'energy-report',
        title: 'Energy assessment report',
        kind: 'WORKSHEET',
        description: 'Energy calculation, applicable legal version, assumptions and professional assessment.',
      },
    ],
    check: ({ setup, measurements }) => {
      if (setup.energyTargetKwh === undefined)
        return {
          status: 'UNDECIDED',
          label: 'Project energy target (not a statutory limit)',
          measured: measurements.energyDemandKwh ?? null,
          limit: null,
          unit: 'kWh/m²/yr',
          comparator: 'lte',
          explanation:
            'Declare a project energy target in Setup; this check does not establish statutory compliance.',
        };
      return limitCheck({
        label: 'Project energy target (not a statutory limit)',
        measured: measurements.energyDemandKwh,
        limit: setup.energyTargetKwh,
        unit: 'kWh/m²/yr',
        comparator: 'lte',
        missingHint: 'Enter design energy demand under Setup.',
      });
    },
    failAction: () =>
      'Improve the energy design or review the declared project target with the project team. Separately obtain a statutory energy assessment.',
  },
  {
    id: 'DE-FIRE',
    code: 'DE · Fire',
    title: 'Fire strategy & product documentation',
    category: 'fire',
    requirement:
      'Document the fire strategy and product classifications for the declared building class. Material scoring uses an illustrative A1/A2 insulation target; assembly suitability requires professional review.',
    citation:
      'Applicable Landesbauordnung / technical building provisions. Berlin example: https://www.berlin.de/sen/sbw/ — not a nationwide fire approval.',
    applicability: ({ setup, data }) => {
      const missing = missingFacts(setup, {
        projectNature: 'Project nature',
        buildingClass: 'Building class',
      });
      return missing.length
        ? undecided(missing)
        : applies(
            `${setup.buildingClass} in ${data.federalState}; state-specific fire requirements need manual review.`,
          );
    },
    evidence: () => [
      {
        key: 'fire-strategy',
        title: 'Fire strategy report',
        kind: 'FIRE_DOC',
        description: 'State-specific fire strategy and reviewer assessment.',
      },
      {
        key: 'insulation',
        title: 'Insulation product classification',
        kind: 'PRODUCT_INFO',
        description: 'Product Euroclass and assembly suitability; demo target A1/A2.',
        materialCategories: ['mineral_wool'],
      },
    ],
    materialFit: (material) =>
      material.category !== 'mineral_wool'
        ? null
        : {
            result: /^A[12](?:-|$)/.test(material.attributes.euroclass ?? '') ? 'PASS' : 'FAIL',
            detail: `Euroclass ${material.attributes.euroclass ?? 'undeclared'}; demo insulation target A1/A2. This does not approve the assembly.`,
          },
  },
  {
    id: 'DE-HERITAGE',
    code: 'DE · Heritage',
    title: 'Heritage consent review',
    category: 'permitting',
    requirement:
      'For the Berlin demo heritage overlay, obtain a heritage assessment and any required consent before work.',
    citation:
      'Berlin DSchG §11: https://www.berlin.de/landesdenkmalamt/service/antrag-auf-denkmalrechtliche-genehmigung/',
    applicability: ({ data, overlays }) => {
      if (data.federalState !== 'Berlin')
        return undecided(
          [],
          'Heritage requirements outside Berlin are not modelled; obtain a state-specific review.',
        );
      return overlays.some((o) => o.code === 'DE-HERITAGE')
        ? applies('Heritage review area (demo); confirm designation and affected works with the authority.')
        : setAside('No heritage overlay in this demo record; verify against the live register.');
    },
    evidence: () => [
      {
        key: 'heritage-consent',
        title: 'Heritage assessment / consent',
        kind: 'CERTIFICATE',
        description: 'Authority decision or documented assessment of whether consent is required.',
      },
    ],
  },
  {
    id: 'DE-FLOOD',
    code: 'DE · Flood',
    title: 'Flood risk review',
    category: 'flood',
    requirement:
      'Obtain an authority-reviewed flood assessment when the demo registry flags a flood review area.',
    citation: 'Municipal flood mapping and applicable water law; manual site-specific review required.',
    applicability: ({ overlays }) =>
      overlays.some((o) => o.code === 'DE-FLOOD')
        ? applies('Flood review area (demo); local requirements must be confirmed.')
        : setAside('No flood overlay in this demo record; not a live risk clearance.'),
    evidence: () => [
      {
        key: 'flood-assessment',
        title: 'Flood risk assessment',
        kind: 'PLAN',
        description: 'Site-specific flood assessment and any required authority decisions.',
      },
    ],
  },
];

export const germanyRuleset: Ruleset<DeContext> = {
  jurisdiction: 'DE',
  basisLabel: 'Application date',
  editions: [
    {
      id: 'DE-DEMO-2024',
      name: 'Germany demonstration documentation pack (2024+)',
      effectiveFrom: '2024-01-01',
      effectiveTo: null,
    },
  ],
  basisDate: (input) => (input.setup as DeSetup).applicationDate,
  unmodelledEditionNote:
    'This demonstration checklist models application dates from 2024 only. Legal editions require professional review.',
  toContext: (input, edition) => ({
    setup: input.setup as DeSetup,
    measurements: input.measurements as DeMeasurements,
    data: input.property.data as DePropertyData,
    overlays: input.property.overlays,
    edition,
    selectedMaterials: input.selectedMaterials,
    today: input.today,
  }),
  rules,
};
