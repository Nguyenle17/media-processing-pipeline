import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as fs from 'fs';
import { FileService } from '../file/file.service';
import { JobService } from '../job/job.service';
import type {
  TranscribeResponse,
  TranscriptJobData,
  TranslateJobData,
  TranslateResponse,
} from './interfaces/video.interface';
import type { VideoJob } from './types/video.type';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

@Processor('video', { concurrency: 1 })
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    private readonly jobService: JobService,
    private readonly httpService: HttpService,
    private readonly fileService: FileService,
    @InjectQueue('video') private readonly videoQueue: Queue,
  ) {
    super();
  }

  async process(
    job: VideoJob,
  ): Promise<TranscribeResponse | TranslateResponse> {
    switch (job.name) {
      case 'TranscriptVideo':
        return this.handleTranscript(job.data);
      case 'TranslateVideo':
        return this.handleTranslate(job.data);
      default: {
        const unknownJob: never = job;
        throw new Error(`Unknown job type: ${(unknownJob as Job).name}`);
      }
    }
  }

  private get aiUri(): string {
    const uri = process.env.AI_URI;
    if (!uri) throw new Error('AI_URI is not configured');
    return uri;
  }

  /**
   * Whisper large/medium models can legitimately take longer than five
   * minutes. Axios uses 0 for no timeout, while deployments may opt into a
   * limit with AI_REQUEST_TIMEOUT_MS.
   */
  private get aiRequestTimeout(): number {
    const value = Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  private formatTime(sec: number): string {
    const totalCs = Math.round(sec * 100);
    const m = Math.floor(totalCs / 6000);
    const s = (totalCs % 6000) / 100;
    return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
  }

  private buildFormData(
    stream: fs.ReadStream,
    filename: string,
    model?: string,
    extra?: Record<string, string>,
  ): FormData {
    const form = new FormData();
    form.append('file', stream, { filename });
    // The Python API names this multipart field `type`.
    if (model) form.append('type', model);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) form.append(k, v);
    }
    return form;
  }

  private async postToAI<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await firstValueFrom(
      this.httpService.post<T>(`${this.aiUri}/${endpoint}`, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: this.aiRequestTimeout,
      }),
    );
    return response.data;
  }

  private async handleTranscript(
    data: TranscriptJobData,
  ): Promise<TranscribeResponse> {
    const { mode, model, index, video, jobId, start, end } = data;
    let stream: fs.ReadStream | undefined;

    try {
      const filePath = this.fileService.getFilePath(video);
      stream = fs.createReadStream(filePath);
      const form = this.buildFormData(stream, video, model);
      const result = await this.postToAI<TranscribeResponse>(
        'transcribe',
        form,
      );

      const transcriptText =
        mode === 'segments'
          ? (result.segments ?? [])
              .map(
                (seg) =>
                  `[${this.formatTime(Number(start) + seg.start)}-${this.formatTime(Number(start) + seg.end)}]:${seg.text}`,
              )
              .join('\n')
          : (result.text ?? '');

      const updatedJob = await this.jobService.updateChunk(
        index,
        jobId,
        transcriptText,
        '',
        start,
        end,
      );

      if (
        updatedJob &&
        Number(updatedJob.processedChunks) >= Number(updatedJob.totalChunks)
      ) {
        const finishedJob =
          await this.jobService.markTranscribeCompleted(jobId);

        if (
          finishedJob &&
          finishedJob.type === 'translate' &&
          finishedJob.transcriptText
        ) {
          await this.videoQueue.add('TranslateVideo', {
            jobId,
            text: finishedJob.transcriptText,
            target_lang: finishedJob.targetLang || 'en',
          } satisfies TranslateJobData);
        }
      }

      await this.fileService.deleteFile(video);

      return result;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(
        `[TranscriptVideo] chunk ${index} of job ${jobId} failed: ${message}`,
      );
      await this.jobService.markJobFailed(jobId, message);
      throw error;
    } finally {
      stream?.destroy();
    }
  }

  private async handleTranslate(
    data: TranslateJobData,
  ): Promise<TranslateResponse> {
    const { jobId, text, target_lang } = data;
    this.logger.log(
      `[TranslateVideo] job=${jobId} lang=${target_lang} text_len=${text?.length}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post<TranslateResponse>(
          `${this.aiUri}/translate`,
          { text, target_lang: target_lang || 'en' },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const translatedText = response.data.translated_text ?? '';
      await this.jobService.markTranslateCompleted(jobId, translatedText);

      return response.data;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      this.logger.error(`[TranslateVideo] job=${jobId} failed: ${message}`);
      await this.jobService.markJobFailed(jobId, message);
      throw error;
    }
  }
}
