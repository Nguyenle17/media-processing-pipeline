import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FileService } from '../file/file.service';
import { JobService } from '../job/job.service';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VideoService {
  constructor(
    private fileService: FileService,
    private jobService: JobService,
    @InjectQueue('video') private videoQueue: Queue,
  ) {}


  async transcribeVideo(file: Express.Multer.File, data: any) {
    const { jobId, mode = 'normal', model = 'tiny' } = data;
    const start = parseFloat(data.start) || 0;
    const inputPath = await this.fileService.saveFile(file);
    const fullPath = path.join(process.cwd(), 'uploads', inputPath);
    const videoDuration = await this.getVideoDuration(fullPath);
    const end = parseFloat(data.end) || videoDuration;

    if (start >= end) {
      fs.unlinkSync(fullPath);
      throw new BadRequestException('start phải nhỏ hơn end');
    }

    const chunkDuration = 60 * 5;
    const totalChunks = Math.ceil((end - start) / chunkDuration);

    await this.jobService.updateTotalChunks(jobId, totalChunks);

    for (let i = 0; i < totalChunks; i++) {
      const chunkStart = start + i * chunkDuration;
      const chunkEnd = Math.min(chunkStart + chunkDuration, end);
      const chunkName = `${jobId}_chunk_${i}.mp4`;
      const chunkPath = path.join(process.cwd(), 'uploads', chunkName);

      await this.splitVideo(fullPath, chunkPath, chunkStart, chunkDuration);

      await this.videoQueue.add('TranscriptVideo', {
        mode,
        model,
        index: i,
        video: chunkName,
        jobId,
        start: chunkStart,
        end: chunkEnd,
      });
    }

    fs.unlinkSync(fullPath);

    return { message: 'Video split and queued', totalChunks };
  }

  async translateVideo(data: { jobId: string; target_lang: string }) {
    const job = await this.jobService.getJobById(data.jobId);
    if (!job) throw new NotFoundException('Job not found');
    if (!job.transcriptText) throw new BadRequestException('Transcript chưa sẵn sàng');

    await this.videoQueue.add('TranslateVideo', {
      jobId: data.jobId,
      text: job.transcriptText,
      target_lang: data.target_lang || 'en',
    });

    return { message: 'Translation queued' };
  }

  async checkGrammar(data: { text: string }) {
    const response = await fetch(`${process.env.AI_URI}/grammar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: data.text }),
    });

    const json = await response.json();
    if (json.error) throw new Error(json.error.message);

    return { correctedText: json.corrected_text };
  }

  getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration ?? 0);
      });
    });
  }

  splitVideo(
    input: string,
    output: string,
    start: number,
    duration: number,
  ): Promise<void> {
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
}