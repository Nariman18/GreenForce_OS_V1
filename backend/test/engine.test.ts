import type { EvidenceItem, ProjectMeasurements, ProjectSetup } from '@greenforce/shared';
import { describe, expect, it } from 'vitest';
import {
  computeReadiness,
  evaluate,
  materialFits,
  resolveEdition,
  rulesetFor,
} from '../src/modules/compliance/engine/engine.js';
import type { EngineMaterial, EvaluationInput } from '../src/modules/compliance/engine/types.js';
import { DEMO_PROPERTIES } from '../src/modules/properties/demo/fixtures.js';

const property = (sourceRef: string) => {
  const found = DEMO_PROPERTIES.find((candidate) => candidate.sourceRef === sourceRef)!;
  return { data: found.data, overlays: found.overlays };
};

function input(
  sourceRef: string,
  setup: ProjectSetup,
  measurements: ProjectMeasurements,
  extra: Partial<EvaluationInput> = {},
): EvaluationInput {
  return {
    projectId: '00000000-0000-4000-8000-000000000001',
    setup,
    measurements,
    property: property(sourceRef),
    evidence: [],
    selectedMaterials: [],
    today: '2026-10-26',
    ...extra,
  };
}

const rule = (result: ReturnType<typeof evaluate>, id: string) =>
  result.rules.find((entry) => entry.ruleId === id)!;

const evidenceItem = (ruleId: string, requirementKey: string, verified = false): EvidenceItem => ({
  id: crypto.randomUUID(),
  ruleId,
  requirementKey,
  kind: 'LCA_REPORT',
  source: 'upload',
  fileName: 'doc.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 100,
  sha256: 'a'.repeat(64),
  note: null,
  materialId: null,
  verified,
  verifiedAt: null,
  uploadedBy: 'Test',
  createdAt: '2026-10-01T10:00:00.000Z',
});

const NORDHAVN_OFFICE: ProjectSetup = {
  jurisdiction: 'DK',
  projectNature: 'new_build',
  buildingType: 'office',
  heating: 'district_heating',
  fundingRoute: 'private',
  constructionClass: 'CC3',
  fireClass: 'BK3',
  exemptUse: 'none',
  applicationDate: '2025-09-15',
  grossFloorAreaM2: 4200,
};

describe('edition resolution', () => {
  const dk = rulesetFor('DK');

  it('selects the edition in force on the application date', () => {
    expect(resolveEdition(dk, '2022-12-31').edition?.id).toBe('BR18-2018');
    expect(resolveEdition(dk, '2023-01-01').edition?.id).toBe('BR18-2023');
    expect(resolveEdition(dk, '2025-07-01').edition?.id).toBe('BR18-2025');
  });

  it('explains a missing or unmodelled date', () => {
    expect(resolveEdition(dk, undefined).note).toMatch(/application date/i);
    expect(resolveEdition(dk, '2017-01-01').note).toMatch(/BR15/);
  });

  it('makes edition-dependent rules "can\'t decide" until the date is declared', () => {
    const result = evaluate(input('dk-nordhavn-sandkaj-7', { jurisdiction: 'DK' }, { jurisdiction: 'DK' }));
    expect(result.edition).toBeNull();
    expect(rule(result, 'DK-LCA-LIMIT').verdict).toBe('CANT_DECIDE');
    expect(rule(result, 'DK-LCA-LIMIT').missingFacts).toEqual(['Application date']);
    expect(rule(result, 'DK-AUTH').verdict).toBe('CONFIRMED');
  });
});

