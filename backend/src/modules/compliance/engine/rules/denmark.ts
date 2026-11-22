import {
  type DkMeasurements,
  type DkPropertyData,
  type DkSetup,
  type EvidenceRequirement,
  SETUP_OPTION_LABELS,
} from '@greenforce/shared';
import {
  applies,
  booleanCheck,
  criterion,
  editionFrom,
  limitCheck,
  missingFacts,
  setAside,
  undecided,
} from '../helpers.js';
import type { BaseContext, EditionDef, RuleDefinition, Ruleset } from '../types.js';

export type DkContext = BaseContext<DkSetup, DkMeasurements, DkPropertyData>;
type DkRule = RuleDefinition<DkContext>;

const EDITION_2023 = '2023-01-01';
const EDITION_2025 = '2025-07-01';

export const DK_EDITIONS: EditionDef[] = [
  {
    id: 'BR18-2018',
    name: 'BR18 — Building Regulations 2018',
    effectiveFrom: '2018-07-01',
    effectiveTo: '2022-12-31',
  },
  {
    id: 'BR18-2023',
    name: 'BR18 with climate requirements (1 January 2023)',
    effectiveFrom: EDITION_2023,
    effectiveTo: '2025-06-30',
  },
  {
    id: 'BR18-2025',
    name: 'BR18 with tightened climate limits (1 July 2025)',
    effectiveFrom: EDITION_2025,
    effectiveTo: null,
  },
];

const LABEL = {
  projectNature: 'Project nature',
  buildingType: 'Building type',
  heating: 'Heating',
  fundingRoute: 'Funding route',
  constructionClass: 'Construction class',
  fireClass: 'Fire class',
  exemptUse: 'Exempt use',
  applicationDate: 'Application date',
  grossFloorAreaM2: 'Gross floor area',
} satisfies Record<Exclude<keyof DkSetup, 'jurisdiction'>, string>;

/** Climate limit values (kg CO₂e/m²/year) for new buildings from 1 July 2025, by building type. */
export const DK_2025_CLIMATE_LIMITS: Record<NonNullable<DkSetup['buildingType']>, number> = {
  single_family: 6.7,
  multi_storey_residential: 7.5,
  office: 7.5,
  institution: 8.0,
  holiday_home: 4.0,
  industrial_warehouse: 8.0,
  other: 8.0,
};
export const DK_2023_CLIMATE_LIMIT = 12.0;
export const DK_CONSTRUCTION_PROCESS_LIMIT = 1.5;

const RENOVATION_NATURES: NonNullable<DkSetup['projectNature']>[] = [
  'major_renovation',
  'extension',
  'change_of_use',
];
const LCA_MATERIALS: EvidenceRequirement['materialCategories'] = [
  'concrete',
  'timber',
  'mineral_wool',
  'structural_steel',
  'flat_glass',
];

const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** Shared gate for the BR18 climate (LCA) requirements: new buildings that are not exempt. */
function climateScope(ctx: DkContext): { result: ReturnType<typeof applies> | null } {
  const missing = missingFacts(ctx.setup, {
    projectNature: LABEL.projectNature,
    exemptUse: LABEL.exemptUse,
  });
  if (!editionFrom(ctx.edition, EDITION_2023)) {
    return { result: setAside(`No climate requirement in ${ctx.edition?.name ?? 'the edition in force'}.`) };
  }
  if (ctx.setup.projectNature && ctx.setup.projectNature !== 'new_build') {
    return {
      result: setAside(
        `Climate requirements cover new buildings; this project is a ${SETUP_OPTION_LABELS.dkProjectNature[ctx.setup.projectNature].toLowerCase()}.`,
      ),
    };
  }
  if (ctx.setup.exemptUse && ctx.setup.exemptUse !== 'none') {
    return {
      result: setAside(`Exempt use declared: ${SETUP_OPTION_LABELS.dkExemptUse[ctx.setup.exemptUse]}.`),
    };
  }
  if (missing.length) return { result: undecided(missing) };
  return { result: null };
}

