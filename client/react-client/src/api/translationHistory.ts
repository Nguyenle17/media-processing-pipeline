import Api from './Api';

export type TranslationJobStatus = 'completed' | 'processing' | 'translating' | 'failed' | 'waiting';

export interface TranslationChunk {
  index: number;
  transcript?: string;
  translation?: string;
  startTime?: number;
  endTime?: number;
}

export interface TranslationHistoryItem {
  _id: string;
  title?: string;
  type?: 'transcribe' | 'translate';
  status: TranslationJobStatus;
  createdAt: string;
  updatedAt?: string;
  targetLang?: string;
  transcriptText?: string;
  translatedText?: string;
  resultText?: string;
  error?: string;
  chunks?: TranslationChunk[];
}

export interface TranslationHistoryResponse {
  jobs: TranslationHistoryItem[];
  totalPages: number;
  page: number;
  total: number;
}

export const translationHistoryApi = {
  list(
    page: number,
    limit = 8,
    search = '',
    type?: 'transcribe' | 'translate',
  ): Promise<TranslationHistoryResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search.trim(),
    });
    if (type) params.set('type', type);
    return Api.get(`/job/history?${params.toString()}`);
  },
  chunks(jobId: string): Promise<TranslationChunk[]> {
    return Api.get(`/job/chunks?jobId=${encodeURIComponent(jobId)}`);
  },
  detail(jobId: string): Promise<{ job: TranslationHistoryItem; chunks: TranslationChunk[] }> {
    return Api.get(`/job/history/${encodeURIComponent(jobId)}`);
  },
  remove(jobId: string): Promise<unknown> {
    return Api.delete(`/job/delete?jobId=${encodeURIComponent(jobId)}`);
  },
};