describe('Denmark — BR18 climate requirements', () => {
  it('fails an office over the 2025 limit and says what to fix', () => {
    const result = evaluate(
      input('dk-nordhavn-sandkaj-7', NORDHAVN_OFFICE, { jurisdiction: 'DK', lcaGwpTotal: 8.1 }),
    );
    const limit = rule(result, 'DK-LCA-LIMIT');
    expect(result.edition?.id).toBe('BR18-2025');
    expect(limit.check).toMatchObject({ status: 'FAIL', limit: 7.5, measured: 8.1 });
    expect(limit.verdict).toBe('FAILS');
    expect(limit.nextAction).toMatch(/Reduce climate impact by 0\.6/);
    expect(result.fixList[0]?.verdict).toBe('FAILS');
  });

  it('applies the 12.0 limit only above 1,000 m² in the 2023 edition', () => {
    const small = evaluate(
      input(
        'dk-nordhavn-sandkaj-7',
        { ...NORDHAVN_OFFICE, applicationDate: '2024-03-01', grossFloorAreaM2: 900 },
        { jurisdiction: 'DK' },
      ),
    );
    expect(rule(small, 'DK-LCA-LIMIT').applicability).toBe('SET_ASIDE');
    expect(rule(small, 'DK-LCA-DOC').applicability).toBe('APPLIES');

    const large = evaluate(
      input(
        'dk-nordhavn-sandkaj-7',
        { ...NORDHAVN_OFFICE, applicationDate: '2024-03-01' },
        { jurisdiction: 'DK', lcaGwpTotal: 11 },
      ),
    );
    expect(rule(large, 'DK-LCA-LIMIT').check).toMatchObject({ status: 'PASS', limit: 12 });
  });

  it('sets climate rules aside for renovations and exempt uses', () => {
    const renovation = evaluate(
      input(
        'dk-tingbjerg-12',
        { ...NORDHAVN_OFFICE, projectNature: 'major_renovation', buildingType: 'multi_storey_residential' },
        { jurisdiction: 'DK' },
      ),
    );
    expect(rule(renovation, 'DK-LCA-DOC').applicability).toBe('SET_ASIDE');
    expect(rule(renovation, 'DK-ENERGY-RENO').applicability).toBe('APPLIES');

    const exempt = evaluate(
      input('dk-nordhavn-sandkaj-7', { ...NORDHAVN_OFFICE, exemptUse: 'temporary' }, { jurisdiction: 'DK' }),
    );
    expect(rule(exempt, 'DK-LCA-LIMIT').reason).toMatch(/Exempt use/);
  });

  it('fails a new oil boiler', () => {
    const result = evaluate(
      input('dk-aarhus-skovvangen-23', { ...NORDHAVN_OFFICE, heating: 'oil' }, { jurisdiction: 'DK' }),
    );
    expect(rule(result, 'DK-HEATING').verdict).toBe('FAILS');
  });

  it('scales structural evidence with the construction class', () => {
    const cc1 = evaluate(
      input(
        'dk-nordhavn-sandkaj-7',
        { ...NORDHAVN_OFFICE, constructionClass: 'CC1' },
        { jurisdiction: 'DK' },
      ),
    );
    const cc4 = evaluate(
      input(
        'dk-nordhavn-sandkaj-7',
        { ...NORDHAVN_OFFICE, constructionClass: 'CC4' },
        { jurisdiction: 'DK' },
      ),
    );
    expect(rule(cc1, 'DK-STRUCT').evidence.map((entry) => entry.requirement.key)).toEqual([
      'structural-report',
      'owner-declaration',
    ]);
    expect(rule(cc4, 'DK-STRUCT').evidence).toHaveLength(4);
  });
});

describe('Denmark — Landsbyggefonden', () => {
  const setup: ProjectSetup = {
    ...NORDHAVN_OFFICE,
    projectNature: 'major_renovation',
    buildingType: 'multi_storey_residential',
    fundingRoute: 'social_housing',
  };

  it('is eligible for an old social-housing block and tracks information requirements', () => {
    const result = evaluate(
      input(
        'dk-tingbjerg-12',
        setup,
        { jurisdiction: 'DK' },
        { evidence: [evidenceItem('DK-FUND-LBF', 'helhedsplan', true)] },
      ),
    );
    const lbf = rule(result, 'DK-FUND-LBF');
    expect(lbf.criteria.every((criterion) => criterion.status === 'MET')).toBe(true);
    expect(lbf.verdict).toBe('PROOF_IN_PROGRESS');
    expect(lbf.evidence[0]?.status).toBe('VERIFIED');
  });

  it('fails eligibility for a new build and sets it aside for private funding', () => {
    const newBuild = evaluate(
      input('dk-tingbjerg-12', { ...setup, projectNature: 'new_build' }, { jurisdiction: 'DK' }),
    );
    expect(rule(newBuild, 'DK-FUND-LBF').verdict).toBe('FAILS');
    const privateFunding = evaluate(
      input('dk-tingbjerg-12', { ...setup, fundingRoute: 'private' }, { jurisdiction: 'DK' }),
    );
    expect(rule(privateFunding, 'DK-FUND-LBF').verdict).toBeNull();
  });
});

