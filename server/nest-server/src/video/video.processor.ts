import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
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
  ) {
    super();
  }

  formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(2).padStart(5, '0');
    return `${String(m).padStart(2, '0')}:${s}`;
  }

  async process(job: Job) {
    switch (job.name) {
      case 'TranscriptVideo': return this.handleTranscript(job.data);
      case 'TranslateVideo': return this.handleTranslate(job.data);
      default: throw new Error(`Unknown job: ${job.name}`);
    }
  }

  private buildFormData(filePath: string, filename: string, model: string | undefined, extra?: Record<string, string>) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath), { filename });
    if (model) {
      formData.append('model', model);
    }
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    return formData;
  }

  private async postToAI(endpoint: string, formData: FormData) {
    return firstValueFrom(
      this.httpService.post(
        `${process.env.AI_URI}/${endpoint}`,
        formData,
        {
          headers: { ...formData.getHeaders() },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 300000,
        },
      ),
    );
  }

  private async saveAndComplete(index: number, jobId: string, transcriptText: string, translateText: string, video: string, start: number, end: number) {
    const updatedJob = await this.jobService.updateChunk(Number(index), jobId, transcriptText, translateText, start, end);
    if (!updatedJob) return;
    await this.fileService.deleteFile(video);
    if (Number(updatedJob.processedChunks) >= Number(updatedJob.totalChunks)) {
      await this.jobService.markAsCompleted(jobId);
    }
    return updatedJob;
  }

  async updateTranslateResult(jobId: string, translateText: string) {
    const job = await this.jobService.getJobById(jobId);
    if (!job) return;
    const updatedJob = await this.jobService.updateChunk(0, jobId, job.transcriptText, translateText, 0, 0);
    return updatedJob;
  }

  async handleTranscript(data: any) {
    const { mode, model, index, video, jobId, start, end } = data;
    const filePath = path.join(process.cwd(), 'uploads', video);

    const formData = this.buildFormData(filePath, video, model);

    try {
      const response = await this.postToAI('transcribe', formData);
      const segments = response.data.segments.map((seg) => {
        return `[${this.formatTime(seg.start)}-${this.formatTime(seg.end)}]:${seg.text}`
      }).join('\n')
      await this.saveAndComplete(index, jobId, mode === 'normal' ? response.data.text : segments, "", video, start, end);
      return response.data;
    } catch (error) {
      console.error(`Transcript chunk ${index} failed:`, error.message);
      throw error;
    }
  }

  async handleTranslate(data: any) {
  const { jobId, text, target_lang } = data;
  console.log(`Translating job ${jobId} to ${target_lang}, text length: ${text.length}`);
  try {
    const response = await firstValueFrom(
      this.httpService.post(
        `${process.env.AI_URI}/translate`,
        {
          text,
          target_lang: target_lang || 'en',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    await this.updateTranslateResult(jobId, response.data.translated_text);
    return response.data;
  } catch (error) {
    console.error(`Translation failed for job ${jobId}:`, error.message);
    throw error;
  }
}
}