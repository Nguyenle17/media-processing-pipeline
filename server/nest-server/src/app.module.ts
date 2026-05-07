import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { VideoModule } from './video/video.module';
import { FileModule } from './file/file.module';
import { AdminModule } from './admin/admin.module';
import * as dotenv from 'dotenv';
import { BullModule } from '@nestjs/bullmq';
import { JobModule } from './job/job.module';
import { RedisService } from './redis/redis.service';
import { RedisModule } from './redis/redis.module';

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      })
    }), AuthModule, VideoModule, FileModule, JobModule, RedisModule, AdminModule
  ],
  controllers: [AppController],
  providers: [AppService, RedisService],
})
export class AppModule { }
