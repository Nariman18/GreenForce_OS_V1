'use client';

import {
  type AuditEvent,
  apiPaths,
  type ComplianceResult,
  type CreateProjectRequest,
  type EvidenceItem,
  type FundingResponse,
  type HealthResponse,
  type Jurisdiction,
  type LinkMaterialEvidenceRequest,
  type LivePassport,
  type LoginRequest,
  type PassportSnapshot,
  type PassportSnapshotSummary,
  type ProjectDetail,
  type ProjectMaterialsResponse,
  type ProjectMeasurements,
  type ProjectSetup,
  type ProjectSummary,
  type PropertyCandidate,
  type PropertyPreview,
  type User,
} from '@greenforce/shared';
import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './api-client';

/** Query keys. Everything derived from one project is keyed under ['project', id] so it can be invalidated together. */
export const queryKeys = {
  me: ['me'] as const,
  health: ['health'] as const,
  projects: ['projects'] as const,
  search: (jurisdiction: Jurisdiction, q: string) => ['property-search', jurisdiction, q] as const,
  preview: (jurisdiction: Jurisdiction, sourceRef: string) =>
    ['property-preview', jurisdiction, sourceRef] as const,
  project: (id: string) => ['project', id] as const,
  compliance: (id: string) => ['project', id, 'compliance'] as const,
  materials: (id: string) => ['project', id, 'materials'] as const,
  funding: (id: string) => ['project', id, 'funding'] as const,
  passport: (id: string) => ['project', id, 'passport'] as const,
  snapshots: (id: string) => ['project', id, 'snapshots'] as const,
  snapshot: (id: string, version: number) => ['project', id, 'snapshots', version] as const,
  history: (id: string) => ['project', id, 'history'] as const,
};

/** Any change to a project can change its verdicts, readiness, passport and the dashboard. */
export function invalidateProject(queryClient: QueryClient, id: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.project(id) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  ]);
}

/* ── Session ─────────────────────────────────────────────────────────── */

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: () => api.get<User>(apiPaths.me()) });

export const useHealth = () =>
  useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.get<HealthResponse>(apiPaths.health()),
    staleTime: 60_000,
  });

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => api.post<User>(apiPaths.login(), body),
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>(apiPaths.logout()),
    onSuccess: () => queryClient.clear(),
  });
}

export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>(apiPaths.demoReset()),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/* ── Properties & projects ───────────────────────────────────────────── */

export const usePropertySearch = (jurisdiction: Jurisdiction, q: string) =>
  useQuery({
    queryKey: queryKeys.search(jurisdiction, q),
    queryFn: () => api.get<PropertyCandidate[]>(apiPaths.propertySearch(jurisdiction, q)),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  });

export const usePropertyPreview = (jurisdiction: Jurisdiction, sourceRef: string | null) =>
  useQuery({
    queryKey: queryKeys.preview(jurisdiction, sourceRef ?? ''),
    queryFn: () => api.get<PropertyPreview>(apiPaths.propertyResolve(jurisdiction, sourceRef!)),
    enabled: sourceRef !== null,
  });

export const useProjects = () =>
  useQuery({ queryKey: queryKeys.projects, queryFn: () => api.get<ProjectSummary[]>(apiPaths.projects()) });

export const useProject = (id: string) =>
  useQuery({ queryKey: queryKeys.project(id), queryFn: () => api.get<ProjectDetail>(apiPaths.project(id)) });

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProjectRequest) => api.post<ProjectDetail>(apiPaths.projects(), body),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(project.id), project);
      return queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useSaveSetup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setup: ProjectSetup) => api.put<ProjectDetail>(apiPaths.projectSetup(id), setup),
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

export function useSaveMeasurements(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (measurements: ProjectMeasurements) =>
      api.put<ProjectDetail>(apiPaths.projectMeasurements(id), measurements),
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

/* ── Compliance, evidence, materials, funding, passport ──────────────── */

export const useCompliance = (id: string) =>
  useQuery({
    queryKey: queryKeys.compliance(id),
    queryFn: () => api.get<ComplianceResult>(apiPaths.compliance(id)),
  });

export function useUploadEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ruleId: string; requirementKey: string; file: File; note?: string }) => {
      const form = new FormData();
      form.set('ruleId', input.ruleId);
      form.set('requirementKey', input.requirementKey);
      if (input.note) form.set('note', input.note);
      form.set('file', input.file);
      return api.post<EvidenceItem>(apiPaths.evidence(id), form);
    },
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

export function useLinkMaterialEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LinkMaterialEvidenceRequest) =>
      api.post<EvidenceItem>(apiPaths.evidenceLinkMaterial(id), body),
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

export function useVerifyEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evidenceId, verified }: { evidenceId: string; verified: boolean }) =>
      api.patch<EvidenceItem>(apiPaths.evidenceVerify(id, evidenceId), { verified }),
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

export function useRemoveEvidence(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) => api.delete<void>(apiPaths.evidenceItem(id, evidenceId)),
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

export const useProjectMaterials = (id: string) =>
  useQuery({
    queryKey: queryKeys.materials(id),
    queryFn: () => api.get<ProjectMaterialsResponse>(apiPaths.projectMaterials(id)),
  });

export function useToggleMaterial(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ materialId, select }: { materialId: string; select: boolean }) =>
      select
        ? api.post<ProjectMaterialsResponse>(apiPaths.projectMaterial(id, materialId))
        : api.delete<ProjectMaterialsResponse>(apiPaths.projectMaterial(id, materialId)),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.materials(id), data);
      await invalidateProject(queryClient, id);
    },
  });
}

export const useFunding = (id: string) =>
  useQuery({
    queryKey: queryKeys.funding(id),
    queryFn: () => api.get<FundingResponse>(apiPaths.funding(id)),
  });

export const usePassport = (id: string) =>
  useQuery({ queryKey: queryKeys.passport(id), queryFn: () => api.get<LivePassport>(apiPaths.passport(id)) });

export const useSnapshots = (id: string) =>
  useQuery({
    queryKey: queryKeys.snapshots(id),
    queryFn: () => api.get<PassportSnapshotSummary[]>(apiPaths.passportSnapshots(id)),
  });

export const useSnapshot = (id: string, version: number | null) =>
  useQuery({
    queryKey: queryKeys.snapshot(id, version ?? 0),
    queryFn: () => api.get<PassportSnapshot>(apiPaths.passportSnapshot(id, version!)),
    enabled: version !== null,
  });

export function useIssueSnapshot(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) =>
      api.post<PassportSnapshotSummary>(apiPaths.passportSnapshots(id), note ? { note } : {}),
    onSuccess: () => invalidateProject(queryClient, id),
  });
}

export const useHistory = (id: string) =>
  useQuery({ queryKey: queryKeys.history(id), queryFn: () => api.get<AuditEvent[]>(apiPaths.history(id)) });
