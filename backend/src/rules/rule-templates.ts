import { RuleTargetType, RuleType } from '@prisma/client';

export interface RuleTemplate {
  code: string;
  name: string;
  description: string;
  recommendedTargetType: RuleTargetType;
  ruleType: RuleType;
  priority: number;
  ruleData: Record<string, unknown>;
}

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    code: 'APPEAL_REQUIRE_EVIDENCE',
    name: 'إلزام أدلة في الاعتراض',
    description:
      'يشترط وجود أدلة مرفقة عند تقديم أي اعتراض على المسار أو الكيان.',
    recommendedTargetType: RuleTargetType.PATH,
    ruleType: RuleType.REQUIRES_DOCUMENTS,
    priority: 90,
    ruleData: {
      required: true,
      appliesTo: 'APPEAL',
    },
  },
  {
    code: 'APPEAL_ALLOWED_TYPES_STANDARD',
    name: 'أنواع اعتراض مسموحة (قياسي)',
    description:
      'يسمح بالاعتراضات القياسية ويمنع الأنواع القانونية الحرجة من المسار التشغيلي العادي.',
    recommendedTargetType: RuleTargetType.ENTITY,
    ruleType: RuleType.ELIGIBILITY,
    priority: 80,
    ruleData: {
      allowedAppealTypes: ['CLARIFICATION_REQUEST', 'APPEAL', 'FORMAL_REVIEW'],
      disallowedAppealTypes: ['LEGAL_CONCERN'],
      requiresRequestedAction: true,
    },
  },
  {
    code: 'DISPUTE_REQUIRE_EVIDENCE',
    name: 'إلزام أدلة في النزاع',
    description: 'يمنع فتح نزاع بدون أدلة أو مستندات داعمة.',
    recommendedTargetType: RuleTargetType.ENTITY,
    ruleType: RuleType.REQUIRES_DOCUMENTS,
    priority: 90,
    ruleData: {
      required: true,
      appliesTo: 'DISPUTE',
    },
  },
  {
    code: 'DISPUTE_REQUIRE_RESPONDENT_AND_APPEAL',
    name: 'النزاع المؤسسي يجب أن يحدد الطرف المقابل ويرتبط باعتراض',
    description:
      'يضمن أن النزاعات الرسمية مرتبطة بخلفية اعتراض مع طرف مقابل واضح.',
    recommendedTargetType: RuleTargetType.PATH,
    ruleType: RuleType.ELIGIBILITY,
    priority: 95,
    ruleData: {
      requiresRespondent: true,
      requiresLinkedAppeal: true,
      allowedDisputeTypes: [
        'POLICY_BREACH',
        'UNFAIR_DECISION',
        'TRANSPARENCY_ISSUE',
      ],
    },
  },
  {
    code: 'DISPUTE_LIMIT_TO_POLICY_AND_TRANSPARENCY',
    name: 'حصر النزاعات في السياسة والشفافية',
    description:
      'مثال سياسة محافظة تمنع استخدام النزاعات في الأنواع غير الحوكمية.',
    recommendedTargetType: RuleTargetType.WALLET,
    ruleType: RuleType.ELIGIBILITY,
    priority: 60,
    ruleData: {
      allowedDisputeTypes: ['POLICY_BREACH', 'TRANSPARENCY_ISSUE'],
    },
  },
];
