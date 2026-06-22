import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppealType,
  AuditAction,
  DecisionType,
  DisputeType,
  GovernancePathType,
  MemberRole,
  RuleTargetType,
  RuleType,
  VoteType,
  VotersScope,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toJsonValue } from '../prisma/json-value';
import { CreateRuleDto, UpdateRuleDto } from './dto/create-rule.dto';
import { RULE_TEMPLATES } from './rule-templates';

export interface RuleEvaluationResult {
  allowed: boolean;
  violations: string[];
}

export interface SpendingRuleEvaluationOptions {
  attachmentsCount?: number;
}

export interface SubscriptionRuleEvaluationInput {
  entityId: string;
  walletId: string;
  pathId: string;
  pathType: GovernancePathType;
  membershipId: string;
  agreedAmount?: number | null;
  hasActiveMembership: boolean;
  hasAuditor: boolean;
  hasCommitteeApprovalPath: boolean;
  allowAppeals: boolean;
}

export interface DecisionRuleEvaluationInput {
  entityId: string;
  walletId?: string | null;
  pathId?: string | null;
  spendingItemId?: string | null;
  decisionType: DecisionType;
  amount?: number | null;
  attachmentsCount?: number;
  quorumPercent?: number;
  approvalPercent?: number;
  voteType?: VoteType;
  votersScope?: VotersScope;
}

export interface TransferRuleEvaluationInput {
  entityId: string;
  sourceWalletId: string;
  sourcePathId: string;
  targetWalletId: string;
  targetPathId: string;
  amount: number;
}

export interface AppealRuleEvaluationInput {
  entityId: string;
  walletId?: string | null;
  pathId?: string | null;
  decisionType: DecisionType;
  appealType: AppealType;
  evidenceCount?: number;
  requestedAction?: string | null;
}

export interface DisputeRuleEvaluationInput {
  entityId: string;
  walletId?: string | null;
  pathId?: string | null;
  disputeType: DisputeType;
  evidenceCount?: number;
  hasRespondent: boolean;
  hasLinkedAppeal: boolean;
}

export interface RelationshipRuleEvaluationInput {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
}

