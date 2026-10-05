import { JobStatus } from '../type/job.type';
import { JobHistoryItem } from '../type/job.type';

export interface NotFoundResult {
  status: 'not_found';
}

export interface JobProgress {
  status: JobStatus;
  processedChunks: number;
  totalChunks: number;
  updatedAt?: Date;
  pct: number;
  error?: string;
}

export interface PaginatedJobs {
  jobs: JobHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
