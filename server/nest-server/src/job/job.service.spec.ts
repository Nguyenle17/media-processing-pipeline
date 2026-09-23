import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { getModelToken } from '@nestjs/mongoose';
import { Job } from './schemas/job.schema';
import { Chunk } from './schemas/chunk.schema';

describe('JobService', () => {
  let service: JobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: getModelToken(Job.name), useValue: {} },
        { provide: getModelToken(Chunk.name), useValue: {} },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
