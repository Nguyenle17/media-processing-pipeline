import type { Job } from 'bullmq';

export type VideoJobName = 'TranscriptVideo' | 'TranslateVideo';

export type TranscriptMode = 'segments' | 'text';

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

export type TranscriptJob = Job<
  TranscriptJobData,
  TranscribeResponse,
  'TranscriptVideo'
>;

export type TranslateJob = Job<
  TranslateJobData,
  TranslateResponse,
  'TranslateVideo'
>;

export type VideoJob = TranscriptJob | TranslateJob;
