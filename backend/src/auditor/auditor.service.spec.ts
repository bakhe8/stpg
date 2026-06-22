import { Test, TestingModule } from '@nestjs/testing';
import { AuditorService } from './auditor.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditorService', () => {
  let service: AuditorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditorService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<AuditorService>(AuditorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
