import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FileService } from 'src/file/file.service';
import { JobService } from '../job/job.service';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

@Processor('video', { concurrency: 1 })
export class VideoProcessor extends WorkerHost {
  constructor(
    private readonly jobService: JobService,
    private readonly httpService: HttpService,
    private readonly fileService: FileService,
    @InjectQueue('video') private readonly videoQueue: Queue,
  ) {
    super();
  }


  async process(job: Job) {
    switch (job.name) {
      case 'TranscriptVideo':
        return this.handleTranscript(job.data);
      case 'TranslateVideo':
        return this.handleTranslate(job.data);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(2).padStart(5, '0');
    return `${String(m).padStart(2, '0')}:${s}`;
  }

  private buildFormData(
    filePath: string,
    filename: string,
    model?: string,
    extra?: Record<string, string>,
  ) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), { filename });
    if (model) form.append('model', model);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) form.append(k, v);
    }
    return form;
  }

  private async postToAI(endpoint: string, formData: FormData) {
    return firstValueFrom(
      this.httpService.post(
        `${process.env.AI_URI}/${endpoint}`,
        formData,
        {
          headers: formData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 300_000,
        },
      ),
    );
  }


  async handleTranscript(data: {
    mode: string;
    model: string;
    index: number;
    video: string;
    jobId: string;
    start: number;
    end: number;
  }) {
    const { mode, model, index, video, jobId, start, end } = data;
    const filePath = path.join(process.cwd(), 'uploads', video);

    try {
      const form = this.buildFormData(filePath, video, model);
      const response = await this.postToAI('transcribe', form);

      let transcriptText: string;
      if (mode === 'segments') {
        transcriptText = response.data.segments
          .map(
            (seg: any) =>
              `[${this.formatTime(seg.start)}-${this.formatTime(seg.end)}]:${seg.text}`,
          )
          .join('\n');
      } else {
        transcriptText = response.data.text ?? '';
      }

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
        const finishedJob = await this.jobService.markTranscribeCompleted(jobId);

        if (finishedJob && finishedJob.type === 'translate' && finishedJob.transcriptText) {
          await this.videoQueue.add('TranslateVideo', {
            jobId,
            text: finishedJob.transcriptText,
            target_lang: finishedJob.targetLang || 'en',
          });
        }
      }

      await this.fileService.deleteFile(video);

      return response.data;
    } catch (error) {
      console.error(`[TranscriptVideo] chunk ${index} of job ${jobId} failed:`, error.message);
      await this.jobService.markJobFailed(jobId, error.message);
      throw error;
    }
  }

  async handleTranslate(data: {
    jobId: string;
    text: string;
    target_lang: string;
  }) {
    const { jobId, text, target_lang } = data;
    console.log(
      `[TranslateVideo] job=${jobId} lang=${target_lang} text_len=${text?.length}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${process.env.AI_URI}/translate`,
          { text, target_lang: target_lang || 'en' },
          { headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const translatedText: string = response.data.translated_text ?? '';

      await this.jobService.markTranslateCompleted(jobId, translatedText);

      return response.data;
    } catch (error) {
      console.error(`[TranslateVideo] job=${jobId} failed:`, error.message);
      await this.jobService.markJobFailed(jobId, error.message);
      throw error;
    }
  }
}