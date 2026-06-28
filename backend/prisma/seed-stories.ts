export type SeedStoryRequirements = {
  usernames?: string[];
  entityNames?: string[];
  entityTypes?: string[];
  platformStatuses?: string[];
  walletNames?: string[];
  walletBenefitTypes?: string[];
  governancePathTypes?: string[];
  subscriptionStates?: string[];
  paymentDueStatuses?: string[];
  paymentRecordStatuses?: string[];
  decisionTypes?: string[];
  decisionStatuses?: string[];
  decisionResults?: string[];
  disbursementStatuses?: string[];
  appealStatuses?: string[];
  disputeStatuses?: string[];
  documentPrivacyLevels?: string[];
  entityRelationshipTypes?: string[];
  walletRelationshipTypes?: string[];
  relationshipApprovalStatuses?: string[];
  walletRelationshipRights?: string[];
};

export type SeedStoryDefinition = {
  id: string;
  name: string;
  goal: string;
  requirements: SeedStoryRequirements;
};

export const seedStoryDefinitions: SeedStoryDefinition[] = [
  {
    id: 'S-01',
    name: 'صندوق عائلة بسيط',
    goal: 'Founder creates and operates a simple family fund with payments, arrears, and a monthly view.',
    requirements: {
      usernames: [
        'seed.ahmed.family',
        'seed.nasser.family',
        'seed.khaled.suspended',
      ],
      entityTypes: ['FAMILY'],
      walletNames: ['محفظة الطوارئ العائلية'],
      governancePathTypes: ['BOARD', 'PUBLIC_VOTE'],
      paymentDueStatuses: ['PAID', 'PENDING', 'OVERDUE'],
      paymentRecordStatuses: ['CONFIRMED'],
      disbursementStatuses: ['PENDING', 'EXECUTED'],
    },
  },
  {
    id: 'S-02',
    name: 'صندوق عائلة معقد',
    goal: 'Large family fund with committees, auditor, multiple wallets, disputes, and mixed payment states.',
    requirements: {
      usernames: [
        'seed.sara.family',
        'seed.layan.audit',
        'seed.majed.medical',
        'seed.noura.social',
      ],
      entityNames: ['صندوق عائلة الهاشمي'],
      walletNames: ['محفظة الزواج', 'محفظة التعليم', 'محفظة الخدمات المشتركة'],
      governancePathTypes: [
        'COMMITTEE',
        'INDIVIDUAL_WITH_CAP',
        'EMERGENCY_FAST',
        'DONATION_ONLY',
      ],
      subscriptionStates: [
        'ACTIVE',
        'CONDITIONAL',
        'SUSPENDED',
        'EXITED',
        'SUPPORTER_ONLY',
      ],
      paymentRecordStatuses: [
        'SUBMITTED',
        'REJECTED',
        'CANCELLED',
        'PROCESSING',
      ],
      appealStatuses: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'],
      disputeStatuses: ['OPEN', 'UNDER_MEDIATION', 'CLOSED'],
    },
  },
  {
    id: 'S-03',
    name: 'عمارة shared benefit',
    goal: 'Building shared services such as guard, elevator, and maintenance with non-payers and vendor dispute.',
    requirements: {
      usernames: [
        'seed.abdullah.building',
        'seed.mona.building',
        'seed.faisal.overlap',
      ],
      entityTypes: ['BUILDING'],
      walletNames: ['محفظة صيانة العمارة', 'محفظة الطوارئ للعمارة'],
      walletBenefitTypes: ['SHARED'],
      governancePathTypes: ['PUBLIC_VOTE', 'COMMITTEE'],
      paymentDueStatuses: ['OVERDUE'],
      decisionTypes: ['OPEN_DISPUTE', 'MERGE_PATHS'],
      disputeStatuses: ['ESCALATED'],
    },
  },
  {
    id: 'S-04',
    name: 'حي قيد المراجعة',
    goal: 'Neighborhood entity under platform review while still showing members, projects, and pending review context.',
    requirements: {
      usernames: ['seed.yahya.neighborhood'],
      entityNames: ['تكافل حي الروضة'],
      entityTypes: ['NEIGHBORHOOD'],
      platformStatuses: ['PENDING_REVIEW'],
      walletNames: ['محفظة التكافل الصحي', 'محفظة مشاريع الحي'],
    },
  },
  {
    id: 'S-05',
    name: 'حملة علاج مؤقتة',
    goal: 'Read-only medical campaign with donor-only path, partial disbursement, appeal, and legal hold.',
    requirements: {
      usernames: ['seed.fahad.case'],
      entityNames: ['حملة علاج فهد'],
      entityTypes: ['CAMPAIGN'],
      platformStatuses: ['READ_ONLY'],
      walletNames: ['محفظة علاج فهد'],
      governancePathTypes: ['DONATION_ONLY'],
      decisionTypes: ['CLOSE_WALLET'],
      decisionStatuses: ['APPEALED'],
      disputeStatuses: ['OPEN'],
      documentPrivacyLevels: ['AGGREGATED_ONLY', 'HIDDEN_SENSITIVE'],
    },
  },
  {
    id: 'S-06',
    name: 'قبيلة وصندوق واسع',
    goal: 'Tribe fund with relief, legacy reserve, donations, and broader governance decisions.',
    requirements: {
      usernames: ['seed.abdulrahman.tribe'],
      entityNames: ['صندوق قبيلة السهم'],
      entityTypes: ['TRIBE'],
      walletNames: ['محفظة الفزعة القبلية', 'محفظة الوقف القديمة'],
      governancePathTypes: ['BOARD', 'DONATION_ONLY'],
      decisionTypes: ['CREATE_WALLET', 'CREATE_PATH', 'DISBURSE_FUNDS'],
      decisionStatuses: ['APPEALED'],
      disbursementStatuses: ['EXECUTED'],
      appealStatuses: ['UNDER_REVIEW'],
      disputeStatuses: ['UNDER_MEDIATION'],
      documentPrivacyLevels: ['VISIBLE_TO_AUDITOR', 'VISIBLE_TO_COMMITTEE'],
    },
  },
  {
    id: 'S-07',
    name: 'كيان تأسيسي شبه فارغ',
    goal: 'Pre-launch entities and inactive zero-balance wallets for empty and early-day states.',
    requirements: {
      entityNames: ['صندوق مبادرة جسر العائلة', 'صندوق اتحاد مرافق المروج'],
      walletNames: ['محفظة التأسيس', 'محفظة تجهيز المرافق'],
      decisionTypes: ['CLOSE_WALLET'],
      decisionStatuses: ['OPEN'],
    },
  },
  {
    id: 'S-08',
    name: 'تعدد الكيانات',
    goal: 'One user belongs to multiple entities with different roles, dues, wallets, and access scopes.',
    requirements: {
      usernames: ['seed.faisal.overlap', 'seed.reem.overlap'],
      entityTypes: ['FAMILY', 'BUILDING', 'NEIGHBORHOOD'],
      platformStatuses: ['ACTIVE', 'PENDING_REVIEW'],
    },
  },
  {
    id: 'S-09',
    name: 'محفظة متعددة المسارات',
    goal: 'One wallet with separate paths for committee, public vote, emergency, cap, and donor-only rights.',
    requirements: {
      walletNames: ['محفظة الطوارئ العائلية', 'محفظة الزواج'],
      governancePathTypes: [
        'BOARD',
        'COMMITTEE',
        'INDIVIDUAL_WITH_CAP',
        'EMERGENCY_FAST',
        'DONATION_ONLY',
      ],
      decisionTypes: ['TRANSFER_BALANCE', 'DISBURSE_FUNDS'],
    },
  },
  {
    id: 'S-10',
    name: 'نزاع كامل timeline',
    goal: 'Appeals, disputes, policy versions, documents, and audit trails around a full dispute lifecycle.',
    requirements: {
      appealStatuses: ['OPEN', 'UNDER_REVIEW', 'CLOSED', 'ESCALATED'],
      disputeStatuses: ['OPEN', 'UNDER_MEDIATION', 'ESCALATED', 'RESOLVED'],
      documentPrivacyLevels: [
        'VISIBLE_TO_AUDITOR',
        'VISIBLE_TO_COMMITTEE',
        'HIDDEN_SENSITIVE',
      ],
    },
  },
  {
    id: 'S-11',
    name: 'عضو مشروط',
    goal: 'Conditional member who has obligations and limited rights until activation.',
    requirements: {
      usernames: ['seed.amal.conditional'],
      subscriptionStates: ['CONDITIONAL'],
      disbursementStatuses: ['PENDING'],
    },
  },
  {
    id: 'S-12',
    name: 'داعم فقط',
    goal: 'Supporter-only participation with payment/donation but no benefit rights.',
    requirements: {
      subscriptionStates: ['SUPPORTER_ONLY'],
      governancePathTypes: ['DONATION_ONLY'],
      paymentDueStatuses: ['PENDING'],
      documentPrivacyLevels: ['AGGREGATED_ONLY'],
    },
  },
  {
    id: 'S-13',
    name: 'عضو موقوف أو خرج',
    goal: 'Suspended and exited members with arrears, no new rights, and appeal/dispute evidence.',
    requirements: {
      usernames: ['seed.khaled.suspended', 'seed.huda.exited'],
      subscriptionStates: ['SUSPENDED', 'EXITED'],
      decisionTypes: ['EXPEL_MEMBER'],
      decisionStatuses: ['APPEALED'],
      disputeStatuses: ['OPEN', 'CLOSED'],
    },
  },
  {
    id: 'S-14',
    name: 'علاقات كيانات ومحافظ',
    goal: 'Financial support, report-only, shared wallet, pending, rejected, and ended relationships.',
    requirements: {
      entityTypes: ['FAMILY', 'BUILDING', 'NEIGHBORHOOD', 'CAMPAIGN'],
      walletBenefitTypes: ['SHARED', 'SEPARABLE'],
      entityRelationshipTypes: [
        'SHARED_WALLET',
        'CONTRIBUTION_NO_VOTE',
        'CONTRIBUTION_WITH_OVERSIGHT',
        'REPORT_SHARING',
      ],
      walletRelationshipTypes: ['SHARED', 'SUPPORT', 'REPORT_ONLY'],
      relationshipApprovalStatuses: ['ACTIVE', 'PENDING', 'REJECTED', 'ENDED'],
      walletRelationshipRights: [
        'OVERSIGHT_WITHOUT_VOTE',
        'VOTING_AND_OVERSIGHT',
        'CONTRIBUTION_PERCENT',
      ],
      decisionTypes: ['TRANSFER_BALANCE'],
      paymentRecordStatuses: ['CONFIRMED'],
    },
  },
];