function climateLimit(ctx: DkContext): number | null {
  if (editionFrom(ctx.edition, EDITION_2025)) {
    return ctx.setup.buildingType ? DK_2025_CLIMATE_LIMITS[ctx.setup.buildingType] : null;
  }
  return DK_2023_CLIMATE_LIMIT;
}

const authority: DkRule = {
  id: 'DK-AUTH',
  code: 'Byggeloven §16',
  title: 'Building authority and permit route',
  category: 'permitting',
  requirement: 'A building permit application is submitted digitally to the municipality via Byg og Miljø.',
  citation: 'Byggeloven (Danish Building Act) §16; BR18 §2',
  requiresEdition: false,
  applicability: (ctx) =>
    applies(
      `${ctx.data.municipality} (code ${ctx.data.municipalityCode}) is the building authority: ${ctx.data.authority}.`,
    ),
};

const lcaDocumentation: DkRule = {
  id: 'DK-LCA-DOC',
  code: 'BR18 §297',
  title: 'Life-cycle assessment (LCA) of climate impact',
  category: 'climate',
  requirement:
    'New buildings must document their climate impact with an LCA over a 50-year reference period (LCAbyg or equivalent).',
  citation: 'BR18 chapter 11, §297',
  applicability(ctx) {
    const scope = climateScope(ctx).result;
    if (scope) return scope;
    return applies(
      `New build with an application date of ${ctx.setup.applicationDate} under ${ctx.edition!.name}.`,
    );
  },
  evidence: () => [
    {
      key: 'lca-report',
      kind: 'LCA_REPORT',
      title: 'LCA calculation report',
      description: 'LCAbyg (or equivalent) report covering modules A1–A3, B4, B6, C3–C4 over 50 years.',
    },
    {
      key: 'quantities',
      kind: 'WORKSHEET',
      title: 'Bill of quantities used in the LCA',
      description: 'Material quantities per building part, matching the design documentation.',
    },
    {
      key: 'epds',
      kind: 'EPD',
      title: 'EPDs for main building products',
      description:
        'Product-specific EPDs where generic data is replaced. A selected catalog material can be linked.',
      materialCategories: LCA_MATERIALS,
    },
  ],
  materialFit(material) {
    if (!LCA_MATERIALS!.includes(material.category)) return null;
    return material.epdValid
      ? { result: 'PASS', detail: 'Valid product-specific EPD can replace generic LCA data.' }
      : { result: 'FAIL', detail: 'No valid EPD — generic (conservative) data would be used in the LCA.' };
  },
};

const climateLimitRule: DkRule = {
  id: 'DK-LCA-LIMIT',
  code: 'BR18 §298',
  title: 'Climate impact limit value',
  category: 'climate',
  requirement:
    'The whole-life climate impact of a new building must not exceed the limit value for its building type and edition.',
  citation: 'BR18 chapter 11, §298',
  applicability(ctx) {
    const scope = climateScope(ctx).result;
    if (scope) return scope;
    const is2025 = editionFrom(ctx.edition, EDITION_2025);
    const missing = missingFacts(ctx.setup, {
      grossFloorAreaM2: LABEL.grossFloorAreaM2,
      ...(is2025 ? { buildingType: LABEL.buildingType } : {}),
    });
    if (missing.length) return undecided(missing);
    const area = ctx.setup.grossFloorAreaM2!;
    if (is2025) {
      if (area <= 50) return setAside('Buildings of 50 m² or less are exempt from the limit value.');
      return applies(
        `New ${SETUP_OPTION_LABELS.dkBuildingType[ctx.setup.buildingType!].toLowerCase()} over 50 m²: limit ${fmt(climateLimit(ctx)!)} kg CO₂e/m²/year.`,
      );
    }
    if (area <= 1000)
      return setAside('In the 2023 edition the limit value applies only to new buildings over 1,000 m².');
    return applies(`New build over 1,000 m²: limit ${fmt(DK_2023_CLIMATE_LIMIT)} kg CO₂e/m²/year.`);
  },
  check: (ctx) =>
    limitCheck({
      label: 'Whole-life climate impact',
      measured: ctx.measurements.lcaGwpTotal,
      limit: climateLimit(ctx) ?? DK_2023_CLIMATE_LIMIT,
      unit: 'kg CO₂e/m²/yr',
      comparator: 'lte',
      missingHint: 'Enter the LCA result (kg CO₂e/m²/year) under Setup → Measurements.',
    }),
  failAction: (_ctx, check) =>
    `Reduce climate impact by ${fmt(check.measured! - check.limit!)} kg CO₂e/m²/yr — e.g. lower-carbon concrete, a timber structure or product-specific EPDs instead of generic data (see Materials).`,
  evidence: () => [
    {
      key: 'lca-result',
      kind: 'LCA_REPORT',
      title: 'LCA result statement',
      description: 'Result page from the LCA showing the total in kg CO₂e/m²/year against the limit.',
    },
  ],
};

