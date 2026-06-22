import {
  AppealType,
  DecisionType,
  DisputeType,
  GovernancePathType,
  RuleTargetType,
  RuleType,
  VoteType,
  VotersScope,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RulesService } from './rules.service';

describe('RulesService', () => {
  let prisma: {
    rule: { findMany: jest.Mock };
    governancePath: { findUnique: jest.Mock };
  };
  let service: RulesService;

  beforeEach(() => {
    prisma = {
      rule: { findMany: jest.fn() },
      governancePath: {
        findUnique: jest.fn().mockResolvedValue({
          walletId: 'wallet-id',
          wallet: { entityId: 'entity-id' },
        }),
      },
    };

    service = new RulesService(prisma as unknown as PrismaService);
  });

  it('allows REQUIRES_DOCUMENTS rules when attachments are provided', async () => {
    prisma.rule.findMany.mockResolvedValue([
      {
        id: 'rule-id',
        targetType: RuleTargetType.PATH,
        targetId: 'path-id',
        ruleType: RuleType.REQUIRES_DOCUMENTS,
        name: 'إثبات الصرف',
        ruleData: { required: true },
      },
    ]);

    const result = await service.evaluateSpendingRules(
      'path-id',
      250,
      undefined,
      { attachmentsCount: 1 },
    );

    expect(result).toEqual({ allowed: true, violations: [] });
  });

  it('rejects REQUIRES_DOCUMENTS rules when no attachments are provided', async () => {
    prisma.rule.findMany.mockResolvedValue([
      {
        id: 'rule-id',
        targetType: RuleTargetType.PATH,
        targetId: 'path-id',
        ruleType: RuleType.REQUIRES_DOCUMENTS,
        name: 'إثبات الصرف',
        ruleData: { required: true },
      },
    ]);

    const result = await service.evaluateSpendingRules('path-id', 250);

    expect(result.allowed).toBe(false);
    expect(result.violations).toContain(
      'القاعدة "إثبات الصرف": يجب إرفاق مستندات داعمة لهذا الصرف',
    );
  });

  it('applies quorum rules to decisions', async () => {
    prisma.rule.findMany.mockResolvedValue([
      {
        id: 'rule-id',
        targetType: RuleTargetType.PATH,
        targetId: 'path-id',
        ruleType: RuleType.QUORUM,
        name: 'نصاب المسار',
        ruleData: { minQuorumPercent: 60, allowedVoteTypes: ['TWO_THIRDS'] },
      },
    ]);

    const result = await service.evaluateDecisionRules({
      entityId: 'entity-id',
      walletId: 'wallet-id',
      pathId: 'path-id',
      decisionType: DecisionType.MODIFY_GOVERNANCE,
      quorumPercent: 50,
      approvalPercent: 51,
      voteType: VoteType.SIMPLE_MAJORITY,
      votersScope: VotersScope.ALL_MEMBERS,
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'القاعدة "نصاب المسار": النصاب المطلوب لا يقل عن 60%',
        'القاعدة "نصاب المسار": نوع التصويت SIMPLE_MAJORITY غير مسموح',
      ]),
    );
  });

  it('applies eligibility rules to subscriptions', async () => {
    prisma.rule.findMany.mockResolvedValue([
      {
        id: 'rule-id',
        targetType: RuleTargetType.PATH,
        targetId: 'path-id',
        ruleType: RuleType.ELIGIBILITY,
        name: 'أهلية الاشتراك',
        ruleData: { minAgreedAmount: 100, allowedPathTypes: ['COMMITTEE'] },
      },
    ]);

    const result = await service.evaluateSubscriptionRules({
      entityId: 'entity-id',
      walletId: 'wallet-id',
      pathId: 'path-id',
      pathType: GovernancePathType.PUBLIC_VOTE,
      membershipId: 'membership-id',
      agreedAmount: 50,
      hasActiveMembership: true,
      hasAuditor: true,
      hasCommitteeApprovalPath: false,
      allowAppeals: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'القاعدة "أهلية الاشتراك": نوع المسار PUBLIC_VOTE غير مسموح لهذه الأهلية',
        'القاعدة "أهلية الاشتراك": مبلغ الاشتراك أقل من الحد الأدنى 100',
      ]),
    );
  });

  it('applies transfer rules to balance transfers', async () => {
    prisma.rule.findMany.mockResolvedValue([
      {
        id: 'rule-id',
        targetType: RuleTargetType.PATH,
        targetId: 'source-path-id',
        ruleType: RuleType.TRANSFER,
        name: 'عزل المحفظة',
        ruleData: { sameWalletOnly: true, maxAmount: 300 },
      },
    ]);

    const result = await service.evaluateTransferRules({
      entityId: 'entity-id',
      sourceWalletId: 'wallet-a',
      sourcePathId: 'source-path-id',
      targetWalletId: 'wallet-b',
      targetPathId: 'target-path-id',
      amount: 500,
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'القاعدة "عزل المحفظة": مبلغ النقل يتجاوز الحد الأعلى 300',
        'القاعدة "عزل المحفظة": النقل مسموح فقط بين مسارات المحفظة نفسها',
      ]),
    );
  });

  it('applies eligibility rules to appeals', async () => {
    prisma.rule.findMany.mockResolvedValue([
      {
        id: 'rule-id',
        targetType: RuleTargetType.PATH,
        targetId: 'path-id',
        ruleType: RuleType.ELIGIBILITY,
        name: 'أهلية الاعتراض',
        ruleData: {
          allowedAppealTypes: ['POLICY_BREACH'],
          requiresRequestedAction: true,
        },
      },
    ]);

    const result = await service.evaluateAppealRules({
      entityId: 'entity-id',
      walletId: 'wallet-id',
      pathId: 'path-id',
      decisionType: DecisionType.DISBURSE_FUNDS,
      appealType: AppealType.APPEAL,
      evidenceCount: 1,
      requestedAction: '',
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'القاعدة "أهلية الاعتراض": نوع الاعتراض APPEAL غير مسموح',
        'القاعدة "أهلية الاعتراض": يجب تحديد الإجراء المطلوب في الاعتراض',
      ]),
    );
  });

  it('applies eligibility rules to disputes', async () => {
    prisma.rule.findMany.mockResolvedValue([
      {
        id: 'rule-id',
        targetType: RuleTargetType.ENTITY,
        targetId: 'entity-id',
        ruleType: RuleType.ELIGIBILITY,
        name: 'أهلية النزاع',
        ruleData: {
          requiresRespondent: true,
          requiresLinkedAppeal: true,
          allowedDisputeTypes: ['POLICY_BREACH'],
        },
      },
    ]);

    const result = await service.evaluateDisputeRules({
      entityId: 'entity-id',
      walletId: 'wallet-id',
      pathId: 'path-id',
      disputeType: DisputeType.TRANSPARENCY_ISSUE,
      evidenceCount: 1,
      hasRespondent: false,
      hasLinkedAppeal: false,
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'القاعدة "أهلية النزاع": نوع النزاع TRANSPARENCY_ISSUE غير مسموح',
        'القاعدة "أهلية النزاع": يجب تحديد طرف مقابل عند فتح النزاع',
        'القاعدة "أهلية النزاع": يجب ربط النزاع باعتراض سابق',
      ]),
    );
  });

  describe('evaluateRelationshipRules', () => {
    it('allows when no eligibility rules are defined', async () => {
      prisma.rule.findMany.mockResolvedValue([]);

      const result = await service.evaluateRelationshipRules({
        sourceEntityId: 'entity-a',
        targetEntityId: 'entity-b',
        relationshipType: 'FINANCIAL_SUPPORT',
      });

      expect(result).toEqual({ allowed: true, violations: [] });
    });

    it('rejects a relationship type not in allowedRelationshipTypes', async () => {
      prisma.rule.findMany.mockResolvedValue([
        {
          id: 'rule-id',
          targetType: RuleTargetType.ENTITY,
          targetId: 'entity-a',
          ruleType: RuleType.ELIGIBILITY,
          name: 'علاقات مسموحة',
          ruleData: { allowedRelationshipTypes: ['PARENT_CHILD'] },
        },
      ]);

      const result = await service.evaluateRelationshipRules({
        sourceEntityId: 'entity-a',
        targetEntityId: 'entity-b',
        relationshipType: 'FINANCIAL_SUPPORT',
      });

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain(
        'القاعدة "علاقات مسموحة": نوع العلاقة FINANCIAL_SUPPORT غير مسموح',
      );
    });

    it('rejects a relationship type listed in disallowedRelationshipTypes', async () => {
      prisma.rule.findMany.mockResolvedValue([
        {
          id: 'rule-id',
          targetType: RuleTargetType.ENTITY,
          targetId: 'entity-b',
          ruleType: RuleType.ELIGIBILITY,
          name: 'علاقات محظورة',
          ruleData: { disallowedRelationshipTypes: ['FINANCIAL_SUPPORT'] },
        },
      ]);

      const result = await service.evaluateRelationshipRules({
        sourceEntityId: 'entity-a',
        targetEntityId: 'entity-b',
        relationshipType: 'FINANCIAL_SUPPORT',
      });

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain(
        'القاعدة "علاقات محظورة": نوع العلاقة FINANCIAL_SUPPORT محظور',
      );
    });
  });

  describe('evaluateSubscriptionTransitionRules', () => {
    it('allows a transition when no constraints are defined', async () => {
      prisma.rule.findMany.mockResolvedValue([]);

      const result = await service.evaluateSubscriptionTransitionRules({
        entityId: 'entity-id',
        walletId: 'wallet-id',
        pathId: 'path-id',
        membershipId: 'membership-id',
        fromState: 'SUSPENDED',
        toState: 'ACTIVE',
      });

      expect(result).toEqual({ allowed: true, violations: [] });
    });

    it('rejects a transition not listed in allowedTransitions', async () => {
      prisma.rule.findMany.mockResolvedValue([
        {
          id: 'rule-id',
          targetType: RuleTargetType.PATH,
          targetId: 'path-id',
          ruleType: RuleType.ELIGIBILITY,
          name: 'انتقالات الاشتراك',
          ruleData: { allowedTransitions: ['ACTIVE_TO_SUSPENDED'] },
        },
      ]);

      const result = await service.evaluateSubscriptionTransitionRules({
        entityId: 'entity-id',
        walletId: 'wallet-id',
        pathId: 'path-id',
        membershipId: 'membership-id',
        fromState: 'SUSPENDED',
        toState: 'ACTIVE',
      });

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain(
        'القاعدة "انتقالات الاشتراك": الانتقال من SUSPENDED إلى ACTIVE غير مسموح',
      );
    });

    it('rejects a transition listed in disallowedTransitions', async () => {
      prisma.rule.findMany.mockResolvedValue([
        {
          id: 'rule-id',
          targetType: RuleTargetType.ENTITY,
          targetId: 'entity-id',
          ruleType: RuleType.ELIGIBILITY,
          name: 'تجميد إعادة التفعيل',
          ruleData: { disallowedTransitions: ['SUSPENDED_TO_ACTIVE'] },
        },
      ]);

      const result = await service.evaluateSubscriptionTransitionRules({
        entityId: 'entity-id',
        walletId: 'wallet-id',
        pathId: 'path-id',
        membershipId: 'membership-id',
        fromState: 'SUSPENDED',
        toState: 'ACTIVE',
      });

      expect(result.allowed).toBe(false);
      expect(result.violations).toContain(
        'القاعدة "تجميد إعادة التفعيل": الانتقال من SUSPENDED إلى ACTIVE محظور',
      );
    });

    it('rejects reactivation from SUSPENDED before minSuspensionDays have passed', async () => {
      prisma.rule.findMany.mockResolvedValue([
        {
          id: 'rule-id',
          targetType: RuleTargetType.PATH,
          targetId: 'path-id',
          ruleType: RuleType.ELIGIBILITY,
          name: 'فترة التعليق الإلزامية',
          ruleData: { minSuspensionDaysBeforeReactivation: 30 },
        },
      ]);

      const recentSuspension = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const result = await service.evaluateSubscriptionTransitionRules({
        entityId: 'entity-id',
        walletId: 'wallet-id',
        pathId: 'path-id',
        membershipId: 'membership-id',
        fromState: 'SUSPENDED',
        toState: 'ACTIVE',
        suspendedAt: recentSuspension,
      });

      expect(result.allowed).toBe(false);
      expect(result.violations[0]).toMatch(
        /يجب أن يمر 30 يوم على التعليق قبل إعادة التفعيل/,
      );
    });

    it('allows reactivation when enough suspension days have passed', async () => {
      prisma.rule.findMany.mockResolvedValue([
        {
          id: 'rule-id',
          targetType: RuleTargetType.PATH,
          targetId: 'path-id',
          ruleType: RuleType.ELIGIBILITY,
          name: 'فترة التعليق',
          ruleData: { minSuspensionDaysBeforeReactivation: 30 },
        },
      ]);

      const oldSuspension = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      const result = await service.evaluateSubscriptionTransitionRules({
        entityId: 'entity-id',
        walletId: 'wallet-id',
        pathId: 'path-id',
        membershipId: 'membership-id',
        fromState: 'SUSPENDED',
        toState: 'ACTIVE',
        suspendedAt: oldSuspension,
      });

      expect(result).toEqual({ allowed: true, violations: [] });
    });
  });

  it('returns curated templates for appeals and disputes', () => {
    const templates = service.getTemplates();
    const templateCodes = templates.map((template) => template.code);

    expect(templateCodes).toEqual(
      expect.arrayContaining([
        'APPEAL_REQUIRE_EVIDENCE',
        'DISPUTE_REQUIRE_EVIDENCE',
      ]),
    );
  });
});
