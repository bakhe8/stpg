import {
  seedStoryDefinitions,
  type SeedStoryRequirements,
} from '../../prisma/seed-stories';

type RequirementKey = keyof SeedStoryRequirements;

type ParityCapability = {
  name: string;
  checks: Array<{
    key: RequirementKey;
    values: string[];
  }>;
};

const phaseDParityCapabilities: ParityCapability[] = [
  {
    name: 'voting and governance decision models',
    checks: [
      {
        key: 'governancePathTypes',
        values: [
          'BOARD',
          'COMMITTEE',
          'PUBLIC_VOTE',
          'INDIVIDUAL_WITH_CAP',
          'DONATION_ONLY',
          'EMERGENCY_FAST',
        ],
      },
      {
        key: 'decisionTypes',
        values: [
          'DISBURSE_FUNDS',
          'TRANSFER_BALANCE',
          'CREATE_WALLET',
          'CREATE_PATH',
          'CLOSE_WALLET',
        ],
      },
      { key: 'decisionStatuses', values: ['OPEN', 'APPEALED'] },
    ],
  },
  {
    name: 'committees and delegated review',
    checks: [
      { key: 'governancePathTypes', values: ['COMMITTEE', 'BOARD'] },
      { key: 'documentPrivacyLevels', values: ['VISIBLE_TO_COMMITTEE'] },
    ],
  },
  {
    name: 'money, payments, and ledger-facing states',
    checks: [
      { key: 'walletBenefitTypes', values: ['SHARED', 'SEPARABLE'] },
      { key: 'paymentDueStatuses', values: ['PAID', 'PENDING', 'OVERDUE'] },
      {
        key: 'paymentRecordStatuses',
        values: [
          'CONFIRMED',
          'SUBMITTED',
          'REJECTED',
          'CANCELLED',
          'PROCESSING',
        ],
      },
    ],
  },
  {
    name: 'disbursement execution and review',
    checks: [
      { key: 'decisionTypes', values: ['DISBURSE_FUNDS'] },
      { key: 'disbursementStatuses', values: ['PENDING', 'EXECUTED'] },
    ],
  },
  {
    name: 'subscriptions and participation states',
    checks: [
      {
        key: 'subscriptionStates',
        values: [
          'ACTIVE',
          'CONDITIONAL',
          'SUSPENDED',
          'EXITED',
          'SUPPORTER_ONLY',
        ],
      },
    ],
  },
  {
    name: 'appeals, disputes, and audit evidence surfaces',
    checks: [
      {
        key: 'appealStatuses',
        values: ['OPEN', 'UNDER_REVIEW', 'CLOSED', 'ESCALATED'],
      },
      {
        key: 'disputeStatuses',
        values: ['OPEN', 'UNDER_MEDIATION', 'ESCALATED', 'RESOLVED', 'CLOSED'],
      },
      {
        key: 'documentPrivacyLevels',
        values: [
          'VISIBLE_TO_AUDITOR',
          'VISIBLE_TO_COMMITTEE',
          'HIDDEN_SENSITIVE',
          'AGGREGATED_ONLY',
        ],
      },
    ],
  },
  {
    name: 'campaign lifecycle as separate from a durable fund',
    checks: [
      { key: 'entityTypes', values: ['CAMPAIGN'] },
      { key: 'platformStatuses', values: ['READ_ONLY'] },
      { key: 'governancePathTypes', values: ['DONATION_ONLY'] },
      { key: 'decisionTypes', values: ['CLOSE_WALLET'] },
    ],
  },
  {
    name: 'multiple wallets, relationships, and cross-fund support',
    checks: [
      {
        key: 'entityRelationshipTypes',
        values: [
          'SHARED_WALLET',
          'CONTRIBUTION_NO_VOTE',
          'CONTRIBUTION_WITH_OVERSIGHT',
          'REPORT_SHARING',
        ],
      },
      {
        key: 'walletRelationshipTypes',
        values: ['SHARED', 'SUPPORT', 'REPORT_ONLY'],
      },
      {
        key: 'relationshipApprovalStatuses',
        values: ['ACTIVE', 'PENDING', 'REJECTED', 'ENDED'],
      },
      {
        key: 'walletRelationshipRights',
        values: [
          'OVERSIGHT_WITHOUT_VOTE',
          'VOTING_AND_OVERSIGHT',
          'CONTRIBUTION_PERCENT',
        ],
      },
    ],
  },
];

function coveredValues(key: RequirementKey) {
  return new Set(
    seedStoryDefinitions.flatMap((story) => story.requirements[key] ?? []),
  );
}

describe('Phase D create-flow parity pack', () => {
  it('keeps seed stories covering every capability needed before the new flow can become default', () => {
    for (const capability of phaseDParityCapabilities) {
      for (const check of capability.checks) {
        const covered = coveredValues(check.key);
        const missing = check.values.filter((value) => !covered.has(value));

        expect({
          capability: capability.name,
          key: check.key,
          missing,
        }).toEqual({
          capability: capability.name,
          key: check.key,
          missing: [],
        });
      }
    }
  });
});
