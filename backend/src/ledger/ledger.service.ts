import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from '../rules/rules.service';
import {
  AuditAction,
  DecisionExecutionStatus,
  DecisionResult,
  DecisionStatus,
  DecisionType,
  EntityRelationshipType,
  LedgerAccountType,
  LedgerEntryType,
  PaymentDueStatus,
  LedgerTransactionType,
  MemberRole,
  MoneyType,
  MoneyOriginKind,
  Prisma,
  SubscriptionState,
  VotersScope,
} from '@prisma/client';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RecordDisbursementDto } from './dto/record-disbursement.dto';
import { RecordTransferDto } from './dto/record-transfer.dto';
import { RecordReversalDto } from './dto/record-reversal.dto';
import { RecordEntitySupportDto } from './dto/record-entity-support.dto';

interface DecisionDisbursementProgress {
  approvedAmount: number;
  executedAmount: number;
  remainingAmount: number;
}

type LedgerPrismaClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
  ) {}

  // ── تسجيل دفعة اشتراك ────────────────────────────────────────────
  async recordPayment(adminId: string, dto: RecordPaymentDto) {
    return this.prisma.$transaction((tx) =>
      this.recordPaymentWithClient(tx, adminId, dto),
    );
  }

  async recordPaymentWithClient(
    client: LedgerPrismaClient,
    adminId: string,
    dto: RecordPaymentDto,
  ) {
    const subscription = await client.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: {
        governancePath: {
          include: {
            wallet: { select: { entityId: true } },
            ledgerAccount: true,
          },
        },
        membership: { select: { id: true, personId: true } },
      },
    });
    if (!subscription) throw new NotFoundException('الاشتراك غير موجود');

    const entityId = subscription.governancePath.wallet.entityId;
    await this.requireTreasurerOrAdmin(entityId, adminId, client);

    if (
      subscription.state !== SubscriptionState.ACTIVE &&
      subscription.state !== SubscriptionState.CONDITIONAL &&
      subscription.state !== SubscriptionState.SUPPORTER_ONLY
    ) {
      throw new BadRequestException(
        'لا يمكن تسجيل دفعة لاشتراك غير فعّال أو غير مؤكد',
      );
    }

    const pathAccount = subscription.governancePath.ledgerAccount;
    if (!pathAccount) {
      throw new BadRequestException('لا يوجد حساب دفتري لهذا المسار');
    }

    let paymentDue: {
      id: string;
      subscriptionId: string;
      amountDue: Prisma.Decimal;
      status: PaymentDueStatus;
      transactionId: string | null;
    } | null = null;

    if (dto.paymentDueId) {
      paymentDue = await client.paymentDue.findUnique({
        where: { id: dto.paymentDueId },
        select: {
          id: true,
          subscriptionId: true,
          amountDue: true,
          status: true,
          transactionId: true,
        },
      });
      if (!paymentDue) {
        throw new NotFoundException('الدفعة المستحقة غير موجودة');
      }
      if (paymentDue.subscriptionId !== dto.subscriptionId) {
        throw new BadRequestException('الدفعة المستحقة لا تنتمي لهذا الاشتراك');
      }
      if (
        paymentDue.status !== PaymentDueStatus.PENDING &&
        paymentDue.status !== PaymentDueStatus.OVERDUE
      ) {
        throw new BadRequestException('هذه الدفعة لم تعد متاحة للتسديد');
      }
      if (paymentDue.transactionId) {
        throw new BadRequestException('هذه الدفعة مرتبطة بعملية سداد مسبقاً');
      }

      const dueAmount = Number(paymentDue.amountDue);
      if (Math.abs(dueAmount - dto.amount) > 0.009) {
        throw new BadRequestException(
          'مبلغ السداد يجب أن يطابق مبلغ الدفعة المستحقة',
        );
      }
    }

    const duplicateReference = await client.ledgerTransaction.findFirst({
      where: {
        type: LedgerTransactionType.SUBSCRIPTION_PAYMENT,
        reference: dto.reference,
      },
      select: { id: true },
    });
    if (duplicateReference) {
      throw new BadRequestException('رقم مرجع الدفع مستخدم مسبقاً');
    }

    const externalAccount = await client.ledgerAccount.create({
      data: { type: LedgerAccountType.EXTERNAL },
    });

    const txn = await client.ledgerTransaction.create({
      data: {
        type: LedgerTransactionType.SUBSCRIPTION_PAYMENT,
        moneyType: MoneyType.SUBSCRIPTION,
        originKind: MoneyOriginKind.SUBSCRIPTION_PAYMENT,
        amount: dto.amount,
        description: dto.description ?? `دفعة اشتراك - ${subscription.id}`,
        reference: dto.reference,
        approvedById: adminId,
        decisionId: null,
        sourceMembershipId: subscription.membership.id,
        sourceEntityId: entityId,
        originEntityId: entityId,
        originWalletId: subscription.governancePath.walletId,
        originGovernancePathId: subscription.governancePathId,
        originMembershipId: subscription.membership.id,
        originPersonId: subscription.membership.personId,
        originNote: dto.paymentDueId
          ? `payment_due:${dto.paymentDueId}`
          : undefined,
        attachments: dto.attachments ?? [],
        entries: {
          create: [
            {
              accountId: externalAccount.id,
              type: LedgerEntryType.DEBIT,
              amount: dto.amount,
            },
            {
              accountId: pathAccount.id,
              type: LedgerEntryType.CREDIT,
              amount: dto.amount,
            },
          ],
        },
      },
      include: { entries: true },
    });

    await client.ledgerAccount.update({
      where: { id: pathAccount.id },
      data: { balance: { increment: dto.amount } },
    });
    await client.ledgerAccount.update({
      where: { id: externalAccount.id },
      data: { balance: { decrement: dto.amount } },
    });
    await this.adjustAggregateBalances(
      client,
      subscription.governancePath.walletId,
      entityId,
      dto.amount,
    );

    if (paymentDue) {
      await client.paymentDue.update({
        where: { id: paymentDue.id },
        data: {
          status: PaymentDueStatus.PAID,
          settledAt: new Date(),
          transactionId: txn.id,
        },
      });
    }

    await client.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: adminId,
        entityId,
        targetType: 'ledger_transactions',
        targetId: txn.id,
        newValue: {
          type: 'PAYMENT',
          amount: dto.amount,
          subscriptionId: dto.subscriptionId,
          paymentDueId: dto.paymentDueId ?? null,
          payerId: subscription.membership.personId,
        },
      },
    });

    return txn;
  }

  // ── تسجيل صرف ────────────────────────────────────────────────────
  async recordDisbursement(adminId: string, dto: RecordDisbursementDto) {
    try {
      return await this.recordDisbursementCore(adminId, dto);
    } catch (error) {
      await this.auditFinancialValidationFailure(adminId, dto, error);
      throw error;
    }
  }

  private async recordDisbursementCore(
    adminId: string,
    dto: RecordDisbursementDto,
  ) {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: dto.pathId },
      include: {
        wallet: { select: { entityId: true } },
        ledgerAccount: true,
        policy: true,
      },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');

    const entityId = path.wallet.entityId;
    await this.requireTreasurerOrAdmin(entityId, adminId);

    const pathAccount = path.ledgerAccount;
    if (!pathAccount) {
      throw new BadRequestException('لا يوجد حساب دفتري لهذا المسار');
    }

    const spendingItem = await this.prisma.spendingItem.findUnique({
      where: { id: dto.spendingItemId },
      include: { ledgerAccount: true },
    });
    if (
      !spendingItem ||
      spendingItem.governancePathId !== dto.pathId ||
      !spendingItem.isActive
    ) {
      throw new BadRequestException('بند الصرف غير صالح لهذا المسار');
    }
    if (!spendingItem.ledgerAccount) {
      throw new BadRequestException('لا يوجد حساب دفتري لبند الصرف');
    }
    const spendingItemAccount = spendingItem.ledgerAccount;
    if (
      spendingItem.maxAmountPerRequest &&
      dto.amount > Number(spendingItem.maxAmountPerRequest)
    ) {
      throw new BadRequestException('المبلغ يتجاوز سقف الطلب لبند الصرف');
    }

    const decision = await this.prisma.decision.findUnique({
      where: { id: dto.decisionId },
    });
    if (
      !decision ||
      decision.decisionType !== DecisionType.DISBURSE_FUNDS ||
      decision.status !== DecisionStatus.CLOSED ||
      decision.result !== DecisionResult.APPROVED ||
      decision.governancePathId !== dto.pathId ||
      decision.spendingItemId !== dto.spendingItemId
    ) {
      throw new BadRequestException(
        'يتطلب الصرف قرار DISBURSE_FUNDS مغلقاً ومعتمداً ومطابقاً',
      );
    }
    if (decision.amount === null) {
      throw new BadRequestException(
        'قرار الصرف المعتمد يجب أن يحتوي على مبلغ سقف واضح',
      );
    }
    if (
      spendingItem.requiresCommitteeApproval &&
      decision.votersScope !== VotersScope.COMMITTEE
    ) {
      throw new BadRequestException('بند الصرف يتطلب موافقة اللجنة');
    }
    if (
      (path.policy?.requiresDocuments ||
        spendingItem.requiredDocuments.length > 0) &&
      decision.attachments.length + (dto.attachments?.length ?? 0) === 0
    ) {
      throw new BadRequestException('مستندات الإثبات مطلوبة لهذا الصرف');
    }

    if (Number(pathAccount.balance) < dto.amount) {
      throw new BadRequestException(
        `الرصيد غير كافٍ — الرصيد الحالي: ${pathAccount.balance.toString()}`,
      );
    }

    if (spendingItem.maxAmountPerYear) {
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const yearlyTotal = await this.prisma.ledgerTransaction.aggregate({
        where: {
          type: LedgerTransactionType.DISBURSEMENT,
          isReversed: false,
          createdAt: { gte: startOfYear },
          decision: { spendingItemId: dto.spendingItemId },
        },
        _sum: { amount: true },
      });
      if (
        Number(yearlyTotal._sum.amount ?? 0) + dto.amount >
        Number(spendingItem.maxAmountPerYear)
      ) {
        throw new BadRequestException('المبلغ يتجاوز السقف السنوي لبند الصرف');
      }
    }

    const rulesResult = await this.rulesService.evaluateSpendingRules(
      dto.pathId,
      dto.amount,
      dto.spendingItemId,
      {
        attachmentsCount:
          decision.attachments.length + (dto.attachments?.length ?? 0),
      },
    );
    if (!rulesResult.allowed) {
      throw new BadRequestException(
        `يُخالف الصرف القواعد المحددة: ${rulesResult.violations.join('؛ ')}`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const progress = await this.getDecisionDisbursementProgress(
          tx,
          dto.decisionId,
          Number(decision.amount),
        );

        if (progress.remainingAmount <= 0) {
          throw new BadRequestException(
            'تم استنفاد مبلغ القرار المعتمد بالكامل',
          );
        }

        if (dto.amount > progress.remainingAmount) {
          throw new BadRequestException(
            `المبلغ يتجاوز المتبقي من القرار المعتمد (${progress.remainingAmount.toFixed(2)} ر.س)`,
          );
        }

        const entries: {
          accountId: string;
          type: LedgerEntryType;
          amount: number;
        }[] = [
          {
            accountId: pathAccount.id,
            type: LedgerEntryType.DEBIT,
            amount: dto.amount,
          },
          {
            accountId: spendingItemAccount.id,
            type: LedgerEntryType.CREDIT,
            amount: dto.amount,
          },
        ];

        const txn = await tx.ledgerTransaction.create({
          data: {
            type: LedgerTransactionType.DISBURSEMENT,
            moneyType: MoneyType.CASE_DONATION,
            originKind: MoneyOriginKind.PATH_DISBURSEMENT,
            amount: dto.amount,
            description: dto.description,
            reference: dto.reference,
            approvedById: adminId,
            decisionId: dto.decisionId,
            sourceEntityId: entityId,
            originEntityId: entityId,
            originWalletId: path.walletId,
            originGovernancePathId: dto.pathId,
            originNote: `spending_item:${dto.spendingItemId}`,
            attachments: dto.attachments ?? [],
            entries: { create: entries },
          },
          include: { entries: true },
        });

        const debited = await tx.ledgerAccount.updateMany({
          where: { id: pathAccount.id, balance: { gte: dto.amount } },
          data: { balance: { decrement: dto.amount } },
        });
        if (debited.count !== 1) {
          throw new BadRequestException('الرصيد لم يعد كافياً لإتمام الصرف');
        }
        await tx.ledgerAccount.update({
          where: { id: spendingItemAccount.id },
          data: { balance: { increment: dto.amount } },
        });
        await this.adjustAggregateBalances(
          tx,
          path.walletId,
          entityId,
          -dto.amount,
        );

        await tx.auditLog.create({
          data: {
            action: AuditAction.DISBURSE,
            personId: adminId,
            entityId,
            targetType: 'ledger_transactions',
            targetId: txn.id,
            newValue: {
              type: 'DISBURSEMENT',
              amount: dto.amount,
              pathId: dto.pathId,
              spendingItemId: dto.spendingItemId,
              decisionId: dto.decisionId,
            },
          },
        });

        await this.setDecisionExecutionStatus(tx, dto.decisionId, {
          executionStatus:
            progress.executedAmount + dto.amount >= Number(decision.amount)
              ? DecisionExecutionStatus.COMPLETED
              : DecisionExecutionStatus.PARTIAL,
        });

        return txn;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // ── تحويل بين مسارين ─────────────────────────────────────────────
  async recordTransfer(adminId: string, dto: RecordTransferDto) {
    const [sourcePath, targetPath] = await Promise.all([
      this.prisma.governancePath.findUnique({
        where: { id: dto.sourcePathId },
        include: {
          wallet: { select: { entityId: true } },
          ledgerAccount: true,
          policy: true,
        },
      }),
      this.prisma.governancePath.findUnique({
        where: { id: dto.targetPathId },
        include: {
          wallet: { select: { entityId: true } },
          ledgerAccount: true,
        },
      }),
    ]);

    if (!sourcePath) throw new NotFoundException('المسار المصدر غير موجود');
    if (!targetPath) throw new NotFoundException('المسار الهدف غير موجود');

    const entityId = sourcePath.wallet.entityId;
    if (targetPath.wallet.entityId !== entityId) {
      throw new BadRequestException('لا يمكن التحويل بين كيانات مختلفة');
    }

    await this.requireTreasurerOrAdmin(entityId, adminId);

    if (!sourcePath.policy?.allowBalanceTransfer) {
      throw new ForbiddenException('سياسة المسار لا تسمح بنقل الأرصدة');
    }

    const transferRules = await this.rulesService.evaluateTransferRules({
      entityId,
      sourceWalletId: sourcePath.walletId,
      sourcePathId: dto.sourcePathId,
      targetWalletId: targetPath.walletId,
      targetPathId: dto.targetPathId,
      amount: dto.amount,
    });
    if (!transferRules.allowed) {
      throw new BadRequestException(
        `يُخالف النقل القواعد المحددة: ${transferRules.violations.join('؛ ')}`,
      );
    }

    if (!sourcePath.ledgerAccount || !targetPath.ledgerAccount) {
      throw new BadRequestException('أحد المسارين لا يملك حساباً دفترياً');
    }
    const sourceAccount = sourcePath.ledgerAccount;
    const targetAccount = targetPath.ledgerAccount;

    const decision = await this.prisma.decision.findUnique({
      where: { id: dto.decisionId },
    });
    const isMergeDecision = decision?.decisionType === DecisionType.MERGE_PATHS;
    const decisionSourceMatches = isMergeDecision
      ? decision?.subjectId === dto.sourcePathId
      : decision?.governancePathId === dto.sourcePathId;

    if (
      !decision ||
      (decision.decisionType !== DecisionType.TRANSFER_BALANCE &&
        !isMergeDecision) ||
      decision.status !== DecisionStatus.CLOSED ||
      decision.result !== DecisionResult.APPROVED ||
      !decisionSourceMatches
    ) {
      throw new BadRequestException(
        'يتطلب التحويل قرار TRANSFER_BALANCE أو MERGE_PATHS مغلقاً ومعتمداً ومطابقاً',
      );
    }
    if (
      !isMergeDecision &&
      decision.amount !== null &&
      Number(decision.amount) !== dto.amount
    ) {
      throw new BadRequestException(
        'مبلغ التحويل لا يطابق مبلغ القرار المعتمد',
      );
    }

    if (Number(sourceAccount.balance) < dto.amount) {
      throw new BadRequestException('الرصيد غير كافٍ في المسار المصدر');
    }

    return this.prisma.$transaction(async (tx) => {
      const txn = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.TRANSFER,
          moneyType: MoneyType.ENTITY_SUPPORT,
          originKind: MoneyOriginKind.PATH_TRANSFER,
          amount: dto.amount,
          description: dto.description,
          reference: dto.reference,
          approvedById: adminId,
          decisionId: dto.decisionId,
          sourceEntityId: entityId,
          originEntityId: entityId,
          originWalletId: sourcePath.walletId,
          originGovernancePathId: dto.sourcePathId,
          originNote: `target_path:${dto.targetPathId}`,
          attachments: [],
          entries: {
            create: [
              {
                accountId: sourceAccount.id,
                type: LedgerEntryType.DEBIT,
                amount: dto.amount,
              },
              {
                accountId: targetAccount.id,
                type: LedgerEntryType.CREDIT,
                amount: dto.amount,
              },
            ],
          },
        },
        include: { entries: true },
      });

      const debited = await tx.ledgerAccount.updateMany({
        where: { id: sourceAccount.id, balance: { gte: dto.amount } },
        data: { balance: { decrement: dto.amount } },
      });
      if (debited.count !== 1) {
        throw new BadRequestException('الرصيد لم يعد كافياً في المسار المصدر');
      }
      await tx.ledgerAccount.update({
        where: { id: targetAccount.id },
        data: { balance: { increment: dto.amount } },
      });
      if (sourcePath.walletId !== targetPath.walletId) {
        await this.adjustWalletBalance(tx, sourcePath.walletId, -dto.amount);
        await this.adjustWalletBalance(tx, targetPath.walletId, dto.amount);
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.TRANSFER,
          personId: adminId,
          entityId,
          targetType: 'ledger_transactions',
          targetId: txn.id,
          newValue: {
            type: 'TRANSFER',
            amount: dto.amount,
            from: dto.sourcePathId,
            to: dto.targetPathId,
            decisionId: dto.decisionId,
          },
        },
      });

      if (dto.decisionId) {
        await this.setDecisionExecutionStatus(tx, dto.decisionId, {
          executionStatus: 'COMPLETED',
        });
      }

      return txn;
    });
  }

  async recordReversal(
    originalTransactionId: string,
    adminId: string,
    dto: RecordReversalDto,
  ) {
    const original = await this.prisma.ledgerTransaction.findUnique({
      where: { id: originalTransactionId },
      include: {
        entries: {
          include: {
            account: {
              include: {
                entity: { select: { id: true } },
                wallet: { select: { entityId: true } },
                governancePath: {
                  select: {
                    walletId: true,
                    wallet: { select: { entityId: true } },
                  },
                },
                spendingItem: {
                  select: {
                    governancePath: {
                      select: {
                        wallet: { select: { entityId: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!original) throw new NotFoundException('العملية الأصلية غير موجودة');
    if (
      original.isReversed ||
      original.type === LedgerTransactionType.REVERSAL
    ) {
      throw new BadRequestException('لا يمكن عكس هذه العملية');
    }

    // BL-036 — حد زمني على العكس (قابل للتكوين عبر REVERSAL_WINDOW_DAYS)
    const windowDays = parseInt(process.env.REVERSAL_WINDOW_DAYS ?? '90', 10);
    const daysSince = Math.floor(
      (Date.now() - original.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSince > windowDays) {
      throw new BadRequestException(
        `لا يمكن عكس معاملة أقدم من ${windowDays} يوماً (مضى ${daysSince} يوماً)`,
      );
    }

    const entityIds = new Set(
      original.entries
        .map((entry) => this.resolveAccountEntityId(entry.account))
        .filter((id): id is string => Boolean(id)),
    );
    if (entityIds.size !== 1) {
      throw new BadRequestException(
        'تعذر تحديد كيان واحد للعملية المراد عكسها',
      );
    }
    const entityId = [...entityIds][0];
    await this.requireTreasurerOrAdmin(entityId, adminId);

    return this.prisma.$transaction(async (tx) => {
      const reversal = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.REVERSAL,
          moneyType: original.moneyType,
          originKind: MoneyOriginKind.REVERSAL,
          amount: original.amount,
          description: `عكس العملية ${original.id}: ${dto.reason}`,
          reference: original.reference,
          approvedById: adminId,
          decisionId: original.decisionId,
          reversedTransactionId: original.id,
          sourceMembershipId: original.sourceMembershipId,
          sourceEntityId: original.sourceEntityId,
          originEntityId: original.originEntityId,
          originWalletId: original.originWalletId,
          originGovernancePathId: original.originGovernancePathId,
          originMembershipId: original.originMembershipId,
          originPersonId: original.originPersonId,
          originNote: `reversal_of:${original.id}`,
          attachments: [],
          entries: {
            create: original.entries.map((entry) => ({
              accountId: entry.accountId,
              type:
                entry.type === LedgerEntryType.DEBIT
                  ? LedgerEntryType.CREDIT
                  : LedgerEntryType.DEBIT,
              amount: entry.amount,
            })),
          },
        },
        include: { entries: true },
      });

      for (const entry of original.entries) {
        const delta =
          entry.type === LedgerEntryType.DEBIT
            ? Number(entry.amount)
            : -Number(entry.amount);
        await tx.ledgerAccount.update({
          where: { id: entry.accountId },
          data: {
            balance:
              delta >= 0
                ? { increment: delta }
                : { decrement: Math.abs(delta) },
          },
        });

        if (entry.account.governancePath) {
          await this.adjustAggregateBalances(
            tx,
            entry.account.governancePath.walletId,
            entityId,
            delta,
          );
        }
      }

      await tx.ledgerTransaction.update({
        where: { id: original.id },
        data: { isReversed: true },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          personId: adminId,
          entityId,
          targetType: 'ledger_transactions',
          targetId: original.id,
          oldValue: { isReversed: false },
          newValue: {
            isReversed: true,
            reversalTransactionId: reversal.id,
            reason: dto.reason,
          },
        },
      });

      if (
        original.decisionId &&
        (original.type === LedgerTransactionType.DISBURSEMENT ||
          original.type === LedgerTransactionType.TRANSFER)
      ) {
        await this.recomputeDecisionExecutionState(tx, original.decisionId);
      }

      return reversal;
    });
  }

  // ── ملخص مالي للكيان ──────────────────────────────────────────────
  async getEntitySummary(entityId: string, requesterId: string) {
    await this.requireMember(entityId, requesterId);

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        ledgerAccount: { select: { balance: true, currency: true } },
        wallets: {
          where: { isActive: true },
          include: {
            ledgerAccount: { select: { balance: true, currency: true } },
            governancePaths: {
              where: { isActive: true },
              include: {
                ledgerAccount: {
                  select: { id: true, balance: true, currency: true },
                },
                _count: {
                  select: { subscriptions: { where: { state: 'ACTIVE' } } },
                },
              },
            },
          },
        },
      },
    });
    if (!entity) throw new NotFoundException('الكيان غير موجود');
    return entity;
  }

  // ── سجل معاملات حساب ────────────────────────────────────────────
  async getAccountTransactions(accountId: string, requesterId: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: accountId },
      include: {
        entity: { select: { id: true } },
        wallet: { select: { entityId: true } },
        governancePath: {
          select: { wallet: { select: { entityId: true } } },
        },
        spendingItem: {
          select: {
            governancePath: {
              select: { wallet: { select: { entityId: true } } },
            },
          },
        },
      },
    });
    if (!account) throw new NotFoundException('الحساب الدفتري غير موجود');

    const entityId = this.resolveAccountEntityId(account);
    if (!entityId) {
      throw new ForbiddenException('لا يمكن الوصول مباشرة إلى حساب خارجي');
    }
    await this.requireMember(entityId, requesterId);

    const entries = await this.prisma.ledgerEntry.findMany({
      where: { accountId },
      include: {
        transaction: {
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            reference: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      account: {
        id: account.id,
        balance: account.balance,
        type: account.type,
      },
      entries,
    };
  }

  // ── دعم مالي من كيان لآخر ──────────────────────────────────────
  async recordEntitySupport(adminId: string, dto: RecordEntitySupportDto) {
    const [sourcePath, targetPath] = await Promise.all([
      this.prisma.governancePath.findUnique({
        where: { id: dto.sourcePathId },
        include: {
          wallet: { select: { entityId: true } },
          ledgerAccount: true,
        },
      }),
      this.prisma.governancePath.findUnique({
        where: { id: dto.targetPathId },
        include: {
          wallet: { select: { entityId: true } },
          ledgerAccount: true,
        },
      }),
    ]);

    if (!sourcePath) throw new NotFoundException('المسار المصدر غير موجود');
    if (!targetPath) throw new NotFoundException('المسار الهدف غير موجود');

    const sourceEntityId = sourcePath.wallet.entityId;
    const targetEntityId = targetPath.wallet.entityId;

    if (sourceEntityId === targetEntityId) {
      throw new BadRequestException(
        'المصدر والهدف في نفس الكيان — استخدم التحويل العادي',
      );
    }

    const relationship = await this.prisma.entityRelationship.findFirst({
      where: {
        type: EntityRelationshipType.FINANCIAL_SUPPORT,
        isActive: true,
        sourceEntityId,
        targetEntityId,
      },
    });
    if (!relationship) {
      throw new ForbiddenException('لا توجد علاقة دعم مالي نشطة بين الكيانين');
    }

    await this.requireTreasurerOrAdmin(sourceEntityId, adminId);
    await this.validateEntitySupportDecision(dto, sourceEntityId);

    const sourceAccount = sourcePath.ledgerAccount;
    if (!sourceAccount)
      throw new BadRequestException('لا يوجد حساب دفتري للمسار المصدر');
    const targetAccount = targetPath.ledgerAccount;
    if (!targetAccount)
      throw new BadRequestException('لا يوجد حساب دفتري للمسار الهدف');

    return this.prisma.$transaction(async (tx) => {
      const txn = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.ENTITY_SUPPORT,
          moneyType: MoneyType.ENTITY_SUPPORT,
          originKind: MoneyOriginKind.UNSPECIFIED,
          amount: dto.amount,
          description: dto.description,
          reference: dto.reference ?? null,
          decisionId: dto.decisionId,
          approvedById: adminId,
          sourceEntityId,
          originEntityId: sourceEntityId,
          originWalletId: sourcePath.walletId,
          originGovernancePathId: dto.sourcePathId,
          entries: {
            create: [
              {
                accountId: sourceAccount.id,
                type: LedgerEntryType.DEBIT,
                amount: dto.amount,
              },
              {
                accountId: targetAccount.id,
                type: LedgerEntryType.CREDIT,
                amount: dto.amount,
              },
            ],
          },
        },
        include: { entries: true },
      });

      const debited = await tx.ledgerAccount.updateMany({
        where: { id: sourceAccount.id, balance: { gte: dto.amount } },
        data: { balance: { decrement: dto.amount } },
      });
      if (debited.count !== 1) {
        throw new BadRequestException('الرصيد غير كافٍ لإتمام الدعم');
      }

      await tx.ledgerAccount.update({
        where: { id: targetAccount.id },
        data: { balance: { increment: dto.amount } },
      });

      await this.adjustAggregateBalances(
        tx,
        sourcePath.walletId,
        sourceEntityId,
        -dto.amount,
      );
      await this.adjustAggregateBalances(
        tx,
        targetPath.walletId,
        targetEntityId,
        dto.amount,
      );

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          personId: adminId,
          entityId: sourceEntityId,
          targetType: 'ledger_transactions',
          targetId: txn.id,
          newValue: {
            type: 'ENTITY_SUPPORT',
            amount: dto.amount,
            sourcePathId: dto.sourcePathId,
            targetPathId: dto.targetPathId,
            targetEntityId,
            decisionId: dto.decisionId,
          },
        },
      });

      return txn;
    });
  }

  private async validateEntitySupportDecision(
    dto: RecordEntitySupportDto,
    sourceEntityId: string,
  ) {
    const decision = await this.prisma.decision.findUnique({
      where: { id: dto.decisionId },
      include: {
        governancePath: {
          select: { wallet: { select: { entityId: true } } },
        },
      },
    });

    if (!decision) {
      throw new NotFoundException('قرار الدعم المالي غير موجود');
    }

    if (
      decision.status !== DecisionStatus.CLOSED ||
      decision.result !== DecisionResult.APPROVED
    ) {
      throw new ForbiddenException(
        'قرار الدعم المالي يجب أن يكون مغلقاً وموافقاً عليه',
      );
    }

    if (
      decision.decisionType !== DecisionType.DISBURSE_FUNDS &&
      decision.decisionType !== DecisionType.TRANSFER_BALANCE
    ) {
      throw new BadRequestException(
        'نوع القرار لا يسمح بتسجيل دعم مالي بين الكيانات',
      );
    }

    if (decision.amount && Number(decision.amount) !== dto.amount) {
      throw new BadRequestException('مبلغ القرار لا يطابق مبلغ الدعم المالي');
    }

    const decisionBelongsToSource =
      (decision.subjectType === 'ENTITY' &&
        decision.subjectId === sourceEntityId) ||
      (decision.subjectType === 'PATH' &&
        decision.subjectId === dto.sourcePathId) ||
      decision.governancePathId === dto.sourcePathId ||
      decision.governancePath?.wallet.entityId === sourceEntityId;

    if (!decisionBelongsToSource) {
      throw new ForbiddenException('قرار الدعم لا يخص الكيان أو المسار المصدر');
    }
  }

  // ── لقطة رصيد شهرية ─────────────────────────────────────────────
  async takeSnapshot(accountId: string, adminId: string) {
    const account = await this.prisma.ledgerAccount.findUnique({
      where: { id: accountId },
      include: {
        entity: { select: { id: true } },
        wallet: { select: { entityId: true } },
        governancePath: {
          select: { wallet: { select: { entityId: true } } },
        },
        spendingItem: {
          select: {
            governancePath: {
              select: { wallet: { select: { entityId: true } } },
            },
          },
        },
      },
    });
    if (!account) throw new NotFoundException('الحساب الدفتري غير موجود');
    const entityId = this.resolveAccountEntityId(account);
    if (!entityId) {
      throw new ForbiddenException('لا يمكن أخذ لقطة لحساب خارجي');
    }
    await this.requireTreasurerOrAdmin(entityId, adminId);

    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const existing = await this.prisma.balanceSnapshot.findFirst({
      where: { accountId, period },
    });
    if (existing) throw new BadRequestException('يوجد لقطة لهذا الشهر بالفعل');

    return this.prisma.balanceSnapshot.create({
      data: { accountId, balance: account.balance, period },
    });
  }

  private async adjustAggregateBalances(
    tx: LedgerPrismaClient,
    walletId: string,
    entityId: string,
    amount: number,
  ) {
    await this.adjustWalletBalance(tx, walletId, amount);
    // تحديث الحساب الإجمالي للكيان فقط — لا المحافظ ولا المسارات ولا بنود الإنفاق
    await tx.ledgerAccount.updateMany({
      where: {
        entityId,
        walletId: null,
        governancePathId: null,
        spendingItemId: null,
      },
      data: {
        balance:
          amount >= 0 ? { increment: amount } : { decrement: Math.abs(amount) },
      },
    });
  }

  private async adjustWalletBalance(
    tx: LedgerPrismaClient,
    walletId: string,
    amount: number,
  ) {
    await tx.ledgerAccount.updateMany({
      where: { walletId },
      data: {
        balance:
          amount >= 0 ? { increment: amount } : { decrement: Math.abs(amount) },
      },
    });
  }

  private async getDecisionDisbursementProgress(
    client: LedgerPrismaClient,
    decisionId: string,
    approvedAmount: number,
  ): Promise<DecisionDisbursementProgress> {
    const aggregate = await client.ledgerTransaction.aggregate({
      where: {
        decisionId,
        type: LedgerTransactionType.DISBURSEMENT,
        isReversed: false,
      },
      _sum: { amount: true },
    });

    const executedAmount = Number(aggregate._sum.amount ?? 0);

    return {
      approvedAmount,
      executedAmount,
      remainingAmount: Math.max(approvedAmount - executedAmount, 0),
    };
  }

  private async setDecisionExecutionStatus(
    client: LedgerPrismaClient,
    decisionId: string,
    data: {
      executionStatus: DecisionExecutionStatus;
    },
  ) {
    await client.decision.update({
      where: { id: decisionId },
      data: {
        executionStatus: data.executionStatus,
        executionUpdatedAt: new Date(),
      },
    });
  }

  private async recomputeDecisionExecutionState(
    client: LedgerPrismaClient,
    decisionId: string,
  ) {
    const decision = await client.decision.findUnique({
      where: { id: decisionId },
      select: {
        id: true,
        amount: true,
        decisionType: true,
      },
    });
    if (!decision) {
      return;
    }

    if (
      decision.decisionType === DecisionType.DISBURSE_FUNDS &&
      decision.amount !== null
    ) {
      const executedAggregate = await client.ledgerTransaction.aggregate({
        where: {
          decisionId,
          type: LedgerTransactionType.DISBURSEMENT,
          isReversed: false,
        },
        _sum: { amount: true },
      });
      const totalTransactions = await client.ledgerTransaction.count({
        where: {
          decisionId,
          type: LedgerTransactionType.DISBURSEMENT,
        },
      });
      const executedAmount = Number(executedAggregate._sum.amount ?? 0);
      const approvedAmount = Number(decision.amount);

      let executionStatus: DecisionExecutionStatus =
        DecisionExecutionStatus.NOT_STARTED;
      if (executedAmount > 0 && executedAmount < approvedAmount) {
        executionStatus = DecisionExecutionStatus.PARTIAL;
      } else if (executedAmount >= approvedAmount && approvedAmount > 0) {
        executionStatus = DecisionExecutionStatus.COMPLETED;
      } else if (executedAmount === 0 && totalTransactions > 0) {
        executionStatus = DecisionExecutionStatus.REVERSED;
      }

      await this.setDecisionExecutionStatus(client, decisionId, {
        executionStatus,
      });
      return;
    }

    if (decision.decisionType === DecisionType.TRANSFER_BALANCE) {
      const activeTransfers = await client.ledgerTransaction.count({
        where: {
          decisionId,
          type: LedgerTransactionType.TRANSFER,
          isReversed: false,
        },
      });
      const totalTransfers = await client.ledgerTransaction.count({
        where: {
          decisionId,
          type: LedgerTransactionType.TRANSFER,
        },
      });

      const executionStatus =
        activeTransfers > 0
          ? DecisionExecutionStatus.COMPLETED
          : totalTransfers > 0
            ? DecisionExecutionStatus.REVERSED
            : DecisionExecutionStatus.NOT_STARTED;

      await this.setDecisionExecutionStatus(client, decisionId, {
        executionStatus,
      });
    }
  }

  private resolveAccountEntityId(account: {
    entity?: { id: string } | null;
    wallet?: { entityId: string } | null;
    governancePath?: { wallet: { entityId: string } } | null;
    spendingItem?: {
      governancePath: { wallet: { entityId: string } };
    } | null;
  }) {
    return (
      account.entity?.id ??
      account.wallet?.entityId ??
      account.governancePath?.wallet.entityId ??
      account.spendingItem?.governancePath.wallet.entityId
    );
  }

  private async auditFinancialValidationFailure(
    personId: string,
    dto: RecordDisbursementDto,
    error: unknown,
  ) {
    try {
      const path = await this.prisma.governancePath.findUnique({
        where: { id: dto.pathId },
        select: { wallet: { select: { entityId: true } } },
      });

      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.REJECT,
          personId,
          entityId: path?.wallet.entityId,
          targetType: 'ledger_validation_failures',
          targetId: randomUUID(),
          newValue: {
            type: 'DISBURSEMENT',
            status: 'FAILED',
            pathId: dto.pathId,
            spendingItemId: dto.spendingItemId,
            decisionId: dto.decisionId,
            amount: dto.amount,
            reason: this.auditFailureMessage(error),
          },
        },
      });
    } catch {
      // Validation failure auditing must not hide the original financial error.
    }
  }

  private auditFailureMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    return 'Unknown validation failure';
  }

  private async requireTreasurerOrAdmin(
    entityId: string,
    personId: string,
    client: LedgerPrismaClient = this.prisma,
  ) {
    const m = await client.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.TREASURER, MemberRole.ADMIN, MemberRole.FOUNDER],
        },
      },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون أمين صندوق أو مديراً');
  }

  private async requireMember(
    entityId: string,
    personId: string,
    client: LedgerPrismaClient = this.prisma,
  ) {
    const m = await client.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }
}
