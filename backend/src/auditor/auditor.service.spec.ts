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

  it('presents audit logs as readable timeline items', async () => {
    const prisma = {
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-id' }),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'audit-id',
            action: 'CREATE',
            personId: 'person-id',
            entityId: 'entity-id',
            targetType: 'ledger_transactions',
            targetId: '12345678-1111-1111-1111-111111111111',
            oldValue: null,
            newValue: {
              type: 'DISBURSEMENT',
              amount: 250,
              pathId: '87654321-2222-2222-2222-222222222222',
              decisionId: '11111111-3333-3333-3333-333333333333',
            },
            ipAddress: null,
            userAgent: null,
            createdAt: new Date('2026-06-28T10:00:00.000Z'),
            person: { id: 'person-id', name: 'سارة الهاشمي' },
            entity: { id: 'entity-id', name: 'صندوق عائلة الهاشمي' },
          },
        ]),
      },
    };
    const timelineService = new AuditorService(
      prisma as unknown as PrismaService,
    );

    const [item] = await timelineService.getAuditLogs(
      'entity-id',
      'person-id',
    );

    expect(item.title).toBe('سارة الهاشمي أنشأ عملية مالية');
    expect(item.context).toContain('صندوق عائلة الهاشمي');
    expect(item.effect).toContain('صرف بقيمة');
    expect(item.severity).toBe('HIGH');
    expect(item.linkedRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'decisions', shortId: '11111111' }),
        expect.objectContaining({
          type: 'governance_paths',
          shortId: '87654321',
        }),
      ]),
    );
  });

  it('links dispute audit events back to the related disbursement request', async () => {
    const prisma = {
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-id' }),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'audit-dispute-id',
            action: 'CREATE',
            personId: 'person-id',
            entityId: 'entity-id',
            targetType: 'disputes',
            targetId: 'aaaaaaaa-1111-1111-1111-111111111111',
            oldValue: null,
            newValue: {
              type: 'UNFAIR_DECISION',
              disbursementRequestId: 'bbbbbbbb-2222-2222-2222-222222222222',
              decisionId: 'cccccccc-3333-3333-3333-333333333333',
            },
            ipAddress: null,
            userAgent: null,
            createdAt: new Date('2026-06-28T11:00:00.000Z'),
            person: { id: 'person-id', name: 'ليان العتيبي' },
            entity: { id: 'entity-id', name: 'صندوق عائلة الهاشمي' },
          },
        ]),
      },
    };
    const timelineService = new AuditorService(
      prisma as unknown as PrismaService,
    );

    const [item] = await timelineService.getAuditLogs(
      'entity-id',
      'person-id',
    );

    expect(item.effect).toContain('أثر نزاع');
    expect(item.severity).toBe('HIGH');
    expect(item.linkedRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'disputes', shortId: 'aaaaaaaa' }),
        expect.objectContaining({
          type: 'disbursement_requests',
          shortId: 'bbbbbbbb',
        }),
        expect.objectContaining({ type: 'decisions', shortId: 'cccccccc' }),
      ]),
    );
  });
});
