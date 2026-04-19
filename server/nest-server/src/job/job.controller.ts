import { Controller, Post, Delete, UseGuards, Req, Get, Param, Query } from '@nestjs/common';
import { JobService } from './job.service';
import { Body } from '@nestjs/common';
import { UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('job')
@UseGuards(JwtAuthGuard)
export class JobController {
    constructor(private jobService: JobService) { }

    @Post('create')
    async createJob(
        @Body('title') title: string,
        @Body('totalChunks') totalChunks: number,
        @Body('duration') duration: number,
        @Req() req: any
    ) {
        const userId = req.user.userId;
        return this.jobService.createJob(userId, title, totalChunks, duration);
    }

    @Post('update-chunk')
    async updateChunk(
        @Body('index') index: number,
        @Body('jobId') jobId: string,
        @Body('transcriptText') transcriptText: string,
        @Body('translateText') translateText: string,
        @Body('startTime') startTime: number,
        @Body('endTime') endTime: number,
    ) {
        return this.jobService.updateChunk(index, jobId, transcriptText, translateText, startTime, endTime);
    }

    @Post('complete')
    @UseInterceptors(AnyFilesInterceptor())
    async completeJob(@Body('jobId') jobId: string) {
        return this.jobService.markAsCompleted(jobId);
    }

    @Get('/user')
    async getJobsByUser(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 8,
        @Req() req: any
    ) {
        const userId = req.user.userId;
        return await this.jobService.getJobsByUser(userId, Number(page), Number(limit));
    }

    @Get('/process/:jobId')
    async getProcess(@Param('jobId') jobId: string) {
        return this.jobService.getProcess(jobId);
    }

    @Delete('/delete')
    async deleteJobByUser(
        @Query('jobId') jobId: string,
        @Req() req: any
    ) {
        return await this.jobService.deleteJob(jobId);
    }

    @Get('/chunks')
    async getChunks(
        @Query('jobId') jobId: string,
    ) {
        const response = await this.jobService.getChunks(jobId);
        return response;
    }

    @Get('/:jobId')
    async getJobResult(@Param('jobId') jobId: string) {
        const job = await this.jobService.getJobById(jobId);
        if (!job) return { status: 'not found' };
        if (job.status !== 'completed') return { status: job.status };
        return { status: 'completed', resultText: job.transcriptText };
    }
}