describe('Germany — documentation and project targets', () => {
  const office: ProjectSetup = {
    jurisdiction: 'DE',
    projectNature: 'new_build',
    buildingType: 'office',
    fundingRoute: 'private',
    buildingClass: 'GK5',
    applicationDate: '2026-03-01',
    grossFloorAreaM2: 11700,
    energyTargetKwh: 50,
  };
  it('resolves the demo version and checks a project target, not a statutory limit', () => {
    const result = evaluate(
      input('de-berlin-invalidenstrasse-7', office, { jurisdiction: 'DE', energyDemandKwh: 68 }),
    );
    expect(result.edition?.id).toBe('DE-DEMO-2024');
    expect(rule(result, 'DE-ENERGY').check).toMatchObject({ status: 'FAIL', measured: 68, limit: 50 });
    expect(rule(result, 'DE-ENERGY').check?.label).toMatch(/not a statutory/);
    expect(result.fixList[0]?.ruleId).toBe('DE-ENERGY');
    const passing = evaluate(
      input('de-berlin-invalidenstrasse-7', office, { jurisdiction: 'DE', energyDemandKwh: 45 }),
    );
    expect(rule(passing, 'DE-ENERGY').check?.status).toBe('PASS');
  });
  it('keeps checks undecided when dates, targets or measurements are missing', () => {
    const missingDate = evaluate(
      input(
        'de-berlin-invalidenstrasse-7',
        { ...office, applicationDate: undefined },
        { jurisdiction: 'DE' },
      ),
    );
    expect(missingDate.edition).toBeNull();
    expect(rule(missingDate, 'DE-ENERGY').verdict).toBe('CANT_DECIDE');
    const missingTarget = evaluate(
      input(
        'de-berlin-invalidenstrasse-7',
        { ...office, energyTargetKwh: undefined },
        { jurisdiction: 'DE', energyDemandKwh: 45 },
      ),
    );
    expect(rule(missingTarget, 'DE-ENERGY').check?.status).toBe('UNDECIDED');
    expect(
      rule(evaluate(input('de-berlin-invalidenstrasse-7', office, { jurisdiction: 'DE' })), 'DE-ENERGY').check
        ?.status,
    ).toBe('UNDECIDED');
    expect(resolveEdition(rulesetFor('DE'), '2023-12-31').edition).toBeNull();
    expect(resolveEdition(rulesetFor('DE'), '2024-01-01').edition?.id).toBe('DE-DEMO-2024');
  });
  it('uses Berlin heritage and Hamburg flood overlays without assuming a nationwide heritage rule', () => {
    const berlin = evaluate(input('de-berlin-karl-marx-allee-12', office, { jurisdiction: 'DE' }));
    expect(rule(berlin, 'DE-HERITAGE').verdict).toBe('PROOF_MISSING');
    expect(rule(berlin, 'DE-FLOOD').applicability).toBe('SET_ASIDE');
    const hamburg = evaluate(input('de-hamburg-hafenstrasse-23', office, { jurisdiction: 'DE' }));
    expect(rule(hamburg, 'DE-FLOOD').verdict).toBe('PROOF_MISSING');
    expect(rule(hamburg, 'DE-HERITAGE').verdict).toBe('CANT_DECIDE');
  });
  it('scores insulation against the explicitly illustrative Euroclass target', () => {
    const base = input('de-berlin-invalidenstrasse-7', office, { jurisdiction: 'DE' });
    const insulation: EngineMaterial = {
      id: crypto.randomUUID(),
      name: 'Insulation',
      category: 'mineral_wool',
      gwp: 2.6,
      gwpUnit: 'kg CO₂e/m²',
      epdValid: true,
      supplierCounted: true,
      attributes: { euroclass: 'A1' },
    };
    expect(materialFits(base, insulation, evaluate(base))).toEqual([
      expect.objectContaining({ ruleId: 'DE-FIRE', result: 'PASS' }),
    ]);
    expect(materialFits(base, { ...insulation, attributes: {} }, evaluate(base))[0]?.result).toBe('FAIL');
  });
});

describe('verdicts and readiness', () => {
  it('moves from proof missing to pack complete as evidence arrives', () => {
    const base = input(
      'de-berlin-karl-marx-allee-12',
      { jurisdiction: 'DE', projectNature: 'major_renovation', applicationDate: '2026-02-01' },
      { jurisdiction: 'DE' },
    );
    expect(rule(evaluate(base), 'DE-HERITAGE').verdict).toBe('PROOF_MISSING');
    const complete = evaluate({ ...base, evidence: [evidenceItem('DE-HERITAGE', 'heritage-consent')] });
    expect(rule(complete, 'DE-HERITAGE').verdict).toBe('PACK_COMPLETE');
  });

  it('averages the three readiness components', () => {
    const result = evaluate(
      input('dk-nordhavn-sandkaj-7', NORDHAVN_OFFICE, {
        jurisdiction: 'DK',
        lcaGwpTotal: 7,
        energyDemandKwh: 30,
      }),
    );
    const { rulesDecided, proofIn, checksPassing, overall } = result.readiness;
    expect(overall).toBe(Math.round((rulesDecided.pct + proofIn.pct + checksPassing.pct) / 3));
    expect(computeReadiness([])).toMatchObject({ overall: 100 });
  });

  it('counts every rule checked exactly once', () => {
    const result = evaluate(input('dk-tingbjerg-12', { jurisdiction: 'DK' }, { jurisdiction: 'DK' }));
    const { checked, applies, setAside, undecided } = result.summary;
    expect(applies + setAside + undecided).toBe(checked);
    expect(checked).toBe(rulesetFor('DK').rules.length);
  });
});
