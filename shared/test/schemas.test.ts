import { describe, expect, it } from 'vitest';
import {
  apiPaths,
  CreateProjectRequestSchema,
  LoginRequestSchema,
  ProjectMeasurementsSchema,
  ProjectSetupSchema,
  PropertySearchQuerySchema,
  UploadEvidenceFieldsSchema,
  VERDICT_LABELS,
  VERDICTS,
} from '../src/index.js';

describe('LoginRequestSchema', () => {
  it('normalises the email', () => {
    const parsed = LoginRequestSchema.parse({ email: '  Demo@GreenForce.dev ', password: 'secret-pass' });
    expect(parsed.email).toBe('demo@greenforce.dev');
  });

  it('rejects short passwords and invalid emails', () => {
    const result = LoginRequestSchema.safeParse({ email: 'nope', password: 'short' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(['email', 'password']);
  });
});

describe('ProjectSetupSchema', () => {
  it('accepts a partial Danish setup', () => {
    const parsed = ProjectSetupSchema.parse({ jurisdiction: 'DK', projectNature: 'new_build' });
    expect(parsed).toEqual({ jurisdiction: 'DK', projectNature: 'new_build' });
  });

  it('rejects invalid project natures and strips unknown keys', () => {
    expect(
      ProjectSetupSchema.safeParse({ jurisdiction: 'DE', projectNature: 'new_construction' }).success,
    ).toBe(false);
    expect(ProjectSetupSchema.safeParse({ jurisdiction: 'DK', unknownField: 'example' }).success).toBe(true); // unknown keys are stripped
  });

  it('validates dates and areas', () => {
    expect(ProjectSetupSchema.safeParse({ jurisdiction: 'DE', applicationDate: '2025-13-01' }).success).toBe(
      false,
    );
    expect(ProjectSetupSchema.safeParse({ jurisdiction: 'DE', grossFloorAreaM2: 0 }).success).toBe(false);
    expect(ProjectSetupSchema.safeParse({ jurisdiction: 'DE', applicationDate: '2025-03-01' }).success).toBe(
      true,
    );
  });
});

describe('ProjectMeasurementsSchema', () => {
  it('bounds energy measurements', () => {
    expect(ProjectMeasurementsSchema.safeParse({ jurisdiction: 'DE', energyDemandKwh: -1 }).success).toBe(
      false,
    );
    expect(ProjectMeasurementsSchema.safeParse({ jurisdiction: 'DE', energyDemandKwh: 45 }).success).toBe(
      true,
    );
  });
});

describe('request schemas', () => {
  it('requires a meaningful project name', () => {
    expect(
      CreateProjectRequestSchema.safeParse({ jurisdiction: 'DK', sourceRef: 'x', name: 'ab' }).success,
    ).toBe(false);
  });

  it('trims search text', () => {
    expect(PropertySearchQuerySchema.parse({ jurisdiction: 'DE', q: '  berlin ' }).q).toBe('berlin');
  });

  it('limits evidence notes', () => {
    expect(
      UploadEvidenceFieldsSchema.safeParse({ ruleId: 'r', requirementKey: 'k', note: 'x'.repeat(501) })
        .success,
    ).toBe(false);
  });
});

describe('contracts', () => {
  it('labels every verdict', () => {
    for (const verdict of VERDICTS) expect(VERDICT_LABELS[verdict]).toBeTruthy();
  });

  it('builds encoded query strings', () => {
    expect(apiPaths.propertySearch('DK', 'Tingbjerg Allé')).toBe(
      '/properties/search?jurisdiction=DK&q=Tingbjerg%20All%C3%A9',
    );
    expect(apiPaths.materials()).toBe('/materials');
  });
});
