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
  Query,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import {
  GrammarDto,
  TextToSpeechDto,
  TranscribeVideoDto,
  TranslateVideoDto,
} from './dto/video.dto';
import type { AuthenticatedVideoRequest } from './interfaces/video.interface';

@Controller('video')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('video'))
  async transcribeVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: TranscribeVideoDto,
    @Req() req: AuthenticatedVideoRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    return this.videoService.transcribeVideo(file, body, req.user.userId);
  }

  @Post('translate')
  async translateVideo(
    @Body() body: TranslateVideoDto,
    @Req() req: AuthenticatedVideoRequest,
  ) {
    return this.videoService.translateVideo(body, req.user.userId);
  }

  @Post('grammar')
  async checkGrammar(@Body() body: GrammarDto) {
    return this.videoService.checkGrammar(body);
  }

  @Post('tts')
  async textToSpeech(
    @Body() body: TextToSpeechDto,
    @Req() req: AuthenticatedVideoRequest,
    @Res() res: Response,
  ) {
    const { audioBuffer, filename } = await this.videoService.textToSpeech(
      body,
      req.user.userId,
    );
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': audioBuffer.length,
    });
    res.end(audioBuffer);
  }

  @Get('tts/history')
  async getTtsHistory(
    @Req() req: AuthenticatedVideoRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 6,
    @Query('search') search = '',
  ) {
    return this.videoService.getTssHistory(
      page,
      limit,
      search,
      req.user.userId,
    );
  }

  @Delete('tts/history/:id')
  async deleteTtsHistory(
    @Req() req: AuthenticatedVideoRequest,
    @Param('id') id: string,
  ) {
    return this.videoService.deleteTtsHistory(id, req.user.userId);
  }
}
