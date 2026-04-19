import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { Job, JobSchema } from './schemas/job.schema';
import { Chunk, ChunkSchema } from './schemas/chunk.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtStrategy } from 'src/auth/jwt.strategy';

@Module({
  imports: [
        MongooseModule.forFeature([
            { name: Job.name, schema: JobSchema },
            { name: Chunk.name, schema: ChunkSchema }, 
        ]),
    ],
  providers: [JobService, JwtStrategy],
  exports: [JobService, MongooseModule],
  controllers: [JobController]
})
export class JobModule { }
