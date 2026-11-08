import type {
  AdminStats,
  AuditEntry,
  BenchmarkQuery,
  DocumentDetail,
  DocumentOptions,
  DocumentSummary,
  Experiment,
  Job,
  Judgment,
  Paginated,
  QualitySummary,
  Relationship,
  SearchResponse,
  SystemSettings,
  UploadItem,
  User,
} from "./types";

const API_BASE = "/backend";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData) && init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    if (response.status === 413) {
      detail =
        "The uploaded file exceeds Vercel's 4.5 MB serverless limit. For larger municipal PDF scans (up to 50 MB) with complete Tesseract OCR, upload using the local environment (npm run dev).";
    } else {
      try {
        const body = await response.json();
        if (typeof body.detail === "string") detail = body.detail;
        else if (Array.isArray(body.detail)) {
          detail = body.detail.map((item: { msg?: string }) => item.msg || "Invalid value").join("; ");
        }
      } catch {
        // ignore malformed error bodies
      }
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export interface SearchParams {
  query: string;
  top_k?: number;
  configuration?: string;
  year?: number;
  document_type?: string;
  jurisdiction?: string;
  category?: string;
  document_id?: string;
  min_score?: number;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; token_type: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => apiFetch<User>("/api/auth/me"),
  users: () => apiFetch<User[]>("/api/auth/users"),
  createUser: (payload: { email: string; full_name: string; password: string; role: string }) =>
    apiFetch<User>("/api/auth/users", { method: "POST", body: JSON.stringify(payload) }),

  search: (params: SearchParams) =>
    apiFetch<SearchResponse>("/api/search", {
      method: "POST",
      body: JSON.stringify({
        query: params.query,
        top_k: params.top_k ?? 10,
        configuration: params.configuration ?? "hybrid",
        min_score: params.min_score,
        filters: {
          year: params.year,
          document_type: params.document_type,
          jurisdiction: params.jurisdiction,
          category: params.category,
          document_id: params.document_id,
        },
      }),
    }),

  documentOptions: () => apiFetch<DocumentOptions>("/api/documents/options"),
  documents: (params: {
    q?: string;
    year?: number;
    document_type?: string;
    jurisdiction?: string;
    category?: string;
    page?: number;
    page_size?: number;
  }) => apiFetch<Paginated<DocumentSummary>>(`/api/documents${qs(params)}`),
  document: (id: string) => apiFetch<DocumentDetail>(`/api/documents/${id}`),
  section: (documentId: string, sectionId: string) =>
    apiFetch<{
      section: DocumentDetail["sections"][number];
      chunks: Array<{
        id: string;
        chunk_key: string;
        text: string;
        page_start: number;
        page_end: number;
        verification_status: string;
      }>;
    }>(`/api/documents/${documentId}/sections/${sectionId}`),

  systemInfo: () =>
    apiFetch<{
      name: string;
      version: string;
      documents: number;
      indexed_chunks: number;
      embedding_model: string;
      notice: string;
    }>("/api/system/info"),
  publicStats: () =>
    apiFetch<{ active_documents: number; indexed_sections: number; indexed_chunks: number }>(
      "/api/system/stats",
    ),
  repairOcr: () =>
    apiFetch<{
      status: string;
      documents_updated: number;
      pages_updated: number;
      sections_updated: number;
      chunks_updated: number;
    }>("/api/system/repair-ocr", { method: "POST" }),

  admin: {
    stats: () => apiFetch<AdminStats>("/api/admin/stats"),
    documents: (params: {
      q?: string;
      status?: string;
      year?: number;
      page?: number;
      page_size?: number;
    }) => apiFetch<Paginated<DocumentSummary>>(`/api/admin/documents${qs(params)}`),
    document: (id: string) => apiFetch<DocumentDetail>(`/api/admin/documents/${id}`),
    updateDocument: (id: string, payload: Record<string, unknown>) =>
      apiFetch<DocumentDetail>(`/api/admin/documents/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    upload: async (form: FormData): Promise<{ items: UploadItem[] }> =>
      apiFetch<{ items: UploadItem[] }>("/api/admin/documents/upload", {
        method: "POST",
        body: form,
      }),
    uploadChunk: async (
      form: FormData,
    ): Promise<{ items?: UploadItem[]; status?: string; upload_id?: string; chunk_index?: number }> =>
      apiFetch<{ items?: UploadItem[]; status?: string; upload_id?: string; chunk_index?: number }>(
        "/api/admin/documents/upload-chunk",
        {
          method: "POST",
          body: form,
        },
      ),
    refineOcr: (id: string) =>
      apiFetch<{ message: string; refined_sections: number; total_sections: number }>(
        `/api/admin/documents/${id}/refine-ocr`,
        { method: "POST" },
      ),
    createJob: (id: string, mode: "extract" | "reindex") =>
      apiFetch<Job>(`/api/admin/documents/${id}/jobs?mode=${mode}`, { method: "POST" }),
    retryJob: (jobId: string) =>
      apiFetch<Job>(`/api/admin/jobs/${jobId}/retry`, { method: "POST" }),
    jobs: (params: { status?: string; document_id?: string; page?: number }) =>
      apiFetch<Paginated<Job>>(`/api/admin/jobs${qs(params)}`),
    activate: (id: string, active: boolean) =>
      apiFetch<{ message: string }>(`/api/admin/documents/${id}/activate?active=${active}`, {
        method: "POST",
      }),
    approve: (id: string) =>
      apiFetch<DocumentDetail>(`/api/admin/documents/${id}/approve`, { method: "POST" }),
    deleteDocument: (id: string, confirm: string) =>
      apiFetch<{ message: string }>(
        `/api/admin/documents/${id}${qs({ confirm })}`,
        { method: "DELETE" },
      ),
    ocrQueue: () => apiFetch<DocumentSummary[]>("/api/admin/ocr-queue"),
    correctPage: (
      id: string,
      page: number,
      payload: { corrected_text: string; reason?: string; approve?: boolean },
    ) =>
      apiFetch(`/api/admin/documents/${id}/pages/${page}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    correctSection: (id: string, sectionId: string, payload: { corrected_text: string; reason?: string }) =>
      apiFetch<{ section: { id: string; verification_status: string; chunk_count: number }; message: string }>(
        `/api/admin/documents/${id}/sections/${sectionId}`,
        { method: "PATCH", body: JSON.stringify(payload) },
      ),
    updateSignatory: (id: string, payload: Record<string, unknown>) =>
      apiFetch<{ message: string; verified: boolean }>(`/api/admin/signatories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    createRelationship: (documentId: string, payload: Record<string, unknown>) =>
      apiFetch<Relationship>(`/api/admin/documents/${documentId}/relationships`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    deleteRelationship: (id: string) =>
      apiFetch<{ message: string }>(`/api/admin/relationships/${id}`, { method: "DELETE" }),
    revisions: (documentId: string) =>
      apiFetch<
        Array<{
          id: string;
          page_id: string | null;
          section_id: string | null;
          field: string;
          old_text: string;
          new_text: string;
          reason: string | null;
          revised_by: string | null;
          created_at: string;
        }>
      >(`/api/admin/revisions/${documentId}`),
    settings: () => apiFetch<SystemSettings>("/api/admin/settings"),
    updateRetrieval: (payload: Record<string, unknown>) =>
      apiFetch<{ message: string; retrieval: Record<string, unknown> }>(
        "/api/admin/settings/retrieval",
        { method: "PATCH", body: JSON.stringify(payload) },
      ),
    updateChunking: (payload: Record<string, unknown>) =>
      apiFetch<{ message: string; chunking: Record<string, unknown> }>(
        "/api/admin/settings/chunking",
        { method: "PATCH", body: JSON.stringify(payload) },
      ),
    updateAi: (payload: { gemini_api_key?: string }) =>
      apiFetch<{ message: string; gemini_configured: boolean }>("/api/admin/settings/ai", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    audit: (page = 1) =>
      apiFetch<Paginated<AuditEntry>>(`/api/admin/audit?page=${page}&page_size=30`),
  },

  evaluation: {
    queries: () => apiFetch<BenchmarkQuery[]>("/api/evaluation/queries"),
    createQuery: (payload: { query_text: string; category: string; notes?: string; reference_answer?: string }) =>
      apiFetch<BenchmarkQuery>("/api/evaluation/queries", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    updateQuery: (id: string, payload: { query_text: string; category: string; notes?: string }) =>
      apiFetch<BenchmarkQuery>(`/api/evaluation/queries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    deleteQuery: (id: string) =>
      apiFetch<{ message: string }>(`/api/evaluation/queries/${id}`, { method: "DELETE" }),
    judgments: (queryId: string) => apiFetch<Judgment[]>(`/api/evaluation/queries/${queryId}/judgments`),
    upsertJudgment: (queryId: string, payload: { section_id: string | null; grade: number; notes?: string }) =>
      apiFetch<Judgment>(`/api/evaluation/queries/${queryId}/judgments`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    deleteJudgment: (id: string) =>
      apiFetch<{ message: string }>(`/api/evaluation/judgments/${id}`, { method: "DELETE" }),
    searchSections: (q: string) =>
      apiFetch<
        Array<{
          section_id: string;
          document_id: string;
          document_title: string;
          ordinance_number: string | null;
          section_number: string | null;
          heading: string | null;
          page_start: number;
          page_end: number;
          excerpt: string;
        }>
      >(`/api/evaluation/sections?q=${encodeURIComponent(q)}`),
    runExperiment: (payload: {
      name: string;
      configurations: string[];
      top_k: number;
      notes?: string;
    }) =>
      apiFetch<Experiment[]>("/api/evaluation/experiments", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    experiments: () => apiFetch<Experiment[]>("/api/evaluation/experiments"),
    experiment: (id: string) => apiFetch<Experiment>(`/api/evaluation/experiments/${id}`),
    exportBenchmarkUrl: `${API_BASE}/api/evaluation/queries-export.csv`,
    importBenchmark: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiFetch<{
        message: string;
        created_queries: number;
        created_judgments: number;
        errors: string[];
      }>("/api/evaluation/queries-import", { method: "POST", body: form });
    },
    submitQuality: (payload: {
      evaluator_name: string;
      evaluator_role?: string;
      scores: Record<string, number>;
      comments?: string;
      is_test_data?: boolean;
    }) =>
      apiFetch("/api/evaluation/quality", { method: "POST", body: JSON.stringify(payload) }),
    qualitySummary: () => apiFetch<QualitySummary>("/api/evaluation/quality/summary"),
  },
};

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return (value * 100).toFixed(0) + "%";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function statusTone(status: string): string {
  switch (status) {
    case "processed":
      return "border-civic-500/30 bg-civic-50 text-civic-700";
    case "needs_review":
      return "border-gold-500/40 bg-gold-100 text-gold-700";
    case "failed":
      return "border-rust-600/30 bg-rust-50 text-rust-700";
    case "processing":
    case "running":
      return "border-blue-500/30 bg-blue-50 text-blue-700";
    case "queued":
    case "uploaded":
      return "border-paper-300 bg-paper-100 text-ink-700";
    default:
      return "border-paper-300 bg-paper-100 text-ink-600";
  }
}
