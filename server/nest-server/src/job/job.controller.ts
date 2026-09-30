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
import type { JobHistoryType } from './type/JobType';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
  };
};

@Controller('job')
@UseGuards(JwtAuthGuard)
export class JobController {
  constructor(private jobService: JobService) {}
  @Post('create')
  async createJob(
    @Body('title') title: string,
    @Body('type') type: 'transcribe' | 'translate',
    @Body('duration') duration: number,
    @Body('targetLang') targetLang: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.jobService.createJob(
      userId,
      title,
      type ?? 'transcribe',
      duration ?? 0,
      targetLang,
    );
  }

  @Get('process/:jobId')
  async getProcess(
    @Param('jobId') jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobService.getProcess(jobId, req.user.userId);
  }

  @Get('result/:jobId')
  async getJobResult(
    @Param('jobId') jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobService.getJobResult(jobId, req.user.userId);
  }

  @Get('history')
  async getHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 8,
    @Query('search') search = '',
    @Query('type') type: JobHistoryType | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobService.getJobsByUser(
      req.user.userId,
      Number(page),
      Number(limit),
      search,
      type,
    );
  }

  @Get('history/:jobId')
  async getHistoryDetail(
    @Param('jobId') jobId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.jobService.getHistoryDetail(jobId, req.user.userId);
  }

  @Get('user')
  async getJobsByUser(
    @Query('page') page = 1,
    @Query('limit') limit = 8,
    @Query('search') search = '',
    @Query('type') type: JobHistoryType | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.jobService.getJobsByUser(
      userId,
      Number(page),
      Number(limit),
      search,
      type,
    );
  }

  @Get('chunks')
  async getChunks(@Query('jobId') jobId: string, @Req() req: AuthenticatedRequest) {
    return this.jobService.getChunks(jobId, req.user.userId);
  }

  @Delete('delete')
  async deleteJob(@Query('jobId') jobId: string, @Req() req: AuthenticatedRequest) {
    return this.jobService.deleteJob(jobId, req.user.userId);
  }
}