const constructionProcess: DkRule = {
  id: 'DK-LCA-PROCESS',
  code: 'BR18 §298 stk. 3',
  title: 'Construction-process emissions limit',
  category: 'climate',
  requirement:
    'From 1 July 2025, emissions from the construction process (site energy and fuel) must stay within 1.5 kg CO₂e/m²/year.',
  citation: 'BR18 chapter 11 (2025 amendment)',
  applicability(ctx) {
    const scope = climateScope(ctx).result;
    if (scope) return scope;
    if (!editionFrom(ctx.edition, EDITION_2025))
      return setAside('Introduced with the 1 July 2025 amendment.');
    const missing = missingFacts(ctx.setup, { grossFloorAreaM2: LABEL.grossFloorAreaM2 });
    if (missing.length) return undecided(missing);
    if (ctx.setup.grossFloorAreaM2! <= 50) return setAside('Buildings of 50 m² or less are exempt.');
    return applies('New build over 50 m² under the 2025 amendment.');
  },
  check: (ctx) =>
    limitCheck({
      label: 'Construction-process emissions',
      measured: ctx.measurements.lcaConstructionProcess,
      limit: DK_CONSTRUCTION_PROCESS_LIMIT,
      unit: 'kg CO₂e/m²/yr',
      comparator: 'lte',
      missingHint: 'Enter construction-process emissions under Setup → Measurements.',
    }),
  failAction: () =>
    'Plan fossil-free site machinery and heating/drying with district heating or electricity.',
  evidence: () => [
    {
      key: 'site-worksheet',
      kind: 'WORKSHEET',
      title: 'Construction-site emissions worksheet',
      description: 'Expected energy and fuel use on site (machinery, heating, drying).',
    },
  ],
};

const energyFrame: DkRule = {
  id: 'DK-ENERGY-FRAME',
  code: 'BR18 §250, §259',
  title: 'Energy frame for new buildings',
  category: 'energy',
  requirement:
    'The calculated energy demand of a new building must stay within the energy frame: 30 + 1000/A kWh/m²/yr for residential, 41 + 1000/A for other buildings.',
  citation: 'BR18 chapter 11, §250 and §259',
  applicability(ctx) {
    const missing = missingFacts(ctx.setup, {
      projectNature: LABEL.projectNature,
      buildingType: LABEL.buildingType,
      grossFloorAreaM2: LABEL.grossFloorAreaM2,
    });
    if (ctx.setup.projectNature && ctx.setup.projectNature !== 'new_build') {
      return setAside(
        'The energy frame applies to new buildings; renovations follow component requirements.',
      );
    }
    if (ctx.setup.buildingType === 'holiday_home')
      return setAside('Holiday homes follow separate energy requirements.');
    if (ctx.setup.exemptUse === 'small_building' || ctx.setup.exemptUse === 'temporary') {
      return setAside(`Exempt use declared: ${SETUP_OPTION_LABELS.dkExemptUse[ctx.setup.exemptUse]}.`);
    }
    if (missing.length) return undecided(missing);
    return applies('New building with a heated floor area — energy frame calculation (Be18) required.');
  },
  check(ctx) {
    const area = ctx.setup.grossFloorAreaM2 ?? 1;
    const residential = ['single_family', 'multi_storey_residential'].includes(ctx.setup.buildingType ?? '');
    const limit = Math.round(((residential ? 30 : 41) + 1000 / area) * 100) / 100;
    return limitCheck({
      label: 'Energy demand',
      measured: ctx.measurements.energyDemandKwh,
      limit,
      unit: 'kWh/m²/yr',
      comparator: 'lte',
      missingHint: 'Enter the Be18 energy demand under Setup → Measurements.',
    });
  },
  failAction: () =>
    'Improve the envelope (U-values, airtightness) or add solar PV to bring the energy demand within the frame.',
  evidence: () => [
    {
      key: 'be18',
      kind: 'WORKSHEET',
      title: 'Energy frame calculation (Be18)',
      description: 'Be18 calculation with the key figures for the energy frame.',
    },
  ],
};

