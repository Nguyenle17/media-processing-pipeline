import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import type {
  GrammarResponse,
  TextToSpeechResult,
  TranscribeVideoResult,
  VideoChunk,
} from './interfaces/video.interface';
import { WHISPER_MODELS } from './types/video.type';
import type { TranscribeMode, WhisperModel } from './types/video.type';
import {
  TranscribeVideoDto,
  TranslateVideoDto,
  GrammarDto,
  TextToSpeechDto,
  TtsHistoryQueryDto,
} from './dto/video.dto';
import { FileService } from '../file/file.service';
import { JobService } from '../job/job.service';
import { UsersService } from '../users/users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Video } from './schemas/video.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const CHUNK_DURATION_SECONDS = 60 * 5;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_TTS_CHARS = 2_000;

function isWhisperModel(value: unknown): value is WhisperModel {
  return (
    typeof value === 'string' &&
    (WHISPER_MODELS as readonly string[]).includes(value)
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class VideoService {
  constructor(
    private readonly fileService: FileService,
    private readonly jobService: JobService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly usersService: UsersService,
    @InjectQueue('video')
    private readonly videoQueue: Queue,
    @InjectModel(Video.name)
    private readonly videoModel: Model<Video>,
  ) {}

  async transcribeVideo(
    file: Express.Multer.File,
    dto: TranscribeVideoDto,
    userId: string,
  ): Promise<TranscribeVideoResult> {
    const { jobId } = dto;
    const mode: TranscribeMode = dto.mode ?? 'normal';

    const job = await this.jobService.getJobByUser(jobId, userId);
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'waiting') {
      throw new BadRequestException('Job is already being processed');
    }

    const user = await this.usersService.findById(userId);
    const selectedModel: unknown = user?.selectedModel ?? 'base';
    if (!isWhisperModel(selectedModel)) {
      throw new BadRequestException('Unsupported transcription model');
    }
    const model: WhisperModel = selectedModel;

    const inputPath = await this.fileService.saveFile(file);
    const fullPath = path.join(UPLOAD_DIR, inputPath);
    const chunkNames: string[] = [];

    try {
      const videoDuration = await this.getVideoDuration(fullPath).catch(() => {
        throw new BadRequestException('Unable to read video metadata');
      });

      const { start, end } = this.resolveRange(dto, videoDuration);

      const chunks = this.buildChunks(jobId, start, end);
      chunkNames.push(...chunks.map((c) => c.chunkName));

      await this.jobService.updateTotalChunks(jobId, chunks.length);

      for (const c of chunks) {
        await this.splitVideo(
          fullPath,
          c.chunkPath,
          c.chunkStart,
          c.chunkEnd - c.chunkStart,
        );
      }

      await this.videoQueue.addBulk(
        chunks.map((c) => ({
          name: 'TranscriptVideo',
          data: {
            mode,
            model,
            index: c.index,
            video: c.chunkName,
            jobId,
            start: c.chunkStart,
            end: c.chunkEnd,
          },
        })),
      );

      await this.fileService.deleteFile(inputPath, { ignoreMissing: true });
      return { message: 'Video split and queued', totalChunks: chunks.length };
    } catch (error) {
      await Promise.all(
        [inputPath, ...chunkNames].map((filename) =>
          this.fileService.deleteFile(filename, { ignoreMissing: true }),
        ),
      );
      if (!(error instanceof BadRequestException)) {
        await this.jobService.markJobFailed(jobId, toMessage(error));
      }
      throw error;
    }
  }

  async translateVideo(
    data: TranslateVideoDto,
    userId: string,
  ): Promise<{ message: string }> {
    const job = await this.jobService.getJobByUser(data.jobId, userId);
    if (!job) throw new NotFoundException('Job not found');
    if (!job.transcriptText) {
      throw new BadRequestException('Transcript is not ready');
    }
    if (job.status !== 'completed') {
      throw new BadRequestException('Job is not ready for translation');
    }

    await this.jobService.markTranslating(data.jobId);
    try {
      await this.videoQueue.add('TranslateVideo', {
        jobId: data.jobId,
        text: job.transcriptText,
        target_lang: data.target_lang || 'en',
      });
    } catch (error) {
      await this.jobService.markJobFailed(data.jobId, toMessage(error));
      throw error;
    }
    return { message: 'Translation queued' };
  }

  async checkGrammar(data: GrammarDto): Promise<{ correctedText: string }> {
    const aiUri = process.env.AI_URI?.replace(/\/$/, '');
    const aiToken = process.env.AI_SERVICE_TOKEN;
    if (!aiUri || !aiToken) throw new Error('AI service is not configured');

    const response = await fetch(`${aiUri}/grammar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-AI-Service-Token': aiToken },
      body: JSON.stringify({ text: data.text }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Grammar service error (${response.status})`);
    }

    const json = (await response.json()) as GrammarResponse;
    if (json.error) throw new Error(json.error.message);
    if (json.corrected_text === undefined) {
      throw new Error('Invalid grammar service response');
    }
    return { correctedText: json.corrected_text };
  }

  async textToSpeech(
    data: TextToSpeechDto,
    userId: string,
  ): Promise<TextToSpeechResult> {
    const text = data.text?.trim();
    const language = data.language?.trim();

    if (!text) throw new BadRequestException('text must not be empty');
    if (!language) throw new BadRequestException('language must not be empty');
    if (text.length > MAX_TTS_CHARS) {
      throw new BadRequestException(`text must not exceed ${MAX_TTS_CHARS} characters`);
    }

    const aiUri = process.env.AI_URI?.replace(/\/$/, '');
    const aiToken = process.env.AI_SERVICE_TOKEN;
    if (!aiUri || !aiToken) throw new Error('AI service is not configured');

    const response = await fetch(`${aiUri}/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Token': aiToken,
      },
      body: JSON.stringify({ text, lang: language }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`TTS service error (${response.status})`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const filename = `tts_${language}_${Date.now()}.mp3`;

    const cloudinaryResult = await this.cloudinaryService.uploadFile(
      audioBuffer,
      'tts',
    );

    const rawDuration: unknown = cloudinaryResult.duration;
    const duration =
      typeof rawDuration === 'number' && Number.isFinite(rawDuration)
        ? rawDuration
        : 0;

    await this.videoModel.create({
      userId: new Types.ObjectId(userId),
      title: `TTS_${language}`,
      content: text,
      language,
      originalFilename: filename,
      type: 'audio',
      cloudinaryPublicId: cloudinaryResult.public_id,
      cloudinaryUrl: cloudinaryResult.secure_url,
      duration,
    });

    return { audioBuffer, filename };
  }

  async getTssHistory(
    query: TtsHistoryQueryDto,
    userId: string,
  ): Promise<{
    items: Array<{
      id: string;
      title: string;
      originalText: string;
      language?: string;
      audioUrl: string;
      duration: number;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 8;
    const search = (query.search ?? '').trim();
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      type: 'audio',
    };
    if (escapedSearch) {
      const expression = { $regex: escapedSearch, $options: 'i' };
      filter.$or = [{ title: expression }, { content: expression }, { language: expression }];
    }

    const items = await this.videoModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.videoModel.countDocuments(filter).exec();
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: items.map((item) => ({
        id: String(item._id),
        title: item.title,
        originalText: item.content,
        language: item.language,
        audioUrl: item.cloudinaryUrl,
        duration: item.duration,
        createdAt: item.createdAt,
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async deleteTtsHistory(id: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('TTS history item not found');
    }
    const video = await this.videoModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!video) {
      throw new NotFoundException('TTS history item not found');
    }

    await this.cloudinaryService.deleteFile(video.cloudinaryPublicId);
    await this.videoModel.deleteOne({ _id: video._id }).exec();
  }

  private resolveRange(
    dto: TranscribeVideoDto,
    videoDuration: number,
  ): { start: number; end: number } {
    const start = dto.start ?? 0;
    const end =
      dto.end !== undefined && dto.end > 0
        ? Math.min(dto.end, videoDuration)
        : videoDuration;

    if (start >= end) {
      throw new BadRequestException('start must be less than end');
    }
    return { start, end };
  }

  private buildChunks(jobId: string, start: number, end: number): VideoChunk[] {
    const totalChunks = Math.ceil((end - start) / CHUNK_DURATION_SECONDS);
    return Array.from({ length: totalChunks }, (_, index) => {
      const chunkStart = start + index * CHUNK_DURATION_SECONDS;
      const chunkEnd = Math.min(chunkStart + CHUNK_DURATION_SECONDS, end);
      const chunkName = `${jobId}_chunk_${index}.mp4`;
      return {
        index,
        chunkStart,
        chunkEnd,
        chunkName,
        chunkPath: path.join(UPLOAD_DIR, chunkName),
      };
    });
  }

  private getVideoDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        const duration = metadata.format.duration;
        if (typeof duration !== 'number' || !Number.isFinite(duration)) {
          return reject(new Error('Cannot determine video duration'));
        }
        resolve(duration);
      });
    });
  }

  private splitVideo(
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
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }
}
