import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisputeStatus, DisputeType, MemberRole, Prisma } from '@prisma/client';

type AuditJsonObject = Record<string, unknown>;

type AuditLogWithContext = Prisma.AuditLogGetPayload<{
  include: {
    person: { select: { id: true; name: true } };
    entity: { select: { id: true; name: true } };
  };
}>;

@Injectable()
export class AuditorService {
  constructor(private prisma: PrismaService) {}

  async getOperations(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.ledgerTransaction.findMany({
      where: this.transactionEntityWhere(entityId),
      orderBy: { id: 'desc' },
      take: 200,
    });
  }

  async getDocuments(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.document.findMany({
      where: { entityId },
      include: {
        // Person only has `name`
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDecisions(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.decision.findMany({
      where: {
        OR: [
          { subjectType: 'ENTITY', subjectId: entityId },
          { governancePath: { wallet: { entityId } } },
        ],
      },
      orderBy: { id: 'desc' },
    });
  }

  async getExceptions(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.decision.findMany({
      where: {
        OR: [
          { subjectType: 'ENTITY', subjectId: entityId },
          { governancePath: { wallet: { entityId } } },
        ],
        // using relatedDecisionId to signify an override or exception
        relatedDecisionId: { not: null },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getConflicts(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.dispute.findMany({
      where: {
        entityId,
        type: DisputeType.MEMBER_CONFLICT,
        status: DisputeStatus.OPEN,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getAppeals(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    return this.prisma.dispute.findMany({
      where: {
        entityId,
        type: DisputeType.UNFAIR_DECISION,
        status: DisputeStatus.OPEN,
      },
      orderBy: { id: 'desc' },
    });
  }

  async getReport(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    const period = new Date().toISOString().slice(0, 7);

    const [totalOperations, exceptions, conflicts, appeals, docs] =
      await Promise.all([
        this.prisma.ledgerTransaction.count({
          where: this.transactionEntityWhere(entityId),
        }),
        this.getExceptions(entityId, requesterId),
        this.getConflicts(entityId, requesterId),
        this.prisma.dispute.count({
          where: {
            entityId,
            type: DisputeType.UNFAIR_DECISION,
            status: DisputeStatus.OPEN,
          },
        }),
        this.prisma.document.count({ where: { entityId } }),
      ]);

    const missingDocumentsRate =
      totalOperations > 0
        ? Math.max(0, 100 - (docs / totalOperations) * 100)
        : 0;

    return {
      period,
      totalOperations,
      totalExceptions: exceptions.length,
      totalConflicts: conflicts.length,
      openAppeals: appeals,
      missingDocumentsRate,
    };
  }

  async getAuditLogs(entityId: string, requesterId: string) {
    await this.requireAuditor(entityId, requesterId);
    const logs = await this.prisma.auditLog.findMany({
      where: { entityId },
      include: {
        person: { select: { id: true, name: true } },
        entity: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return logs.map((log) => this.presentAuditLog(log));
  }

  private async requireAuditor(entityId: string, personId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: {
          in: [MemberRole.AUDITOR, MemberRole.ADMIN, MemberRole.FOUNDER],
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException(
        'يتطلب الوصول دور مراجع أو مدير داخل الكيان',
      );
    }
  }

  private transactionEntityWhere(
    entityId: string,
  ): Prisma.LedgerTransactionWhereInput {
    return {
      OR: [
        { sourceEntityId: entityId },
        { originEntityId: entityId },
        {
          decision: {
            OR: [
              { subjectType: 'ENTITY', subjectId: entityId },
              { governancePath: { wallet: { entityId } } },
            ],
          },
        },
        {
          entries: {
            some: {
              account: {
                OR: [
                  { entityId },
                  { wallet: { entityId } },
                  { governancePath: { wallet: { entityId } } },
                  {
                    spendingItem: { governancePath: { wallet: { entityId } } },
                  },
                ],
              },
            },
          },
        },
      ],
    };
  }

  private presentAuditLog(log: AuditLogWithContext) {
    const oldValue = this.asObject(log.oldValue);
    const newValue = this.asObject(log.newValue);
    const actorName = log.person?.name ?? 'النظام';
    const actionLabel = this.auditActionLabel(log.action);
    const targetLabel = this.auditTargetLabel(log.targetType);
    const linkedRecords = this.extractLinkedRecords(log, oldValue, newValue);

    return {
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      person: log.person,
      entity: log.entity,
      actor: log.person
        ? { id: log.person.id, name: log.person.name }
        : { id: null, name: actorName },
      title: `${actorName} ${actionLabel} ${targetLabel}`,
      context: this.describeAuditContext(log, oldValue, newValue),
      effect: this.describeAuditEffect(log, oldValue, newValue),
      severity: this.auditSeverity(log, oldValue, newValue),
      linkedRecords,
      changes: this.auditChanges(oldValue, newValue),
      oldValue: log.oldValue,
      newValue: log.newValue,
      createdAt: log.createdAt,
    };
  }

  private asObject(value: Prisma.JsonValue | null): AuditJsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as AuditJsonObject;
  }

  private auditActionLabel(action: string) {
    const labels: Record<string, string> = {
      CREATE: 'أنشأ',
      UPDATE: 'حدّث',
      DELETE: 'حذف',
      APPROVE: 'اعتمد',
      REJECT: 'رفض',
      VOTE: 'صوّت على',
      APPEAL: 'اعترض على',
      LOGIN: 'سجّل دخولاً إلى',
      LOGOUT: 'سجّل خروجاً من',
    };
    return labels[action] ?? action;
  }

  private auditTargetLabel(targetType: string) {
    const labels: Record<string, string> = {
      entities: 'كيان',
      memberships: 'عضوية',
      wallets: 'محفظة',
      governance_paths: 'مسار حوكمة',
      subscriptions: 'اشتراك',
      payment_records: 'إثبات سداد',
      payment_dues: 'مستحق دفع',
      decisions: 'قرار',
      votes: 'تصويت',
      disbursement_requests: 'طلب صرف',
      ledger_transactions: 'عملية مالية',
      balance_transfer_requests: 'طلب نقل رصيد',
      disputes: 'نزاع',
      appeals: 'اعتراض',
      documents: 'مستند',
      support_sessions: 'جلسة دعم',
      wallet_relationships: 'علاقة محفظة',
      entity_relationships: 'علاقة كيان',
    };
    return labels[targetType] ?? targetType;
  }

  private describeAuditContext(
    log: AuditLogWithContext,
    oldValue: AuditJsonObject,
    newValue: AuditJsonObject,
  ) {
    const value = { ...oldValue, ...newValue };
    const parts = [
      log.entity?.name ? `الكيان: ${log.entity.name}` : null,
      value.walletId ? `المحفظة: ${String(value.walletId).slice(0, 8)}` : null,
      value.pathId || value.governancePathId
        ? `المسار: ${String(value.pathId ?? value.governancePathId).slice(0, 8)}`
        : null,
      value.decisionId
        ? `القرار: ${String(value.decisionId).slice(0, 8)}`
        : null,
      value.paymentDueId
        ? `المستحق: ${String(value.paymentDueId).slice(0, 8)}`
        : null,
      `السجل: ${log.targetType}/${log.targetId.slice(0, 8)}`,
    ].filter(Boolean);

    return parts.join(' · ');
  }

  private describeAuditEffect(
    log: AuditLogWithContext,
    oldValue: AuditJsonObject,
    newValue: AuditJsonObject,
  ) {
    const value = { ...oldValue, ...newValue };
    const amount = this.formatAmount(value.amount);
    const type = String(value.type ?? '');

    if (type === 'PAYMENT' || log.targetType === 'payment_records') {
      return amount
        ? `تأثير مالي: إثبات/سداد اشتراك بقيمة ${amount} مرتبط بعضوية أو مستحق دفع.`
        : 'تأثير مالي: إثبات أو مراجعة سداد اشتراك.';
    }
    if (type === 'DISBURSEMENT' || log.targetType === 'disbursement_requests') {
      return amount
        ? `تأثير مالي: صرف بقيمة ${amount} يجب أن يبقى مرتبطاً بقرار ومسار محددين.`
        : 'تأثير مالي: تغيير في طلب صرف أو تنفيذه.';
    }
    if (type === 'TRANSFER' || log.targetType === 'balance_transfer_requests') {
      return amount
        ? `تأثير مالي: نقل رصيد بقيمة ${amount} بين مسارات محددة.`
        : 'تأثير مالي: تغيير في طلب نقل رصيد.';
    }
    if (log.targetType === 'decisions') {
      return `أثر حوكمي: القرار ${String(value.decisionType ?? value.type ?? '').trim() || 'المسجل'} قد يغير صلاحية أو صرفاً أو قاعدة تشغيلية.`;
    }
    if (log.targetType === 'memberships') {
      return 'أثر صلاحيات: تغيّر في دور أو حالة عضوية وقد يؤثر على الوصول والتصويت.';
    }
    if (log.targetType === 'subscriptions') {
      return 'أثر عضوية: تغيّر في اشتراك يحدد الالتزام والحقوق داخل مسار.';
    }
    if (log.targetType === 'disputes' || log.targetType === 'appeals') {
      return 'أثر نزاع: حدث ضمن تسلسل اعتراض أو نزاع ويجب ربطه بالقرار أو الإجراء الأصلي.';
    }

    if (log.action === 'REJECT') return 'تم الرفض؛ يجب أن يظهر السبب للمستخدم المتأثر.';
    if (log.action === 'APPROVE') return 'تم الاعتماد؛ راجع السجل المرتبط للتأكد من الأثر.';
    return 'حدث تشغيلي محفوظ للمراجعة والتتبع.';
  }

  private auditSeverity(
    log: AuditLogWithContext,
    oldValue: AuditJsonObject,
    newValue: AuditJsonObject,
  ) {
    const value = { ...oldValue, ...newValue };
    if (
      log.action === 'DELETE' ||
      log.action === 'APPEAL' ||
      log.targetType.includes('dispute')
    ) {
      return 'HIGH';
    }
    if (
      log.targetType === 'ledger_transactions' ||
      log.targetType === 'disbursement_requests' ||
      log.targetType === 'balance_transfer_requests' ||
      value.type === 'DISBURSEMENT' ||
      value.type === 'TRANSFER'
    ) {
      return 'HIGH';
    }
    if (log.action === 'REJECT' || log.action === 'APPROVE') return 'MEDIUM';
    return 'LOW';
  }

  private auditChanges(oldValue: AuditJsonObject, newValue: AuditJsonObject) {
    const keys = Array.from(
      new Set([...Object.keys(oldValue), ...Object.keys(newValue)]),
    )
      .filter((key) => !['attachments'].includes(key))
      .slice(0, 8);

    return keys.map((field) => ({
      field,
      before: oldValue[field] ?? null,
      after: newValue[field] ?? null,
    }));
  }

  private extractLinkedRecords(
    log: AuditLogWithContext,
    oldValue: AuditJsonObject,
    newValue: AuditJsonObject,
  ) {
    const value = { ...oldValue, ...newValue };
    const records = [
      { type: log.targetType, id: log.targetId, label: this.auditTargetLabel(log.targetType) },
      { type: 'decisions', id: value.decisionId, label: 'قرار' },
      { type: 'wallets', id: value.walletId, label: 'محفظة' },
      {
        type: 'governance_paths',
        id: value.pathId ?? value.governancePathId,
        label: 'مسار',
      },
      { type: 'spending_items', id: value.spendingItemId, label: 'بند صرف' },
      { type: 'payment_dues', id: value.paymentDueId, label: 'مستحق' },
      {
        type: 'disbursement_requests',
        id: value.disbursementRequestId,
        label: 'طلب صرف',
      },
      { type: 'memberships', id: value.membershipId, label: 'عضوية' },
    ];

    const seen = new Set<string>();
    return records
      .filter((record): record is { type: string; id: string; label: string } => {
        if (!record.id || typeof record.id !== 'string') return false;
        const key = `${record.type}:${record.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((record) => ({ ...record, shortId: record.id.slice(0, 8) }));
  }

  private formatAmount(value: unknown) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
  }
}