const renovationComponents: DkRule = {
  id: 'DK-ENERGY-RENO',
  code: 'BR18 §274–§279',
  title: 'Component requirements for renovated building parts',
  category: 'energy',
  requirement:
    'Renewed building parts and replaced components must meet the BR18 minimum U-values and component requirements.',
  citation: 'BR18 chapter 11, §274–§279',
  requiresEdition: false,
  applicability(ctx) {
    if (!ctx.setup.projectNature) return undecided([LABEL.projectNature]);
    if (!RENOVATION_NATURES.includes(ctx.setup.projectNature)) {
      return setAside('Applies to renovations, extensions and changes of use — not new builds.');
    }
    return applies(
      `${SETUP_OPTION_LABELS.dkProjectNature[ctx.setup.projectNature]}: renewed parts must meet component U-values.`,
    );
  },
  evidence: () => [
    {
      key: 'u-values',
      kind: 'WORKSHEET',
      title: 'U-value documentation for renewed parts',
      description: 'U-value calculations for walls, roof, floors and windows in scope.',
    },
    {
      key: 'product-data',
      kind: 'PRODUCT_INFO',
      title: 'Product data sheets (insulation, windows)',
      description:
        'Declared thermal performance of installed products. A selected catalog material can be linked.',
      materialCategories: ['mineral_wool', 'windows'],
    },
  ],
  materialFit: (material) =>
    material.category === 'mineral_wool' || material.category === 'windows'
      ? { result: 'INFO', detail: 'Thermal product data can document component U-values.' }
      : null,
};

const fossilHeating: DkRule = {
  id: 'DK-HEATING',
  code: 'Fossil boiler ban',
  title: 'No new oil or natural-gas boilers',
  category: 'energy',
  requirement:
    'New buildings, and buildings replacing their heating, may not install oil or natural-gas boilers.',
  citation:
    'Danish executive order banning installation of oil and natural-gas boilers (olie- og naturgasfyr)',
  requiresEdition: false,
  applicability(ctx) {
    if (!ctx.setup.projectNature) return undecided([LABEL.projectNature]);
    if (ctx.setup.projectNature === 'new_build' || ctx.setup.projectNature === 'major_renovation') {
      return applies('New heating installations in new builds and major renovations are covered.');
    }
    return setAside('No new heating installation in scope for this project nature.');
  },
  check: (ctx) =>
    booleanCheck({
      label: 'Heating source',
      value:
        ctx.setup.heating === undefined ? undefined : !['oil', 'natural_gas'].includes(ctx.setup.heating),
      passText: `${SETUP_OPTION_LABELS.dkHeating[ctx.setup.heating ?? 'district_heating']} is permitted.`,
      failText: `${SETUP_OPTION_LABELS.dkHeating[ctx.setup.heating ?? 'oil']} may not be installed.`,
      missingHint: 'Declare the heating source in Setup.',
    }),
  failAction: () =>
    'Switch the heating design to district heating or a heat pump — the declared fossil boiler cannot be permitted.',
};

