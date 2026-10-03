import type { Request } from 'express';
import type { TranscribeMode, WhisperModel } from '../types/video.type';

export type AuthenticatedVideoRequest = Request & {
  user: { userId: string };
};

export interface TranscriptJobData {
  mode: TranscribeMode;
  model: WhisperModel;
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
  language?: string;
}

export interface TranslateResponse {
  source_lang?: string;
  target_lang?: string;
  translated_text?: string;
}

export interface GrammarResponse {
  corrected_text?: string;
  error?: { message: string };
}

export interface VideoChunk {
  index: number;
  chunkStart: number;
  chunkEnd: number;
  chunkName: string;
  chunkPath: string;
}

export interface TranscribeVideoResult {
  message: string;
  totalChunks: number;
}

export interface TextToSpeechResult {
  audioBuffer: Buffer;
  filename: string;
}
