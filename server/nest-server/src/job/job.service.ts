import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from './schemas/job.schema';
import { Chunk } from './schemas/chunk.schema';

@Injectable()
export class JobService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<Job>,
    @InjectModel(Chunk.name) private chunkModel: Model<Chunk>,
  ) {}

  async createJob(
    userId: string,
    title: string = 'Untitled Job',
    type: 'transcript' | 'translate' = 'transcript',
    duration: number = 0,
    targetLang?: string,
  ) {
    const job = new this.jobModel({
      userId,
      title,
      type,
      duration,
      targetLang,
      totalChunks: 0,
      processedChunks: 0,
      status: 'waiting',
    });
    await job.save();
    return job;
  }

  async updateTotalChunks(jobId: string, totalChunks: number) {
    return this.jobModel.findByIdAndUpdate(
      jobId,
      { totalChunks },
      { new: true },
    );
  }

  async updateChunk(
    index: number,
    jobId: string,
    transcriptText: string,
    translateText: string,
    startTime: number,
    endTime: number,
  ) {
    // Upsert chunk
    await this.chunkModel.findOneAndUpdate(
      { jobId, index },
      {
        jobId,
        index,
        transcript: transcriptText,
        translation: translateText,
        status: 'completed',
        startTime,
        endTime,
      },
      { upsert: true, new: true },
    );

    return this.jobModel.findOneAndUpdate(
      { _id: jobId },
      {
        $set: { status: 'processing' },
        $inc: { processedChunks: 1 },
      },
      { returnDocument: 'after' },
    );
  }

  async markTranscribeCompleted(jobId: string): Promise<Job | null> {
    const job = await this.jobModel.findById(jobId);
    if (!job) return null;

    // Tránh gọi lại nhiều lần
    if (job.status === 'completed' || job.status === 'translating') return job;
    if (job.processedChunks < job.totalChunks) return null;

    const chunks = await this.chunkModel
      .find({ jobId })
      .sort({ index: 1 })
      .lean();

    const transcriptText = chunks.map((c) => c.transcript).join(' ');

    if (job.type === 'translate') {
      return this.jobModel.findOneAndUpdate(
        { _id: jobId },
        { $set: { status: 'translating', transcriptText } },
        { returnDocument: 'after', new: true },
      );
    }

    return this.jobModel.findOneAndUpdate(
      { _id: jobId },
      { $set: { status: 'completed', transcriptText } },
      { returnDocument: 'after', new: true },
    );
  }

  async markTranslateCompleted(jobId: string, translatedText: string) {
    const job = await this.jobModel.findById(jobId);
    if (!job) return null;
    if (job.status === 'completed') return job;

    return this.jobModel.findOneAndUpdate(
      { _id: jobId },
      { $set: { status: 'completed', translatedText } },
      { returnDocument: 'after', new: true },
    );
  }


  async markJobFailed(jobId: string, error: string) {
    return this.jobModel.findOneAndUpdate(
      { _id: jobId },
      { $set: { status: 'failed', error } },
      { returnDocument: 'after', new: true },
    );
  }

  async getProcess(jobId: string) {
    const job = await this.jobModel.findById(jobId).lean();
    if (!job) return { status: 'not_found' };

    const pct =
      job.totalChunks > 0
        ? Math.round((job.processedChunks / job.totalChunks) * 100)
        : 0;

    return {
      status: job.status,
      processedChunks: job.processedChunks,
      totalChunks: job.totalChunks,
      updatedAt: job['updatedAt'],
      pct,
    };
  }

  async getJobById(jobId: string) {
    return this.jobModel.findById(jobId);
  }

  async getJobResult(jobId: string) {
    const job = await this.jobModel.findById(jobId).lean();
    if (!job) return { status: 'not_found' };
    if (job.status !== 'completed') return { status: job.status };

    return {
      status: 'completed',
      transcriptText: job.transcriptText,
      translatedText: job.translatedText ?? null,
    };
  }

  async getJobsByUser(userId: string, page = 1, limit = 8) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      this.jobModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.jobModel.countDocuments({ userId }),
    ]);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getChunks(jobId: string) {
    return this.chunkModel.find({ jobId }).sort({ index: 1 }).lean();
  }

  async deleteJob(jobId: string) {
    await Promise.all([
      this.jobModel.findOneAndDelete({ _id: jobId }),
      this.chunkModel.deleteMany({ jobId }),
    ]);
    return { message: 'Deleted successfully' };
  }
}