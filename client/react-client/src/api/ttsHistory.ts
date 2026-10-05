import Api from './Api';

export interface TtsHistoryItem {
  id: string;
  title: string;
  originalText: string;
  audioUrl: string;
  language?: string;
  duration?: number;
  createdAt: string;
}

export interface TtsHistoryResponse {
  items: TtsHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RawTtsItem {
  _id?: string;
  id?: string;
  title?: string;  
  originalText?: string;
  originalFilename?: string;
  type?: 'video' | 'audio';
  cloudinaryPublicId?: string;
  audioUrl?: string;
  language?: string;
  voice?: string;
  duration?: number;
  createdAt?: string;
}

interface RawTtsHistoryResponse {
  items?: RawTtsItem[];
  total?: number;
  totalItems?: number;
  totalPages?: number;
}

function extractLanguage(raw: RawTtsItem): string | undefined {
  return (
    raw.language ??
    raw.title?.match(/^TTS_(.+)$/i)?.[1] ??
    raw.originalFilename?.match(/^tts_([^_]+)_/i)?.[1]
  );
}

function normalizeItem(raw: RawTtsItem): TtsHistoryItem {
  return {
    id: raw._id ?? raw.id ?? '',
    title: raw.title ?? '',
    originalText: raw.originalText ?? '',
    audioUrl: raw.audioUrl ?? '',
    language: extractLanguage(raw),
    duration: raw.duration,
    createdAt: raw.createdAt ?? '',
  };
}

export const ttsHistoryApi = {
  async list(page = 1, limit = 6, search = ''): Promise<TtsHistoryResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search.trim(),
    });
    const raw: RawTtsHistoryResponse = await Api.get(`/video/tts/history?${params.toString()}`);

    const items = (raw.items ?? []).map(normalizeItem);
    const total = raw.total ?? raw.totalItems ?? items.length;

    return {
      items,
      total,
      page,
      limit,
      totalPages: raw.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    };
  },

  async remove(id: string): Promise<void> {
    await Api.delete(`/video/tts/history/${encodeURIComponent(id)}`);
  },
};