const structural: DkRule = {
  id: 'DK-STRUCT',
  code: 'BR18 §483–§501',
  title: 'Structural documentation by construction class',
  category: 'structural',
  requirement:
    'Structural design is documented according to the construction class (CC1–CC4); CC2+ needs a certified structural engineer, CC3+ independent control, CC4 third-party review.',
  citation: 'BR18 chapter 27 (konstruktionsklasser)',
  requiresEdition: false,
  applicability(ctx) {
    if (ctx.setup.exemptUse === 'small_building')
      return setAside('Small buildings ≤ 50 m² are exempt from class documentation.');
    if (!ctx.setup.constructionClass) return undecided([LABEL.constructionClass]);
    return applies(`Declared ${ctx.setup.constructionClass}.`);
  },
  evidence(ctx) {
    const cc = Number(ctx.setup.constructionClass?.slice(2) ?? 1);
    const items: EvidenceRequirement[] = [
      {
        key: 'structural-report',
        kind: 'WORKSHEET',
        title: 'Structural documentation report',
        description: 'Basis of design, calculations and structural drawings.',
      },
    ];
    if (cc === 1) {
      items.push({
        key: 'owner-declaration',
        kind: 'DECLARATION',
        title: 'Builder declaration (CC1)',
        description: "Builder's declaration that structural requirements are met.",
      });
    } else {
      items.push({
        key: 'certified-engineer',
        kind: 'CERTIFICATE',
        title: 'Certified structural engineer statement',
        description: 'Statement from a certified structural engineer (certificeret statiker).',
      });
    }
    if (cc >= 3) {
      items.push({
        key: 'independent-control',
        kind: 'PLAN',
        title: 'Independent control of structural design',
        description: 'Report from the independent controller.',
      });
    }
    if (cc === 4) {
      items.push({
        key: 'third-party',
        kind: 'CERTIFICATE',
        title: 'Third-party review (CC4)',
        description: 'Third-party review report.',
      });
    }
    return items;
  },
};

const fire: DkRule = {
  id: 'DK-FIRE',
  code: 'BR18 §493–§510',
  title: 'Fire safety documentation by fire class',
  category: 'fire',
  requirement:
    'Fire safety is documented according to the fire class (BK1–BK4); BK2+ needs a certified fire consultant and documented fire resistance of products.',
  citation: 'BR18 chapter 5 and chapter 28 (brandklasser)',
  requiresEdition: false,
  applicability(ctx) {
    if (ctx.setup.exemptUse === 'small_building')
      return setAside('Small buildings ≤ 50 m² are exempt from class documentation.');
    if (!ctx.setup.fireClass) return undecided([LABEL.fireClass]);
    return applies(`Declared ${ctx.setup.fireClass}.`);
  },
  evidence(ctx) {
    const bk = Number(ctx.setup.fireClass?.slice(2) ?? 1);
    const items: EvidenceRequirement[] = [
      {
        key: 'fire-strategy',
        kind: 'FIRE_DOC',
        title: 'Fire strategy report',
        description: 'Escape routes, fire sections and firefighting access.',
      },
    ];
    if (bk >= 2) {
      items.push(
        {
          key: 'certified-fire',
          kind: 'CERTIFICATE',
          title: 'Certified fire consultant statement',
          description: 'Statement from a certified fire consultant (certificeret brandrådgiver).',
        },
        {
          key: 'fire-resistance',
          kind: 'FIRE_DOC',
          title: 'Fire-resistance documentation of products',
          description:
            'Euroclass reaction-to-fire and resistance documentation. A selected catalog material can be linked.',
          materialCategories: ['mineral_wool', 'cladding', 'timber'],
        },
      );
    }
    if (bk === 4) {
      items.push({
        key: 'third-party-fire',
        kind: 'CERTIFICATE',
        title: 'Third-party fire review (BK4)',
        description: 'Third-party review of the fire documentation.',
      });
    }
    return items;
  },
  materialFit(material, ctx) {
    if (!['mineral_wool', 'cladding', 'timber'].includes(material.category)) return null;
    const euroclass = material.attributes.euroclass;
    if (!euroclass) return { result: 'INFO', detail: 'No Euroclass declared.' };
    const nonCombustible = euroclass.startsWith('A');
    if (Number(ctx.setup.fireClass?.slice(2) ?? 1) >= 3) {
      return nonCombustible
        ? { result: 'PASS', detail: `Euroclass ${euroclass} (non-combustible) suits ${ctx.setup.fireClass}.` }
        : {
            result: 'FAIL',
            detail: `Euroclass ${euroclass} is combustible — review against ${ctx.setup.fireClass}.`,
          };
    }
    return { result: 'PASS', detail: `Euroclass ${euroclass} documented.` };
  },
};

