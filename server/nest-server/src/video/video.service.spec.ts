import { Test, TestingModule } from '@nestjs/testing';
import { VideoService } from './video.service';
import { FileService } from '../file/file.service';
import { JobService } from '../job/job.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('VideoService', () => {
  let service: VideoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        { provide: FileService, useValue: {} },
        { provide: JobService, useValue: {} },
        { provide: getQueueToken('video'), useValue: {} },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
