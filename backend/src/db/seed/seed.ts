import type { ProjectMeasurements, ProjectSetup, User } from '@greenforce/shared';
import bcrypt from 'bcryptjs';
import type { AppConfig } from '../../config/env.js';
import { AuditService } from '../../modules/audit/audit.service.js';
import { BCRYPT_ROUNDS } from '../../modules/auth/auth.service.js';
import { ComplianceService } from '../../modules/compliance/compliance.service.js';
import { EvidenceService } from '../../modules/evidence/evidence.service.js';
import { FileStorageService } from '../../modules/evidence/file-storage.service.js';
import { MaterialsService } from '../../modules/materials/materials.service.js';
import { PassportService } from '../../modules/passport/passport.service.js';
import { ProjectsRepository } from '../../modules/projects/projects.repository.js';
import { ProjectsService } from '../../modules/projects/projects.service.js';
import { DemoPropertyProvider } from '../../modules/properties/demo/demo-property.provider.js';
import { PropertiesService } from '../../modules/properties/properties.service.js';
import { toDateColumn } from '../../common/clock.js';
import type { Database } from '../prisma.js';
import { MATERIALS, SUPPLIERS } from './catalog.js';
import { demoPdf } from './demo-pdf.js';

interface DemoEvidence {
  ruleId: string;
  requirementKey: string;
  title: string;
  lines: string[];
  verified?: boolean;
}

interface DemoProject {
  name: string;
  jurisdiction: 'DK' | 'DE';
  sourceRef: string;
  setup: ProjectSetup;
  measurements: ProjectMeasurements;
  materials: string[];
  evidence: DemoEvidence[];
  issuePassport?: string;
}

const DEMO_PROJECTS: DemoProject[] = [
  {
    name: 'Tingbjerg Block C — social housing renovation',
    jurisdiction: 'DK',
    sourceRef: 'dk-tingbjerg-12',
    setup: {
      jurisdiction: 'DK',
      projectNature: 'major_renovation',
      buildingType: 'multi_storey_residential',
      heating: 'district_heating',
      fundingRoute: 'social_housing',
      constructionClass: 'CC2',
      fireClass: 'BK2',
      exemptUse: 'none',
      applicationDate: '2026-03-02',
      grossFloorAreaM2: 6840,
    },
    measurements: { jurisdiction: 'DK' },
    materials: ['Stone wool batt 37', 'Triple-glazed timber-aluminium window'],
    evidence: [
      {
        ruleId: 'DK-FUND-LBF',
        requirementKey: 'helhedsplan',
        title: 'Helhedsplan - Tingbjerg Block C',
        lines: ['Scope: facade insulation, windows, ventilation, accessibility.', 'Phasing: 2026-2028.'],
        verified: true,
      },
      {
        ruleId: 'DK-FUND-LBF',
        requirementKey: 'condition-survey',
        title: 'Technical condition survey',
        lines: ['Moisture damage in gable walls; single-glazed stairwells.', 'Survey date: 2025-11-14.'],
      },
      {
        ruleId: 'DK-ENERGY-RENO',
        requirementKey: 'u-values',
        title: 'U-value documentation',
        lines: ['External walls after renovation: U = 0.18 W/m2K.', 'Windows: Uw = 0.78 W/m2K.'],
      },
    ],
    issuePassport: 'Pre-application record for the Landsbyggefonden meeting',
  },
  {
    name: 'Nordhavn Pier 7 — office new build',
    jurisdiction: 'DK',
    sourceRef: 'dk-nordhavn-sandkaj-7',
    setup: {
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
    },
    measurements: {
      jurisdiction: 'DK',
      lcaGwpTotal: 8.1,
      lcaConstructionProcess: 1.2,
      energyDemandKwh: 38.5,
    },
    materials: ['Standard ready-mix C30/37 (CEM I)', 'CLT panel, spruce (5-layer)'],
    evidence: [
      {
        ruleId: 'DK-LCA-DOC',
        requirementKey: 'lca-report',
        title: 'LCAbyg report - Nordhavn Pier 7',
        lines: ['Reference period: 50 years.', 'Result: 8.1 kg CO2e/m2/year (limit 7.5).'],
      },
      {
        ruleId: 'DK-STRUCT',
        requirementKey: 'structural-report',
        title: 'Structural documentation report',
        lines: ['Hybrid concrete core with CLT floor slabs.', 'Construction class CC3.'],
      },
    ],
  },
  {
    name: 'Berlin Mitte Offices — Invalidenstraße 7',
    jurisdiction: 'DE',
    sourceRef: 'de-berlin-invalidenstrasse-7',
    setup: {
      jurisdiction: 'DE',
      projectNature: 'new_build',
      buildingType: 'office',
      fundingRoute: 'private',
      buildingClass: 'GK5',
      applicationDate: '2026-03-01',
      grossFloorAreaM2: 11700,
      energyTargetKwh: 50,
    },
    measurements: { jurisdiction: 'DE', energyDemandKwh: 68 },
    materials: ['Recycled-content steel sections S355 (EAF)'],
    evidence: [
      {
        ruleId: 'DE-ENERGY',
        requirementKey: 'energy-report',
        title: 'Energy design report - Berlin Mitte Offices',
        lines: [
          'Design demand: 68 kWh/m2/year.',
          'Project target: 50 kWh/m2/year; not a statutory threshold.',
        ],
      },
      {
        ruleId: 'DE-FIRE',
        requirementKey: 'fire-strategy',
        title: 'Fire strategy - Berlin Mitte Offices',
        lines: ['Building class GK5 declared.', 'State-specific requirements require professional review.'],
        verified: true,
      },
    ],
  },
];

