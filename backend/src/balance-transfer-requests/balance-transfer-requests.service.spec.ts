import { BadRequestException } from '@nestjs/common';
import {
  BalanceTransferRequestStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  VoteType,
} from '@prisma/client';
import { BalanceTransferRequestsService } from './balance-transfer-requests.service';
import { TransferReviewStatus } from './dto/balance-transfer.dto';

describe('BalanceTransferRequestsService', () => {
  let service: BalanceTransferRequestsService;
  let prisma: {
    balanceTransferRequest: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    membership: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    balanceTransferRequest: { update: jest.Mock };
    decision: { create: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let ledgerService: { recordTransfer: jest.Mock };

  const baseRequest = {
    id: 'request-id',
    fromPathId: 'from-path-id',
    toPathId: 'to-path-id',
    amount: 75,
    reason: 'تغطية عجز مسار',
    status: BalanceTransferRequestStatus.PENDING,
    transactionId: null,
    decisionId: null,
    fromPath: {
      wallet: { entityId: 'entity-id' },
      policy: {
        voteType: VoteType.INDIVIDUAL_WITH_CAP,
        individualSpendingCap: 100,
        quorumPercent: 50,
        approvalPercent: 51,
        votingDurationHours: 48,
      },
    },
  };

  beforeEach(() => {
    tx = {
      balanceTransferRequest: {
        update: jest.fn().mockResolvedValue({
          id: 'request-id',
          status: BalanceTransferRequestStatus.APPROVED,
          decisionId: 'decision-id',
        }),
      },
      decision: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'decision-id',
          ...data,
        })),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-id' }) },
    };

    prisma = {
      balanceTransferRequest: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: 'request-id',
          status: BalanceTransferRequestStatus.EXECUTED,
        }),
      },
      membership: {
        findFirst: jest.fn().mockResolvedValue({ id: 'membership-id' }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    ledgerService = {
      recordTransfer: jest.fn().mockResolvedValue({ id: 'transaction-id' }),
    };

    service = new BalanceTransferRequestsService(
      prisma as never,
      {} as never,
      ledgerService as never,
    );
  });

  it('creates a closed approved decision for individual-with-cap review', async () => {
    prisma.balanceTransferRequest.findUnique.mockResolvedValue(baseRequest);

    const result = await service.reviewRequest('request-id', 'reviewer-id', {
      status: TransferReviewStatus.APPROVED,
    });

    expect(tx.decision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        decisionType: DecisionType.TRANSFER_BALANCE,
        governancePathId: 'from-path-id',
        amount: 75,
        voteType: VoteType.INDIVIDUAL_WITH_CAP,
        status: DecisionStatus.CLOSED,
        result: DecisionResult.APPROVED,
        closedAt: expect.any(Date),
      }),
    });
    expect(tx.balanceTransferRequest.update).toHaveBeenCalledWith({
      where: { id: 'request-id' },
      data: expect.objectContaining({
        status: BalanceTransferRequestStatus.APPROVED,
        reviewedById: 'reviewer-id',
        decisionId: 'decision-id',
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ decisionId: 'decision-id' });
  });

  it('rejects individual-with-cap review when amount exceeds the cap', async () => {
    prisma.balanceTransferRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      fromPath: {
        ...baseRequest.fromPath,
        policy: {
          ...baseRequest.fromPath.policy,
          individualSpendingCap: 50,
        },
      },
    });

    await expect(
      service.reviewRequest('request-id', 'reviewer-id', {
        status: TransferReviewStatus.APPROVED,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.decision.create).not.toHaveBeenCalled();
    expect(tx.balanceTransferRequest.update).not.toHaveBeenCalled();
  });

  it('refuses execution when the approved request has no linked decision', async () => {
    prisma.balanceTransferRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: BalanceTransferRequestStatus.APPROVED,
      decisionId: null,
      decision: null,
    });

    await expect(
      service.executeRequest('request-id', 'executor-id'),
    ).rejects.toThrow('يتطلب تنفيذ النقل قراراً موثقاً');

    expect(ledgerService.recordTransfer).not.toHaveBeenCalled();
  });

  it('refuses execution while the linked decision is still open', async () => {
    prisma.balanceTransferRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: BalanceTransferRequestStatus.APPROVED,
      decisionId: 'decision-id',
      decision: {
        id: 'decision-id',
        status: DecisionStatus.OPEN,
        result: DecisionResult.PENDING,
      },
    });

    await expect(
      service.executeRequest('request-id', 'executor-id'),
    ).rejects.toThrow('القرار المرتبط بالنقل لم يتم اعتماده بعد');

    expect(ledgerService.recordTransfer).not.toHaveBeenCalled();
  });

  it('executes approved requests through the ledger with the linked decision', async () => {
    prisma.balanceTransferRequest.findUnique.mockResolvedValue({
      ...baseRequest,
      status: BalanceTransferRequestStatus.APPROVED,
      decisionId: 'decision-id',
      decision: {
        id: 'decision-id',
        status: DecisionStatus.CLOSED,
        result: DecisionResult.APPROVED,
      },
    });

    await service.executeRequest('request-id', 'executor-id');

    expect(ledgerService.recordTransfer).toHaveBeenCalledWith('executor-id', {
      sourcePathId: 'from-path-id',
      targetPathId: 'to-path-id',
      amount: 75,
      description: 'تغطية عجز مسار',
      reference: expect.stringMatching(/^TRF-/),
      decisionId: 'decision-id',
    });
    expect(prisma.balanceTransferRequest.update).toHaveBeenCalledWith({
      where: { id: 'request-id' },
      data: expect.objectContaining({
        status: BalanceTransferRequestStatus.EXECUTED,
        transactionId: 'transaction-id',
        executedAt: expect.any(Date),
      }),
    });
  });
});
