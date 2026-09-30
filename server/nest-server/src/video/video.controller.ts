import {
  Controller,
  Post,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('video'))
  async transcribeVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    return this.videoService.transcribeVideo(file, body, req.user.userId);
  }

  @Post('translate')
  async translateVideo(
    @Body() body: { jobId: string; target_lang: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.videoService.translateVideo(body, req.user.userId);
  }

  @Post('grammar')
  async checkGrammar(@Body() body: { text: string }) {
    return this.videoService.checkGrammar(body);
  }

  @Post('tts')
  async textToSpeech(
    @Body() body: { text: string; language: string },
    @Res() res: Response,
  ) {
    const { audioBuffer, filename } =
      await this.videoService.textToSpeech(body);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': audioBuffer.length,
    });
    res.end(audioBuffer);
  }
}
