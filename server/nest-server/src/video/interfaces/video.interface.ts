import type { TranscriptMode } from '../types/video.type';

export interface TranscriptJobData {
  mode: TranscriptMode;
  model: string;
  index: number;
  video: string;
  jobId: string;
  start: number;
  end: number;
}

export interface TranslateJobData {
  jobId: string;
  text: string;
  target_lang: string;
}

export interface TranscribeSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscribeResponse {
  text?: string;
  segments?: TranscribeSegment[];
}

export interface TranslateResponse {
  translated_text?: string;
}
