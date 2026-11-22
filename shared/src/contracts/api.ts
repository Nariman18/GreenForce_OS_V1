import type { Jurisdiction } from '../constants/domain.js';

/**
 * REST contract between apps/web and apps/api.
 * Paths are relative to the origin; the web app reaches the API through a same-origin rewrite of API_PREFIX.
 * Request/response bodies are described by the schemas exported next to this file:
 *
 *   GET    /health                                   → HealthResponse
 *   POST   /auth/login            LoginRequest       → User          (sets session cookie)
 *   POST   /auth/logout                              → 204           (clears session cookie)
 *   GET    /auth/me                                  → User
 *   GET    /properties/search     ?jurisdiction&q    → PropertyCandidate[]
 *   GET    /properties/resolve    ?jurisdiction&sourceRef → PropertyPreview
 *   GET    /projects                                 → ProjectSummary[]
 *   POST   /projects              CreateProjectRequest → ProjectDetail
 *   GET    /projects/:id                             → ProjectDetail
 *   PUT    /projects/:id/setup    ProjectSetup       → ProjectDetail
 *   PUT    /projects/:id/measurements ProjectMeasurements → ProjectDetail
 *   GET    /projects/:id/compliance                  → ComplianceResult
 *   POST   /projects/:id/evidence multipart(file + UploadEvidenceFields) → EvidenceItem
 *   POST   /projects/:id/evidence/link-material LinkMaterialEvidenceRequest → EvidenceItem
 *   PATCH  /projects/:id/evidence/:evidenceId/verify VerifyEvidenceRequest → EvidenceItem
 *   DELETE /projects/:id/evidence/:evidenceId         → 204
 *   GET    /projects/:id/evidence/:evidenceId/file    → file download
 *   GET    /materials             ?jurisdiction&category → Material[]
 *   GET    /projects/:id/materials                   → ProjectMaterialsResponse
 *   POST   /projects/:id/materials/:materialId       → ProjectMaterialsResponse
 *   DELETE /projects/:id/materials/:materialId       → ProjectMaterialsResponse
 *   GET    /projects/:id/funding                     → FundingResponse
 *   GET    /projects/:id/passport                    → LivePassport
 *   GET    /projects/:id/passport/snapshots          → PassportSnapshotSummary[]
 *   POST   /projects/:id/passport/snapshots IssueSnapshotRequest → PassportSnapshotSummary
 *   GET    /projects/:id/passport/snapshots/:version → PassportSnapshot
 *   GET    /projects/:id/history                     → AuditEvent[]
 *   POST   /demo/reset                               → 204           (DEMO_MODE only)
 *
 * Errors always use ApiError.
 */
export const API_PREFIX = '/api/v1';

export const SESSION_COOKIE_NAME = 'gf_session';

const qs = (params: Record<string, string | undefined>): string => {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined);
  if (!entries.length) return '';
  const pairs = entries.map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value));
  return '?' + pairs.join('&');
};

export const apiPaths = {
  health: () => '/health',
  login: () => '/auth/login',
  logout: () => '/auth/logout',
  me: () => '/auth/me',
  propertySearch: (jurisdiction: Jurisdiction, q: string) => `/properties/search${qs({ jurisdiction, q })}`,
  propertyResolve: (jurisdiction: Jurisdiction, sourceRef: string) =>
    `/properties/resolve${qs({ jurisdiction, sourceRef })}`,
  projects: () => '/projects',
  project: (id: string) => `/projects/${id}`,
  projectSetup: (id: string) => `/projects/${id}/setup`,
  projectMeasurements: (id: string) => `/projects/${id}/measurements`,
  compliance: (id: string) => `/projects/${id}/compliance`,
  evidence: (id: string) => `/projects/${id}/evidence`,
  evidenceLinkMaterial: (id: string) => `/projects/${id}/evidence/link-material`,
  evidenceVerify: (id: string, evidenceId: string) => `/projects/${id}/evidence/${evidenceId}/verify`,
  evidenceItem: (id: string, evidenceId: string) => `/projects/${id}/evidence/${evidenceId}`,
  evidenceFile: (id: string, evidenceId: string) => `/projects/${id}/evidence/${evidenceId}/file`,
  materials: (params: { jurisdiction?: Jurisdiction; category?: string } = {}) => `/materials${qs(params)}`,
  projectMaterials: (id: string) => `/projects/${id}/materials`,
  projectMaterial: (id: string, materialId: string) => `/projects/${id}/materials/${materialId}`,
  funding: (id: string) => `/projects/${id}/funding`,
  passport: (id: string) => `/projects/${id}/passport`,
  passportSnapshots: (id: string) => `/projects/${id}/passport/snapshots`,
  passportSnapshot: (id: string, version: number) => `/projects/${id}/passport/snapshots/${version}`,
  history: (id: string) => `/projects/${id}/history`,
  demoReset: () => '/demo/reset',
} as const;
