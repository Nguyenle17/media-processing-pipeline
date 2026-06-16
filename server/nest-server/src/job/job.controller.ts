import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JobService } from './job.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('job')
@UseGuards(JwtAuthGuard)
export class JobController {
  constructor(private jobService: JobService) {}
  @Post('create')
  async createJob(
    @Body('title') title: string,
    @Body('type') type: 'transcript' | 'translate',
    @Body('duration') duration: number,
    @Body('targetLang') targetLang: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.jobService.createJob(
      userId,
      title,
      type ?? 'transcript',
      duration ?? 0,
      targetLang,
    );
  }

  @Get('process/:jobId')
  async getProcess(@Param('jobId') jobId: string) {
    return this.jobService.getProcess(jobId);
  }

  @Get('result/:jobId')
  async getJobResult(@Param('jobId') jobId: string) {
    return this.jobService.getJobResult(jobId);
  }

  @Get('user')
  async getJobsByUser(
    @Query('page') page = 1,
    @Query('limit') limit = 8,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.jobService.getJobsByUser(userId, Number(page), Number(limit));
  }

  @Get('chunks')
  async getChunks(@Query('jobId') jobId: string) {
    return this.jobService.getChunks(jobId);
  }

  @Delete('delete')
  async deleteJob(@Query('jobId') jobId: string) {
    return this.jobService.deleteJob(jobId);
  }
}