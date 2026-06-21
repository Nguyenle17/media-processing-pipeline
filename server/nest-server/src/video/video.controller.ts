import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('video'))
  async transcribeVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.videoService.transcribeVideo(file, body);
  }

  @Post('translate')
  async translateVideo(@Body() body: { jobId: string; target_lang: string }) {
    return this.videoService.translateVideo(body);
  }

  @Post('grammar')
  async checkGrammar(@Body() body: { text: string }) {
    return this.videoService.checkGrammar(body);
  }

  @Post('tts')
  async textToSpeech(
    @Body() body: { text: string; lang: string },
    @Res() res: Response,
  ) {
    const { audioBuffer, filename } = await this.videoService.textToSpeech(body);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': audioBuffer.length,
    });
    res.end(audioBuffer);
  }
}