const landsbyggefonden: DkRule = {
  id: 'DK-FUND-LBF',
  code: 'Almenboligloven §91',
  title: 'Landsbyggefonden renovation support',
  category: 'funding',
  requirement:
    'Social-housing departments can apply to Landsbyggefonden for renovation support; the application needs a comprehensive plan, condition survey, financing plan, tenant approval and municipal approval.',
  citation: 'Almenboligloven §91–§92 (renoveringsstøtte); Landsbyggefonden regulations',
  requiresEdition: false,
  applicability(ctx) {
    if (!ctx.setup.fundingRoute) return undecided([LABEL.fundingRoute]);
    if (ctx.setup.fundingRoute !== 'social_housing') {
      return setAside('Only social-housing (almene) departments can apply to Landsbyggefonden.');
    }
    return applies('Declared social-housing funding route.');
  },
  criteria(ctx) {
    const nature = ctx.setup.projectNature;
    const builtBefore = 1990;
    return [
      {
        label: 'Social-housing department (almen boligafdeling)',
        status: criterion(ctx.setup.fundingRoute === 'social_housing'),
        detail: 'Declared funding route.',
      },
      {
        label: 'Renovation of an existing building',
        status: criterion(nature && RENOVATION_NATURES.includes(nature)),
        detail: nature ? SETUP_OPTION_LABELS.dkProjectNature[nature] : 'Project nature not declared.',
      },
      {
        label: 'Residential building in BBR (use code 1xx)',
        status: criterion(ctx.data.bbrUseCode.startsWith('1')),
        detail: `BBR ${ctx.data.bbrUseCode}: ${ctx.data.bbrUseText}.`,
      },
      {
        label: `Building constructed before ${builtBefore}`,
        status: criterion(ctx.data.yearBuilt === null ? undefined : ctx.data.yearBuilt < builtBefore),
        detail: ctx.data.yearBuilt ? `BBR year built: ${ctx.data.yearBuilt}.` : 'No year built in BBR.',
      },
    ];
  },
  evidence: () => [
    {
      key: 'helhedsplan',
      kind: 'PLAN',
      title: 'Comprehensive renovation plan (helhedsplan)',
      description: 'Scope, phasing and expected effect of the renovation.',
    },
    {
      key: 'condition-survey',
      kind: 'WORKSHEET',
      title: 'Technical condition survey',
      description: 'Documented physical problems the renovation addresses.',
    },
    {
      key: 'financing',
      kind: 'WORKSHEET',
      title: 'Financing plan and budget',
      description: 'Budget, financing sources and rent consequences.',
    },
    {
      key: 'tenant-approval',
      kind: 'DECLARATION',
      title: 'Tenant approval (department meeting resolution)',
      description: 'Minutes showing the tenants approved the project.',
    },
    {
      key: 'municipal-approval',
      kind: 'DECLARATION',
      title: 'Municipal approval',
      description: 'Approval from the municipal council.',
    },
  ],
};

export const denmarkRuleset: Ruleset<DkContext> = {
  jurisdiction: 'DK',
  basisLabel: 'Application date',
  editions: DK_EDITIONS,
  basisDate: (input) => (input.setup.jurisdiction === 'DK' ? input.setup.applicationDate : undefined),
  unmodelledEditionNote:
    'The application date precedes BR18 (1 July 2018); earlier regulations (BR15) are not modelled.',
  toContext(input, edition) {
    if (
      input.setup.jurisdiction !== 'DK' ||
      input.measurements.jurisdiction !== 'DK' ||
      input.property.data.jurisdiction !== 'DK'
    ) {
      throw new Error('Denmark ruleset received non-Danish project data');
    }
    return {
      setup: input.setup,
      measurements: input.measurements,
      data: input.property.data,
      overlays: input.property.overlays,
      edition,
      selectedMaterials: input.selectedMaterials,
      today: input.today,
    };
  },
  rules: [
    authority,
    lcaDocumentation,
    climateLimitRule,
    constructionProcess,
    energyFrame,
    renovationComponents,
    fossilHeating,
    structural,
    fire,
    landsbyggefonden,
  ],
};
