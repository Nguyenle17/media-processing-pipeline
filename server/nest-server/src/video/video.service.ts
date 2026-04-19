import { Injectable } from '@nestjs/common';
import { FileService } from '../file/file.service';
import { JobService } from '../job/job.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { JobModule } from 'src/job/job.module';

@Injectable()
export class VideoService {
    constructor(
        private fileService: FileService,
        private jobService: JobService,
        @InjectQueue('video') private videoQueue: Queue,
    ) { }

    async transcribeVideo(file: Express.Multer.File, data: any) {
        const jobId = data.jobId;
        const mode = data.mode || 'normal';
        const selectedModel = data.model || 'tiny';
        const inputPath = await this.fileService.saveFile(file);
        const fullPath = path.join(process.cwd(), 'uploads', inputPath);
        const start = parseFloat(data.start) || 0;
        const end = parseFloat(data.end) || (await this.getVideoDuration(fullPath));

        const chunkDuration = 60 * 5;
        const totalChunks = Math.ceil((end - start) / chunkDuration);

        await this.jobService.updateTotalChunks(jobId, totalChunks);

        for (let i = 0; i < totalChunks; i++) {
            const chunkStart = start + (i * chunkDuration);
            const chunkName = `${jobId}_chunk_${i}.mp4`;
            const chunkPath = path.join(process.cwd(), 'uploads', chunkName);

            await this.splitVideo(fullPath, chunkPath, chunkStart, chunkDuration);

            await this.videoQueue.add('TranscriptVideo', {
                mode: mode,
                model: selectedModel,
                index: i,
                video: chunkName,
                jobId,
                start: chunkStart,
                end: Math.min(chunkStart + chunkDuration, end),

            });
        }

        fs.unlinkSync(fullPath);

        return { message: 'Video split and queued', totalChunks };
    }

    getVideoDuration(filePath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration);
            });
        });
    }

    splitVideo(input: string, output: string, start: number, duration: number): Promise<void> {
        return new Promise((resolve, reject) => {
            ffmpeg(input)
                .setStartTime(start)
                .setDuration(duration)
                .output(output)
                .outputOptions('-c copy')
                .on('end', resolve)
                .on('error', reject)
                .run();
        });
    }

    async checkGrammar(data: any) {
        const text = data.text;
        const jobId = data.jobId;
        const response = await fetch(`${process.env.AI_URI}/grammar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text }),
        });

        const responseJson = await response.json();
        if (responseJson.error) {
            throw new Error(responseJson.error.message);
        }

        return responseJson.corrected_text;
    }


    async translateVideo(file: Express.Multer.File, data: any) {
        const jobId = data.jobId;
        const mode = data.mode || 'normal';
        const selectedModel = data.model || 'base';
        const inputPath = await this.fileService.saveFile(file);
        const fullPath = path.join(process.cwd(), 'uploads', inputPath);
        const start = parseFloat(data.start) || 0;
        const end = parseFloat(data.end) || (await this.getVideoDuration(fullPath));

        const chunkDuration = 60 * 5;
        const totalChunks = Math.ceil((end - start) / chunkDuration);

        await this.jobService.updateTotalChunks(jobId, totalChunks);

        for (let i = 0; i < totalChunks; i++) {
            const chunkStart = start + (i * chunkDuration);
            const chunkName = `${jobId}_chunk_${i}.mp4`;
            const chunkPath = path.join(process.cwd(), 'uploads', chunkName);

            await this.splitVideo(fullPath, chunkPath, chunkStart, chunkDuration);

            await this.videoQueue.add('TranscriptVideo', {
                mode: mode,
                model: selectedModel,
                index: i,
                video: chunkName,
                jobId,
                start: chunkStart,
                end: Math.min(chunkStart + chunkDuration, end),

            });
        }

        fs.unlinkSync(fullPath);

        const job = await this.jobService.getJobById(jobId);
        console.log(job);
        const text = job?.transcriptText;
        await this.videoQueue.add('TranslateVideo', {
            jobId,
            text: text,
            target_lang: data.target_lang || 'en',

        });
        return { message: 'Video split and queued', totalChunks };
    }
}
