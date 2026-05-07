import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job } from './schemas/job.schema';
import { Chunk } from './schemas/chunk.schema';
import { Types } from 'mongoose';


@Injectable()
export class JobService {
    constructor(
        @InjectModel(Job.name) private jobModel: Model<Job>,
        @InjectModel(Chunk.name) private chunkModel: Model<Chunk>, 
    ) {}

    async createJob(
        userId: string,
        title: string = 'Untitled Job',
        totalChunks: number = 1,
        duration: number = 1,
    ) {
        const job = new this.jobModel({ userId, title, totalChunks, processedChunks: 0, duration: duration });
        await job.save();
        return job;
    }

    async updateTotalChunks(jobId: string, totalChunks: number) {
        return this.jobModel.findByIdAndUpdate(
            jobId, { totalChunks }, { new: true }
        );
    }

    async updateChunk(index: number, jobId: string, transcriptText: string, translateText: string, start: number, end: number) {
        await this.chunkModel.findOneAndUpdate(
            { jobId, index },
            { jobId, index, transcript: transcriptText, translation: translateText, status: 'completed', startTime: start, endTime: end },
            { upsert: true, new: true }
        );

        return this.jobModel.findOneAndUpdate(
            { _id: jobId },
            {
                $set: { status: 'processing' },
                $inc: { processedChunks: 1 },
            },
            { returnDocument: 'after' }
        );
    }

    async markAsCompleted(jobId: string) {
        const job = await this.jobModel.findById(jobId);
        if (!job) return;
        if (job.status === 'completed') return;
        if (job.processedChunks < job.totalChunks) return;

        const chunks = await this.chunkModel
            .find({ jobId })
            .sort({ index: 1 })  
            .lean();

        const transcriptText = chunks.map(c => c.transcript).join(' ') || "";
        const translateText = chunks.map(c => c.translation).join(' ') || "";

        return this.jobModel.updateOne(
            { _id: jobId },
            { $set: { status: 'completed', transcriptText: transcriptText, translatedText: translateText }}
        );
    }

    async getProcess(jobId: string) {
        const job = await this.jobModel.findById(jobId);
        if (!job) return { status: 'not found' };
        const pct = job.totalChunks > 0
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

    async getJobsByUser(userId: string, page: number = 1, limit: number = 8) {
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
        return await this.chunkModel.find({ jobId: jobId })
    }

    async deleteJob(jobId: string) {
        await Promise.all([
            this.jobModel.findOneAndDelete({ _id: jobId }),
            this.chunkModel.deleteMany({ jobId }),  
        ]);
        return { message: 'Deleted successfully' };
    }
}