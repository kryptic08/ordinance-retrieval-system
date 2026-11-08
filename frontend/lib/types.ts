export type Role = "admin" | "reviewer" | "viewer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login_at?: string | null;
}

export interface DocumentSummary {
  id: string;
  ordinance_number: string | null;
  title: string;
  document_type: string;
  year: number | null;
  date_enacted: string | null;
  lgu: string | null;
  jurisdiction: string | null;
  subject: string | null;
  category: string | null;
  publication_status: string | null;
  status: string;
  is_active: boolean;
  page_count: number;
  file_size: number;
  checksum: string;
  original_filename: string;
  embedding_model: string | null;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  section_count: number;
  chunk_count: number;
  signatory_count: number;
}

export interface PageRecord {
  id: string;
  page_number: number;
  width: number | null;
  height: number | null;
  rotation: number;
  has_text: boolean;
  is_scanned: boolean;
  text_source: string;
  page_type: string;
  raw_text: string;
  normalized_text: string;
  corrected_text: string | null;
  ocr_confidence: number | null;
  warnings: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface SectionRecord {
  id: string;
  stable_key: string;
  section_number: string | null;
  heading: string | null;
  section_type: string;
  level: number;
  page_start: number;
  page_end: number;
  order_index: number;
  normalized_text: string;
  corrected_text: string | null;
  verification_status: string;
  parent_id: string | null;
  chunk_count: number;
}

export interface Signatory {
  id: string;
  page_number: number;
  name: string | null;
  title: string | null;
  role: string | null;
  confidence: number | null;
  method: string;
  verified: boolean;
  notes: string | null;
}

export interface Job {
  id: string;
  document_id: string;
  job_type: string;
  status: string;
  stage: string | null;
  progress: number;
  attempts: number;
  max_attempts: number;
  error: string | null;
  logs: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface Relationship {
  id: string;
  from_document_id: string;
  to_document_id: string;
  relationship_type: string;
  notes: string | null;
  verified: boolean;
}

export interface DocumentDetail extends DocumentSummary {
  notes: string | null;
  source_url: string | null;
  original_filename: string;
  embedding_dim: number | null;
  corpus_version: string;
  pages: PageRecord[];
  sections: SectionRecord[];
  signatories: Signatory[];
  jobs: Job[];
  relationships: Relationship[];
}

export interface SearchResult {
  chunk_id: string;
  section_id: string;
  chunk_key: string;
  document: DocumentSummary;
  section_number: string | null;
  heading: string | null;
  page_start: number;
  page_end: number;
  excerpt: string;
  text: string;
  score: number;
  retrieval_score: number;
  keyword_score: number;
  vector_score: number;
  rerank_score: number;
  matched_terms: string[];
  verification_status: string;
  citation: string;
  pdf_url: string;
}

export interface AnswerClaim {
  claim: string;
  citations: string[];
  chunk_id: string | null;
  citation_url: string | null;
  page_start: number | null;
  document_id?: string | null;
}

export interface AnswerBlock {
  text: string;
  mode: string;
  claims: AnswerClaim[];
  disclaimer: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  took_ms: number;
  configuration: string;
  message: string | null;
  suggestions: string[];
  top_score: number | null;
  answer: AnswerBlock | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentOptions {
  years: number[];
  document_types: string[];
  jurisdictions: string[];
  categories: string[];
}

export interface AdminStats {
  documents: {
    total: number;
    active: number;
    processed: number;
    awaiting_review: number;
    failed: number;
  };
  jobs: { failed: number; recent: Job[] };
  index: {
    sections: number;
    verified_sections: number;
    chunks: number;
    embedding_model: string;
  };
  signatories: { total: number; unverified: number };
  recent_activity: AuditEntry[];
  system: {
    ocr_available: boolean;
    ocr_enabled: boolean;
    ocr_lang: string;
    worker_enabled: boolean;
    embedding_provider: string;
    embedding_dim: number | null;
  };
}

export interface AuditEntry {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface UploadItem {
  filename: string;
  ok: boolean;
  error: string | null;
  duplicate_of: string | null;
  document: DocumentSummary | null;
  job: Job | null;
}

export interface BenchmarkQuery {
  id: string;
  query_text: string;
  category: string;
  notes: string | null;
  reference_answer: string | null;
  is_active: boolean;
  created_at: string;
  judgment_count: number;
}

export interface Judgment {
  id: string;
  query_id: string;
  section_id: string | null;
  grade: number;
  notes: string | null;
  created_at: string;
  section_number: string | null;
  document_title: string | null;
  page_start: number | null;
  page_end: number | null;
}

export interface Experiment {
  id: string;
  name: string;
  configuration: string;
  config_json: Record<string, unknown>;
  dataset_json: unknown[];
  corpus_version: string;
  embedding_model: string | null;
  status: string;
  metrics_json: Record<string, number>;
  results_json: Array<{
    query_id: string;
    query_text: string;
    category: string;
    retrieved: string[];
    scores: number[];
    relevant_section_ids: string[];
    relevant_count: number;
    precision: number;
    recall: number;
    rr: number;
    ndcg: number;
    latency_ms: number;
    citation_correct: boolean;
  }>;
  notes: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface SystemSettings {
  embedding: { provider: string; model: string; dimension: number | null };
  ai?: { gemini_configured: boolean; gemini_preview?: string };
  retrieval: Record<string, number | boolean>;
  chunking: Record<string, number>;
  ocr: { enabled: boolean; lang: string; dpi: number; available: boolean };
  processing: Record<string, number | boolean>;
  overrides: { retrieval: Record<string, unknown>; chunking: Record<string, unknown> };
}

export interface QualitySummary {
  total: number;
  real: { responses: number; averages: Record<string, number>; overall_mean: number | null };
  test: { responses: number; averages: Record<string, number>; overall_mean: number | null };
  responses: Array<{
    id: string;
    evaluator_name: string;
    evaluator_role: string | null;
    scores: Record<string, number>;
    comments: string | null;
    is_test_data: boolean;
    created_at: string;
  }>;
}
