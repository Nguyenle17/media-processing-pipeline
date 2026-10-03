import type { Job } from 'bullmq';
import type {
  TranscriptJobData,
  TranscribeResponse,
  TranslateJobData,
  TranslateResponse,
} from '../interfaces/video.interface';

export const WHISPER_MODELS = [
  'tiny',
  'base',
  'small',
  'medium',
  'large',
] as const;

export type WhisperModel = (typeof WHISPER_MODELS)[number];

export const TRANSCRIBE_MODES = ['normal', 'segments'] as const;
export type TranscribeMode = (typeof TRANSCRIBE_MODES)[number];

export type VideoJobName = 'TranscriptVideo' | 'TranslateVideo';

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
