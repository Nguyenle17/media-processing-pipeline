import type { HydratedDocument, Types } from 'mongoose';
import type { Job } from '../schemas/job.schema';
import type { Chunk } from '../schemas/chunk.schema';

export type JobDoc = HydratedDocument<Job>;
export type JobType = 'transcribe' | 'translate';
export type JobHistoryType = JobType;
export type JobStatus = Job['status'];

export type JobLean = Job & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  resultText?: string;
};
export type ChunkLean = Chunk & { _id: Types.ObjectId };

export interface NotFoundResult {
  status: 'not_found';
}

export interface JobProgress {
  status: JobStatus;
  processedChunks: number;
  totalChunks: number;
  updatedAt?: Date;
  pct: number;
}

export type JobProgressResult = JobProgress | NotFoundResult;

export type JobResult =
  | NotFoundResult
  | { status: JobStatus }
  | {
      status: 'completed';
      transcriptText: Job['transcriptText'];
      translatedText: string | null;
    };

export interface PaginatedJobs {
  jobs: JobHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type JobHistoryItem = Omit<JobLean, 'transcriptText' | 'translatedText'> & {
  resultText: string;
  transcriptText?: string;
  translatedText?: string;
};
