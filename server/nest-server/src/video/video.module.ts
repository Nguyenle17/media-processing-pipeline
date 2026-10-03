import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { JobModule } from 'src/job/job.module';
import { FileModule } from 'src/file/file.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { VideoProcessor } from './video.processor';
import { JwtStrategy } from '../auth/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from './schemas/video.schema';

@Module({
  imports: [
    JobModule,
    FileModule,
    UsersModule,
    HttpModule,
    CloudinaryModule,
    MongooseModule.forFeature([{ name: Video.name, schema: VideoSchema }]),
    BullModule.registerQueue({
      name: 'video',
      defaultJobOptions: {
        attempts: 3,
      },
    }),
  ],
  providers: [VideoService, VideoProcessor, JwtStrategy],
  controllers: [VideoController],
})
export class VideoModule {}
