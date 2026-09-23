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
  JobLean,
  JobProgressResult,
  JobResult,
  JobType,
  PaginatedJobs,
} from './type/JobType';

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 100;

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
    return new this.jobModel({
      userId,
      title,
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
        { _id: jobId, status: { $nin: ['completed', 'translating'] } },
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
          status: { $nin: ['completed', 'translating'] },
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
        { _id: jobId, status: { $ne: 'completed' } },
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

  async getProcess(jobId: string): Promise<JobProgressResult> {
    if (!isValidObjectId(jobId)) return { status: 'not_found' };

    const job = await this.jobModel.findById(jobId).lean<JobLean>().exec();
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

  async getJobById(jobId: string): Promise<JobDoc | null> {
    this.assertValidId(jobId);
    return this.jobModel.findById(jobId).exec();
  }

  async getJobResult(jobId: string): Promise<JobResult> {
    if (!isValidObjectId(jobId)) return { status: 'not_found' };

    const job = await this.jobModel.findById(jobId).lean<JobLean>().exec();
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
  ): Promise<PaginatedJobs> {
    const safePage = Math.max(Math.trunc(page) || 1, 1);
    const safeLimit = Math.min(
      Math.max(Math.trunc(limit) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );
    const skip = (safePage - 1) * safeLimit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<JobLean[]>()
        .exec(),
      this.jobModel.countDocuments({ userId }).exec(),
    ]);

    return {
      jobs,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async getChunks(jobId: string): Promise<ChunkLean[]> {
    this.assertValidId(jobId);
    return this.chunkModel
      .find({ jobId })
      .sort({ index: 1 })
      .lean<ChunkLean[]>()
      .exec();
  }

  async deleteJob(jobId: string): Promise<{ message: string }> {
    this.assertValidId(jobId);

    const [deletedJob] = await Promise.all([
      this.jobModel.findByIdAndDelete(jobId).exec(),
      this.chunkModel.deleteMany({ jobId }).exec(),
    ]);

    if (!deletedJob) throw new NotFoundException(`Job ${jobId} not found`);
    return { message: 'Deleted successfully' };
  }
}
