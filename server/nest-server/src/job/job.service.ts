import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, UpdateQuery } from 'mongoose';
import { Job } from './schemas/job.schema';
import { Chunk } from './schemas/chunk.schema';
import type {
  ChunkLean,
  JobDoc,
  JobHistoryType,
  JobLean,
  JobProgressResult,
  JobResult,
  JobType,
} from './type/job.type';
import type { PaginatedJobs } from './interfaces/job.interface';

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 100;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class JobService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    @InjectModel(Chunk.name) private readonly chunkModel: Model<Chunk>,
  ) {}

  private assertValidId(id: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid id');
    }
  }

  async createJob(
    userId: string,
    title = 'Untitled Job',
    type: JobType = 'transcribe',
    duration = 0,
    targetLang?: string,
  ): Promise<JobDoc> {
    const safeTitle = title?.trim() || 'Untitled Job';
    return new this.jobModel({
      userId,
      title: safeTitle.slice(0, 200),
      type,
      duration,
      targetLang,
      totalChunks: 0,
      processedChunks: 0,
      status: 'waiting',
    }).save();
  }

  async updateTotalChunks(
    jobId: string,
    totalChunks: number,
  ): Promise<JobDoc | null> {
    this.assertValidId(jobId);
    if (!Number.isInteger(totalChunks) || totalChunks < 0) {
      throw new BadRequestException(
        'totalChunks must be a non-negative integer',
      );
    }

    return this.jobModel
      .findByIdAndUpdate(jobId, { totalChunks }, { returnDocument: 'after' })
      .exec();
  }

  async updateChunk(
    index: number,
    jobId: string,
    transcriptText: string,
    translateText: string,
    startTime: number,
    endTime: number,
  ): Promise<JobDoc | null> {
    this.assertValidId(jobId);

    const result = await this.chunkModel
      .updateOne(
        { jobId, index },
        {
          $set: {
            transcript: transcriptText,
            translation: translateText,
            status: 'completed',
            startTime,
            endTime,
          },
        },
        { upsert: true },
      )
      .exec();

    const update: UpdateQuery<Job> = { $set: { status: 'processing' } };
    if (result.upsertedCount > 0) {
      update.$inc = { processedChunks: 1 };
    }

    return this.jobModel
      .findOneAndUpdate(
        { _id: jobId, status: { $in: ['waiting', 'processing'] } },
        update,
        { returnDocument: 'after' },
      )
      .exec();
  }

  async markTranscribeCompleted(jobId: string): Promise<JobDoc | null> {
    this.assertValidId(jobId);

    const job = await this.jobModel
      .findById(jobId)
      .select('type')
      .lean()
      .exec();
    if (!job) return null;

    const chunks = await this.chunkModel
      .find({ jobId })
      .sort({ index: 1 })
      .select('transcript')
      .lean()
      .exec();
    const transcriptText = chunks.map((c) => c.transcript).join(' ');

    const nextStatus = job.type === 'translate' ? 'translating' : 'completed';

    return this.jobModel
      .findOneAndUpdate(
        {
          _id: jobId,
          status: { $in: ['waiting', 'processing'] },
          totalChunks: { $gt: 0 },
          $expr: { $gte: ['$processedChunks', '$totalChunks'] },
        },
        { $set: { status: nextStatus, transcriptText } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async markTranslateCompleted(
    jobId: string,
    translatedText: string,
  ): Promise<JobDoc | null> {
    this.assertValidId(jobId);

    const updated = await this.jobModel
      .findOneAndUpdate(
        { _id: jobId, status: { $in: ['translating'] } },
        { $set: { status: 'completed', translatedText } },
        { returnDocument: 'after' },
      )
      .exec();

    return updated ?? this.jobModel.findById(jobId).exec();
  }

  async markJobFailed(jobId: string, error: string): Promise<JobDoc | null> {
    this.assertValidId(jobId);

    return this.jobModel
      .findOneAndUpdate(
        { _id: jobId, status: { $ne: 'completed' } },
        { $set: { status: 'failed', error } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  async getProcess(jobId: string, userId?: string): Promise<JobProgressResult> {
    if (!isValidObjectId(jobId)) return { status: 'not_found' };

    const job = await this.jobModel
      .findOne(this.buildUserJobFilter(jobId, userId))
      .lean<JobLean>()
      .exec();
    if (!job) return { status: 'not_found' };

    const pct =
      job.totalChunks > 0
        ? Math.round((job.processedChunks / job.totalChunks) * 100)
        : 0;

    return {
      status: job.status,
      processedChunks: job.processedChunks,
      totalChunks: job.totalChunks,
      updatedAt: job.updatedAt,
      pct,
    };
  }

  async markTranslating(jobId: string): Promise<JobDoc | null> {
    this.assertValidId(jobId);
    return this.jobModel
      .findOneAndUpdate(
        { _id: jobId, status: 'completed' },
        { $set: { status: 'translating' } },
        { returnDocument: 'after' },
      )
      .exec();
  }

  private buildUserJobFilter(jobId: string, userId?: string) {
    return userId ? { _id: jobId, userId } : { _id: jobId };
  }

  async getJobById(jobId: string): Promise<JobDoc | null> {
    this.assertValidId(jobId);
    return this.jobModel.findById(jobId).exec();
  }

  async getJobByUser(jobId: string, userId: string): Promise<JobDoc | null> {
    this.assertValidId(jobId);
    return this.jobModel.findOne({ _id: jobId, userId }).exec();
  }

  async getJobResult(jobId: string, userId?: string): Promise<JobResult> {
    if (!isValidObjectId(jobId)) return { status: 'not_found' };

    const job = await this.jobModel
      .findOne(this.buildUserJobFilter(jobId, userId))
      .lean<JobLean>()
      .exec();
    if (!job) return { status: 'not_found' };
    if (job.status !== 'completed') return { status: job.status };

    return {
      status: 'completed',
      transcriptText: job.transcriptText,
      translatedText: job.translatedText ?? null,
    };
  }

  async getJobsByUser(
    userId: string,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    search = '',
    type?: JobHistoryType,
  ): Promise<PaginatedJobs> {
    if (type && !['transcribe', 'translate'].includes(type)) {
      throw new BadRequestException('Invalid history type');
    }
    const safePage = Math.max(Math.trunc(page) || 1, 1);
    const safeLimit = Math.min(
      Math.max(Math.trunc(limit) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const skip = (safePage - 1) * safeLimit;
    const normalizedSearch = search.trim();
    const filter = {
      userId,
      ...(type ? { type } : {}),
      ...(normalizedSearch
        ? { title: { $regex: escapeRegex(normalizedSearch), $options: 'i' } }
        : {}),
    };

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<JobLean[]>()
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    return {
      jobs: jobs.map((job) => {
        const { transcriptText, translatedText, ...metadata } = job;
        return {
          ...metadata,
          resultText: (translatedText || transcriptText || '').slice(0, 240),
          transcriptText: transcriptText?.slice(0, 240),
          translatedText: translatedText?.slice(0, 240),
        };
      }),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async getChunks(jobId: string, userId?: string): Promise<ChunkLean[]> {
    this.assertValidId(jobId);
    if (userId) {
      const job = await this.jobModel
        .findOne({ _id: jobId, userId })
        .select('_id')
        .lean()
        .exec();
      if (!job) throw new NotFoundException('Job not found');
    }
    return this.chunkModel
      .find({ jobId })
      .sort({ index: 1 })
      .lean<ChunkLean[]>()
      .exec();
  }

  async deleteJob(
    jobId: string,
    userId?: string,
  ): Promise<{ message: string }> {
    this.assertValidId(jobId);

    const deletedJob = await this.jobModel
      .findOneAndDelete(this.buildUserJobFilter(jobId, userId))
      .exec();

    if (!deletedJob) throw new NotFoundException(`Job ${jobId} not found`);
    await this.chunkModel.deleteMany({ jobId }).exec();
    return { message: 'Deleted successfully' };
  }

  async getHistoryDetail(
    jobId: string,
    userId: string,
  ): Promise<{ job: JobLean; chunks: ChunkLean[] }> {
    this.assertValidId(jobId);
    const job = await this.jobModel
      .findOne({ _id: jobId, userId })
      .lean<JobLean>()
      .exec();
    if (!job) throw new NotFoundException('Job not found');

    const chunks = await this.chunkModel
      .find({ jobId })
      .sort({ index: 1 })
      .lean<ChunkLean[]>()
      .exec();
    return { job, chunks };
  }
}