export interface SubscriptionTransitionRuleEvaluationInput {
  entityId: string;
  walletId: string;
  pathId: string;
  membershipId: string;
  fromState: string;
  toState: string;
  suspendedAt?: Date | null;
}

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  getTemplates() {
    return RULE_TEMPLATES;
  }

  async createRule(adminId: string, dto: CreateRuleDto) {
    const entityId = await this.resolveEntityId(dto.targetType, dto.targetId);
    await this.requireAdminOrFounder(entityId, adminId);

    const rule = await this.prisma.rule.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        name: dto.name,
        description: dto.description,
        ruleType: dto.ruleType,
        ruleData: toJsonValue(dto.ruleData),
        priority: dto.priority ?? 0,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        personId: adminId,
        entityId,
        targetType: 'rules',
        targetId: rule.id,
        newValue: {
          name: dto.name,
          ruleType: dto.ruleType,
          targetType: dto.targetType,
        },
      },
    });

    return rule;
  }

  async findTargetRules(
    targetType: RuleTargetType,
    targetId: string,
    requesterId: string,
  ) {
    const entityId = await this.resolveEntityId(targetType, targetId);
    await this.requireMember(entityId, requesterId);

    return this.prisma.rule.findMany({
      where: { targetType, targetId, isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string, requesterId: string) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('القاعدة غير موجودة');

    const entityId = await this.resolveEntityId(rule.targetType, rule.targetId);
    await this.requireMember(entityId, requesterId);

    return rule;
  }

  async updateRule(id: string, adminId: string, dto: UpdateRuleDto) {
    const rule = await this.prisma.rule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('القاعدة غير موجودة');

    const entityId = await this.resolveEntityId(rule.targetType, rule.targetId);
    await this.requireAdminOrFounder(entityId, adminId);

    const updated = await this.prisma.rule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        ruleData:
          dto.ruleData === undefined ? undefined : toJsonValue(dto.ruleData),
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        personId: adminId,
        entityId,
        targetType: 'rules',
        targetId: id,
        newValue: toJsonValue(dto),
      },
    });

    return updated;
  }

  async evaluateSpendingRules(
    pathId: string,
    amount: number,
    spendingItemId?: string,
    options: SpendingRuleEvaluationOptions = {},
  ): Promise<RuleEvaluationResult> {
    const path = await this.prisma.governancePath.findUnique({
      where: { id: pathId },
      select: {
        walletId: true,
        wallet: { select: { entityId: true } },
      },
    });
    if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');

    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: path.wallet.entityId },
      { targetType: RuleTargetType.WALLET, targetId: path.walletId },
      { targetType: RuleTargetType.PATH, targetId: pathId },
      {
        targetType: RuleTargetType.SPENDING_ITEM,
        targetId: spendingItemId,
      },
    ]);

    const violations: string[] = [];
    const attachmentsCount = options.attachmentsCount ?? 0;

    for (const rule of rules) {
      const data = this.asRuleRecord(rule.ruleData);

      if (rule.ruleType === RuleType.SPENDING_LIMIT) {
        const maxAmount = this.asNumber(data.maxAmount);
        if (maxAmount !== null && amount > maxAmount) {
          violations.push(
            `القاعدة "${rule.name}": المبلغ ${amount} يتجاوز الحد الأقصى ${maxAmount}`,
          );
        }
      }

      if (rule.ruleType === RuleType.REQUIRES_DOCUMENTS) {
        const required = Boolean(data.required ?? false);
        if (required && attachmentsCount === 0) {
          violations.push(
            `القاعدة "${rule.name}": يجب إرفاق مستندات داعمة لهذا الصرف`,
          );
        }
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  async evaluateSubscriptionRules(
    input: SubscriptionRuleEvaluationInput,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: input.entityId },
      { targetType: RuleTargetType.WALLET, targetId: input.walletId },
      { targetType: RuleTargetType.PATH, targetId: input.pathId },
      { targetType: RuleTargetType.MEMBERSHIP, targetId: input.membershipId },
    ]);

    const violations: string[] = [];

    for (const rule of rules) {
      if (rule.ruleType !== RuleType.ELIGIBILITY) {
        continue;
      }

      const data = this.asRuleRecord(rule.ruleData);
      const allowedPathTypes = this.asStringArray(data.allowedPathTypes);
      const disallowedPathTypes = this.asStringArray(data.disallowedPathTypes);
      const minAgreedAmount = this.asNumber(data.minAgreedAmount);
      const maxAgreedAmount = this.asNumber(data.maxAgreedAmount);

      if (
        Boolean(data.requiresActiveMembership) &&
        !input.hasActiveMembership
      ) {
        violations.push(
          `القاعدة "${rule.name}": يلزم أن تكون العضوية نشطة قبل التفعيل`,
        );
      }

      if (
        allowedPathTypes.length > 0 &&
        !allowedPathTypes.includes(input.pathType)
      ) {
        violations.push(
          `القاعدة "${rule.name}": نوع المسار ${input.pathType} غير مسموح لهذه الأهلية`,
        );
      }

      if (disallowedPathTypes.includes(input.pathType)) {
        violations.push(
          `القاعدة "${rule.name}": نوع المسار ${input.pathType} محظور لهذه الأهلية`,
        );
      }

      if (
        minAgreedAmount !== null &&
        Number(input.agreedAmount ?? 0) < minAgreedAmount
      ) {
        violations.push(
          `القاعدة "${rule.name}": مبلغ الاشتراك أقل من الحد الأدنى ${minAgreedAmount}`,
        );
      }

      if (
        maxAgreedAmount !== null &&
        input.agreedAmount !== null &&
        input.agreedAmount !== undefined &&
        Number(input.agreedAmount) > maxAgreedAmount
      ) {
        violations.push(
          `القاعدة "${rule.name}": مبلغ الاشتراك يتجاوز الحد الأعلى ${maxAgreedAmount}`,
        );
      }

      if (Boolean(data.requiresAuditAccess) && !input.hasAuditor) {
        violations.push(
          `القاعدة "${rule.name}": يتطلب المسار وجود مراجع نشط في الكيان`,
        );
      }

      if (
        Boolean(data.requiresCommitteeApproval) &&
        !input.hasCommitteeApprovalPath
      ) {
        violations.push(
          `القاعدة "${rule.name}": يتطلب المسار نموذج موافقة لجنة`,
        );
      }

      if (Boolean(data.requiresAppealsEnabled) && !input.allowAppeals) {
        violations.push(
          `القاعدة "${rule.name}": يتطلب هذا الاشتراك حق اعتراض فعّال`,
        );
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  async evaluateDecisionRules(
    input: DecisionRuleEvaluationInput,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: input.entityId },
      { targetType: RuleTargetType.WALLET, targetId: input.walletId },
      { targetType: RuleTargetType.PATH, targetId: input.pathId },
      {
        targetType: RuleTargetType.SPENDING_ITEM,
        targetId: input.spendingItemId,
      },
    ]);

    const violations: string[] = [];

    for (const rule of rules) {
      const data = this.asRuleRecord(rule.ruleData);

      if (
        rule.ruleType === RuleType.SPENDING_LIMIT &&
        input.amount !== null &&
        input.amount !== undefined
      ) {
        const maxAmount = this.asNumber(data.maxAmount);
        if (maxAmount !== null && input.amount > maxAmount) {
          violations.push(
            `القاعدة "${rule.name}": مبلغ القرار يتجاوز الحد الأقصى ${maxAmount}`,
          );
        }
      }

      if (rule.ruleType === RuleType.REQUIRES_DOCUMENTS) {
        const required = Boolean(data.required ?? false);
        if (required && (input.attachmentsCount ?? 0) === 0) {
          violations.push(
            `القاعدة "${rule.name}": يجب إرفاق مستندات داعمة مع القرار`,
          );
        }
      }

      if (rule.ruleType === RuleType.QUORUM) {
        const minQuorumPercent = this.asNumber(data.minQuorumPercent);
        const minApprovalPercent = this.asNumber(data.minApprovalPercent);
        const requiredVotersScope = this.asString(data.requiredVotersScope);
        const allowedVoteTypes = this.asStringArray(data.allowedVoteTypes);
        const allowedDecisionTypes = this.asStringArray(
          data.allowedDecisionTypes,
        );

        if (
          minQuorumPercent !== null &&
          input.quorumPercent !== undefined &&
          input.quorumPercent < minQuorumPercent
        ) {
          violations.push(
            `القاعدة "${rule.name}": النصاب المطلوب لا يقل عن ${minQuorumPercent}%`,
          );
        }

        if (
          minApprovalPercent !== null &&
          input.approvalPercent !== undefined &&
          input.approvalPercent < minApprovalPercent
        ) {
          violations.push(
            `القاعدة "${rule.name}": نسبة الإقرار المطلوبة لا تقل عن ${minApprovalPercent}%`,
          );
        }

        if (
          requiredVotersScope &&
          input.votersScope &&
          input.votersScope !== requiredVotersScope
        ) {
          violations.push(
            `القاعدة "${rule.name}": نطاق المصوتين يجب أن يكون ${requiredVotersScope}`,
          );
        }

        if (
          allowedVoteTypes.length > 0 &&
          input.voteType &&
          !allowedVoteTypes.includes(input.voteType)
        ) {
          violations.push(
            `القاعدة "${rule.name}": نوع التصويت ${input.voteType} غير مسموح`,
          );
        }

        if (
          allowedDecisionTypes.length > 0 &&
          !allowedDecisionTypes.includes(input.decisionType)
        ) {
          violations.push(
            `القاعدة "${rule.name}": نوع القرار ${input.decisionType} غير مشمول بهذه القاعدة`,
          );
        }
      }

      if (rule.ruleType === RuleType.TRANSFER) {
        const allowTransfer = data.allowTransfer;
        const appliesToDecision =
          input.decisionType === DecisionType.TRANSFER_BALANCE;

        if (appliesToDecision && allowTransfer === false) {
          violations.push(
            `القاعدة "${rule.name}": هذا المسار لا يسمح بقرارات نقل الرصيد`,
          );
        }
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  async evaluateTransferRules(
    input: TransferRuleEvaluationInput,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: input.entityId },
      { targetType: RuleTargetType.WALLET, targetId: input.sourceWalletId },
      { targetType: RuleTargetType.PATH, targetId: input.sourcePathId },
      { targetType: RuleTargetType.PATH, targetId: input.targetPathId },
    ]);

    const violations: string[] = [];

    for (const rule of rules) {
      const data = this.asRuleRecord(rule.ruleData);

      if (rule.ruleType === RuleType.TRANSFER) {
        if (data.allowTransfer === false) {
          violations.push(
            `القاعدة "${rule.name}": النقل غير مسموح في هذا السياق`,
          );
        }

        const minAmount = this.asNumber(data.minAmount);
        const maxAmount = this.asNumber(data.maxAmount);
        if (minAmount !== null && input.amount < minAmount) {
          violations.push(
            `القاعدة "${rule.name}": مبلغ النقل أقل من الحد الأدنى ${minAmount}`,
          );
        }
        if (maxAmount !== null && input.amount > maxAmount) {
          violations.push(
            `القاعدة "${rule.name}": مبلغ النقل يتجاوز الحد الأعلى ${maxAmount}`,
          );
        }

        if (
          Boolean(data.sameWalletOnly) &&
          input.sourceWalletId !== input.targetWalletId
        ) {
          violations.push(
            `القاعدة "${rule.name}": النقل مسموح فقط بين مسارات المحفظة نفسها`,
          );
        }

        const allowedTargetPathIds = this.asStringArray(
          data.allowedTargetPathIds,
        );
        if (
          allowedTargetPathIds.length > 0 &&
          !allowedTargetPathIds.includes(input.targetPathId)
        ) {
          violations.push(
            `القاعدة "${rule.name}": المسار الهدف غير مسموح لهذا النقل`,
          );
        }
      }

      if (rule.ruleType === RuleType.SPENDING_LIMIT) {
        const maxAmount = this.asNumber(data.maxAmount);
        if (maxAmount !== null && input.amount > maxAmount) {
          violations.push(
            `القاعدة "${rule.name}": مبلغ النقل يتجاوز الحد الأعلى ${maxAmount}`,
          );
        }
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  async evaluateAppealRules(
    input: AppealRuleEvaluationInput,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: input.entityId },
      { targetType: RuleTargetType.WALLET, targetId: input.walletId },
      { targetType: RuleTargetType.PATH, targetId: input.pathId },
    ]);

    const violations: string[] = [];

    for (const rule of rules) {
      const data = this.asRuleRecord(rule.ruleData);

      if (rule.ruleType === RuleType.REQUIRES_DOCUMENTS) {
        const required = Boolean(data.required ?? false);
        if (required && (input.evidenceCount ?? 0) === 0) {
          violations.push(
            `القاعدة "${rule.name}": يجب إرفاق أدلة داعمة مع الاعتراض`,
          );
        }
      }

      if (rule.ruleType === RuleType.ELIGIBILITY) {
        const allowedAppealTypes = this.asStringArray(data.allowedAppealTypes);
        const disallowedAppealTypes = this.asStringArray(
          data.disallowedAppealTypes,
        );
        const allowedDecisionTypes = this.asStringArray(
          data.allowedDecisionTypes,
        );

        if (
          allowedAppealTypes.length > 0 &&
          !allowedAppealTypes.includes(input.appealType)
        ) {
          violations.push(
            `القاعدة "${rule.name}": نوع الاعتراض ${input.appealType} غير مسموح`,
          );
        }

        if (disallowedAppealTypes.includes(input.appealType)) {
          violations.push(
            `القاعدة "${rule.name}": نوع الاعتراض ${input.appealType} محظور`,
          );
        }

        if (
          allowedDecisionTypes.length > 0 &&
          !allowedDecisionTypes.includes(input.decisionType)
        ) {
          violations.push(
            `القاعدة "${rule.name}": القرار ${input.decisionType} غير مشمول بسياسة الاعتراض`,
          );
        }

        if (
          Boolean(data.requiresRequestedAction) &&
          !input.requestedAction?.trim()
        ) {
          violations.push(
            `القاعدة "${rule.name}": يجب تحديد الإجراء المطلوب في الاعتراض`,
          );
        }
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  async evaluateRelationshipRules(
    input: RelationshipRuleEvaluationInput,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: input.sourceEntityId },
      { targetType: RuleTargetType.ENTITY, targetId: input.targetEntityId },
    ]);

    const violations: string[] = [];

    for (const rule of rules) {
      if (rule.ruleType !== RuleType.ELIGIBILITY) continue;

      const data = this.asRuleRecord(rule.ruleData);
      const allowedTypes = this.asStringArray(data.allowedRelationshipTypes);
      const disallowedTypes = this.asStringArray(
        data.disallowedRelationshipTypes,
      );

      if (
        allowedTypes.length > 0 &&
        !allowedTypes.includes(input.relationshipType)
      ) {
        violations.push(
          `القاعدة "${rule.name}": نوع العلاقة ${input.relationshipType} غير مسموح`,
        );
      }

      if (disallowedTypes.includes(input.relationshipType)) {
        violations.push(
          `القاعدة "${rule.name}": نوع العلاقة ${input.relationshipType} محظور`,
        );
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  async evaluateSubscriptionTransitionRules(
    input: SubscriptionTransitionRuleEvaluationInput,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: input.entityId },
      { targetType: RuleTargetType.WALLET, targetId: input.walletId },
      { targetType: RuleTargetType.PATH, targetId: input.pathId },
      { targetType: RuleTargetType.MEMBERSHIP, targetId: input.membershipId },
    ]);

    const violations: string[] = [];
    const transition = `${input.fromState}_TO_${input.toState}`;

    for (const rule of rules) {
      if (rule.ruleType !== RuleType.ELIGIBILITY) continue;

      const data = this.asRuleRecord(rule.ruleData);
      const allowedTransitions = this.asStringArray(data.allowedTransitions);
      const disallowedTransitions = this.asStringArray(
        data.disallowedTransitions,
      );
      const minSuspensionDays = this.asNumber(
        data.minSuspensionDaysBeforeReactivation,
      );

      if (
        allowedTransitions.length > 0 &&
        !allowedTransitions.includes(transition)
      ) {
        violations.push(
          `القاعدة "${rule.name}": الانتقال من ${input.fromState} إلى ${input.toState} غير مسموح`,
        );
      }

      if (disallowedTransitions.includes(transition)) {
        violations.push(
          `القاعدة "${rule.name}": الانتقال من ${input.fromState} إلى ${input.toState} محظور`,
        );
      }

      if (
        minSuspensionDays !== null &&
        input.toState === 'ACTIVE' &&
        input.fromState === 'SUSPENDED' &&
        input.suspendedAt
      ) {
        const daysSuspended =
          (Date.now() - input.suspendedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSuspended < minSuspensionDays) {
          violations.push(
            `القاعدة "${rule.name}": يجب أن يمر ${minSuspensionDays} يوم على التعليق قبل إعادة التفعيل (مضى ${Math.floor(daysSuspended)} يوم)`,
          );
        }
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  async evaluateDisputeRules(
    input: DisputeRuleEvaluationInput,
  ): Promise<RuleEvaluationResult> {
    const rules = await this.findApplicableRules([
      { targetType: RuleTargetType.ENTITY, targetId: input.entityId },
      { targetType: RuleTargetType.WALLET, targetId: input.walletId },
      { targetType: RuleTargetType.PATH, targetId: input.pathId },
    ]);

    const violations: string[] = [];

    for (const rule of rules) {
      const data = this.asRuleRecord(rule.ruleData);

      if (rule.ruleType === RuleType.REQUIRES_DOCUMENTS) {
        const required = Boolean(data.required ?? false);
        if (required && (input.evidenceCount ?? 0) === 0) {
          violations.push(
            `القاعدة "${rule.name}": يجب إرفاق أدلة داعمة مع النزاع`,
          );
        }
      }

      if (rule.ruleType === RuleType.ELIGIBILITY) {
        const allowedDisputeTypes = this.asStringArray(
          data.allowedDisputeTypes,
        );
        const disallowedDisputeTypes = this.asStringArray(
          data.disallowedDisputeTypes,
        );

        if (
          allowedDisputeTypes.length > 0 &&
          !allowedDisputeTypes.includes(input.disputeType)
        ) {
          violations.push(
            `القاعدة "${rule.name}": نوع النزاع ${input.disputeType} غير مسموح`,
          );
        }

        if (disallowedDisputeTypes.includes(input.disputeType)) {
          violations.push(
            `القاعدة "${rule.name}": نوع النزاع ${input.disputeType} محظور`,
          );
        }

        if (Boolean(data.requiresRespondent) && !input.hasRespondent) {
          violations.push(
            `القاعدة "${rule.name}": يجب تحديد طرف مقابل عند فتح النزاع`,
          );
        }

        if (Boolean(data.requiresLinkedAppeal) && !input.hasLinkedAppeal) {
          violations.push(
            `القاعدة "${rule.name}": يجب ربط النزاع باعتراض سابق`,
          );
        }
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  private async findApplicableRules(
    targets: Array<{ targetType: RuleTargetType; targetId?: string | null }>,
  ) {
    const normalizedTargets = targets.filter(
      (
        target,
      ): target is {
        targetType: RuleTargetType;
        targetId: string;
      } => Boolean(target.targetId),
    );

    if (normalizedTargets.length === 0) {
      return [];
    }

    return this.prisma.rule.findMany({
      where: {
        isActive: true,
        OR: normalizedTargets.map((target) => ({
          targetType: target.targetType,
          targetId: target.targetId,
        })),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  private asRuleRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private async resolveEntityId(
    targetType: RuleTargetType,
    targetId: string,
  ): Promise<string> {
    switch (targetType) {
      case RuleTargetType.ENTITY: {
        return targetId;
      }
      case RuleTargetType.WALLET: {
        const wallet = await this.prisma.wallet.findUnique({
          where: { id: targetId },
          select: { entityId: true },
        });
        if (!wallet) throw new NotFoundException('المحفظة غير موجودة');
        return wallet.entityId;
      }
      case RuleTargetType.PATH: {
        const path = await this.prisma.governancePath.findUnique({
          where: { id: targetId },
          include: { wallet: { select: { entityId: true } } },
        });
        if (!path) throw new NotFoundException('مسار الحوكمة غير موجود');
        return path.wallet.entityId;
      }
      case RuleTargetType.SPENDING_ITEM: {
        const item = await this.prisma.spendingItem.findUnique({
          where: { id: targetId },
          include: {
            governancePath: {
              include: { wallet: { select: { entityId: true } } },
            },
          },
        });
        if (!item) throw new NotFoundException('بند الصرف غير موجود');
        return item.governancePath.wallet.entityId;
      }
      case RuleTargetType.MEMBERSHIP: {
        const membership = await this.prisma.membership.findUnique({
          where: { id: targetId },
          select: { entityId: true },
        });
        if (!membership) throw new NotFoundException('العضوية غير موجودة');
        return membership.entityId;
      }
      default:
        throw new NotFoundException('نوع الهدف غير مدعوم');
    }
  }

  private async requireAdminOrFounder(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        entityId,
        personId,
        isActive: true,
        role: { in: [MemberRole.ADMIN, MemberRole.FOUNDER] },
      },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون مديراً أو مؤسساً');
  }

  private async requireMember(entityId: string, personId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { entityId, personId, isActive: true },
    });
    if (!m) throw new ForbiddenException('يجب أن تكون عضواً في الكيان');
  }
}