export interface SeedResult {
  user: User;
  projects: number;
  materials: number;
}

/**
 * Removes all stored files and every row except users (so a reset keeps the current session valid).
 * Files go first: if that fails, the database is left untouched.
 */
export async function clearDemoData(db: Database, storage: FileStorageService): Promise<void> {
  await storage.clear();
  // Deleting projects cascades to evidence, passport versions, material selections and history.
  await db.$transaction([
    db.project.deleteMany(),
    db.property.deleteMany(),
    db.material.deleteMany(),
    db.supplier.deleteMany(),
  ]);
}

async function upsertDemoUser(db: Database, config: AppConfig): Promise<User> {
  if (!config.DEMO_USER_PASSWORD) {
    throw new Error('DEMO_USER_PASSWORD must be set to seed the demo account');
  }
  const passwordHash = await bcrypt.hash(config.DEMO_USER_PASSWORD, BCRYPT_ROUNDS);
  const profile = { name: 'Nariman Aliyev', organization: 'Nariman Inc. Builders (demo)', passwordHash };
  const row = await db.user.upsert({
    where: { email: config.DEMO_USER_EMAIL.toLowerCase() },
    update: profile,
    create: { email: config.DEMO_USER_EMAIL.toLowerCase(), ...profile },
  });
  return { id: row.id, email: row.email, name: row.name, organization: row.organization };
}

/**
 * Seeds the catalog and demo projects. Idempotent: does nothing if the catalog already exists,
 * unless `reset` is set, in which case existing demo data is replaced.
 */
export async function seedDemo(
  db: Database,
  config: AppConfig,
  options: { reset?: boolean } = {},
): Promise<SeedResult | null> {
  const storage = new FileStorageService(config);
  if (options.reset) await clearDemoData(db, storage);
  else if ((await db.supplier.count()) > 0) return null;

  const user = await upsertDemoUser(db, config);

  const supplierIds = new Map<string, string>();
  for (const { documentationValidTo, additionalInfoNote, ...supplier } of SUPPLIERS) {
    const row = await db.supplier.create({
      data: {
        ...supplier,
        documentationValidTo: toDateColumn(documentationValidTo),
        additionalInfoRequired: Boolean(additionalInfoNote),
        additionalInfoNote: additionalInfoNote ?? null,
      },
    });
    supplierIds.set(supplier.name, row.id);
  }
  const materialIds = new Map<string, string>();
  for (const material of MATERIALS) {
    const row = await db.material.create({
      data: {
        supplierId: supplierIds.get(material.supplier)!,
        name: material.name,
        manufacturer: material.manufacturer,
        category: material.category,
        description: material.description,
        declaredUnit: material.declaredUnit,
        gwp: material.gwp,
        gwpUnit: material.gwpUnit,
        epdNumber: material.epd?.number ?? null,
        epdProgramOperator: material.epd?.programOperator ?? null,
        epdValidFrom: material.epd ? toDateColumn(material.epd.validFrom) : null,
        epdValidTo: material.epd ? toDateColumn(material.epd.validTo) : null,
        attributes: material.attributes,
        regions: material.regions,
      },
    });
    materialIds.set(material.name, row.id);
  }

  // Seed through the real services so history, hashes and validation match what users produce.
  const audit = new AuditService(db);
  const repository = new ProjectsRepository(db);
  const compliance = new ComplianceService(repository);
  const projectsService = new ProjectsService(
    db,
    repository,
    new PropertiesService(db, new DemoPropertyProvider()),
    compliance,
    audit,
  );
  const evidenceService = new EvidenceService(db, compliance, repository, storage, audit);
  const materialsService = new MaterialsService(db, compliance, repository, audit);
  const passportService = new PassportService(db, compliance, repository, audit);

  for (const demo of DEMO_PROJECTS) {
    const project = await projectsService.create(user, {
      jurisdiction: demo.jurisdiction,
      sourceRef: demo.sourceRef,
      name: demo.name,
    });
    await projectsService.updateSetup(user, project.id, demo.setup);
    await projectsService.updateMeasurements(user, project.id, demo.measurements);
    for (const name of demo.materials) {
      await materialsService.select(user, project.id, materialIds.get(name)!);
    }
    for (const item of demo.evidence) {
      const data = demoPdf(item.title, item.lines);
      const uploaded = await evidenceService.upload(
        user,
        project.id,
        { ruleId: item.ruleId, requirementKey: item.requirementKey },
        { originalname: `${item.title}.pdf`, mimetype: 'application/pdf', size: data.length, buffer: data },
      );
      if (item.verified) await evidenceService.setVerified(user, project.id, uploaded.id, true);
    }
    if (demo.issuePassport) await passportService.issue(user, project.id, demo.issuePassport);
  }

  const projectCount = await db.project.count({ where: { ownerId: user.id } });
  return { user, projects: projectCount, materials: MATERIALS.length };
}
