import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FileService } from '../file/file.service';
import { JobService } from '../job/job.service';
import { UsersService } from '../users/users.service';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';

@Injectable()
export class VideoService {
  constructor(
    private fileService: FileService,
    private jobService: JobService,
    @Optional() private usersService: UsersService,
    @InjectQueue('video') private videoQueue: Queue,
  ) {}

  async transcribeVideo(file: Express.Multer.File, data: any, userId: string) {
    const { jobId, mode = 'normal' } = data;
    if (!jobId) throw new BadRequestException('jobId is required');
    const job = await this.jobService.getJobByUser(jobId, userId);
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'waiting') {
      throw new BadRequestException('Job is already being processed');
    }
    const user = await this.usersService.findById(userId);
    const model = user?.selectedModel || 'base';
    if (!['tiny', 'base', 'small', 'medium', 'large'].includes(model)) {
      throw new BadRequestException('Unsupported transcription model');
    }
    if (!['normal', 'segments'].includes(mode)) {
      throw new BadRequestException('mode must be normal or segments');
    }
    const start = parseFloat(data.start) || 0;

    const inputPath = await this.fileService.saveFile(file);
    const fullPath = path.join(process.cwd(), 'uploads', inputPath);

    let videoDuration: number;
    try {
      videoDuration = await this.getVideoDuration(fullPath);
    } catch (error) {
      await this.fileService.deleteFile(inputPath, { ignoreMissing: true });
      throw new BadRequestException('Unable to read video metadata');
    }
    const requestedEnd = Number.parseFloat(data.end);
    const end =
      Number.isFinite(requestedEnd) && requestedEnd > 0
        ? Math.min(requestedEnd, videoDuration)
        : videoDuration;

    if (start >= end) {
      await this.fileService.deleteFile(inputPath, { ignoreMissing: true });
      throw new BadRequestException('start phải nhỏ hơn end');
    }

    const chunkDuration = 60 * 5;
    const totalChunks = Math.ceil((end - start) / chunkDuration);
    await this.jobService.updateTotalChunks(jobId, totalChunks);

    const chunkNames: string[] = [];
    try {
      const chunks = Array.from({ length: totalChunks }, (_, i) => {
        const chunkStart = start + i * chunkDuration;
        const chunkEnd = Math.min(chunkStart + chunkDuration, end);
        const chunkName = `${jobId}_chunk_${i}.mp4`;
        const chunkPath = path.join(process.cwd(), 'uploads', chunkName);
        chunkNames.push(chunkName);
        return { chunkStart, chunkEnd, chunkName, chunkPath, index: i };
      });

      await Promise.all(
        chunks.map(({ chunkPath, chunkStart, chunkEnd }) =>
          this.splitVideo(
            fullPath,
            chunkPath,
            chunkStart,
            chunkEnd - chunkStart,
          ),
        ),
      );
      await Promise.all(
        chunks.map(({ chunkStart, chunkEnd, chunkName, index }) =>
          this.videoQueue.add('TranscriptVideo', {
            mode,
            model,
            index,
            video: chunkName,
            jobId,
            start: chunkStart,
            end: chunkEnd,
          }),
        ),
      );

      await this.fileService.deleteFile(inputPath, { ignoreMissing: true });
      return { message: 'Video split and queued', totalChunks };
    } catch (error) {
      await Promise.all(
        [inputPath, ...chunkNames].map((filename) =>
          this.fileService.deleteFile(filename, { ignoreMissing: true }),
        ),
      );
      await this.jobService.markJobFailed(
        jobId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async translateVideo(
    data: { jobId: string; target_lang: string },
    userId: string,
  ) {
    const job = await this.jobService.getJobByUser(data.jobId, userId);
    if (!job) throw new NotFoundException('Job not found');
    if (!job.transcriptText)
      throw new BadRequestException('Transcript chưa sẵn sàng');
    if (job.status !== 'completed')
      throw new BadRequestException('Job chưa sẵn sàng để dịch');

    await this.jobService.markTranslating(data.jobId);
    try {
      await this.videoQueue.add('TranslateVideo', {
        jobId: data.jobId,
        text: job.transcriptText,
        target_lang: data.target_lang || 'en',
      });
    } catch (error) {
      await this.jobService.markJobFailed(
        data.jobId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
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

  async textToSpeech(data: {
    text: string;
    language: string;
  }): Promise<{ audioBuffer: Buffer; filename: string }> {
    const { text, language } = data;

    if (!text?.trim())
      throw new BadRequestException('text không được để trống');
    if (!language?.trim())
      throw new BadRequestException('language không được để trống');

    const response = await fetch(`${process.env.AI_URI}/text-to-speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), lang: language.trim() }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`TTS service error: ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const filename = `tts_${language}_${Date.now()}.mp3`;

    return { audioBuffer, filename };
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
