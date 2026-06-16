import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
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
}