import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { JobModule } from 'src/job/job.module';
import { FileModule } from 'src/file/file.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { VideoProcessor  } from './video.processor'
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    JobModule,
    FileModule,
    HttpModule,
    BullModule.registerQueue({
      name: 'video',
      defaultJobOptions: {
        attempts: 3,
      },
    }),

  ],
  providers: [VideoService, VideoProcessor, JwtStrategy],
  controllers: [VideoController]
})
export class VideoModule { }
