import type { Job } from 'bullmq';
import type {
  TranscribeResponse,
  TranscriptJobData,
  TranslateJobData,
  TranslateResponse,
} from '../interfaces/video.interface';

export type VideoJobName = 'TranscriptVideo' | 'TranslateVideo';

export type TranscriptMode = 'segments' | 'text';

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
