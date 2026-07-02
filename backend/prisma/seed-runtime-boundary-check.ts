import {
  buildSeedStoryCoverage,
  isStableSeedUuid,
} from './seed-runtime-boundary';

const seedId = 'fba96d5c-f6b8-52fb-92c9-0659b0e99211';
const runtimeId = 'bb274699-e806-47be-9677-d33d5b8ef864';

function expectSetIncludes(
  set: Set<string>,
  value: string,
  label: string,
) {
  if (!set.has(value)) {
    throw new Error(`${label} should include seeded value "${value}".`);
  }
}

function expectSetExcludes(
  set: Set<string>,
  value: string,
  label: string,
) {
  if (set.has(value)) {
    throw new Error(`${label} should exclude runtime value "${value}".`);
  }
}

function checkCoverageBoundary() {
  if (!isStableSeedUuid(seedId)) {
    throw new Error('The seed fixture id must be recognized as UUID v5.');
  }

  if (isStableSeedUuid(runtimeId)) {
    throw new Error('The runtime fixture id must not be recognized as seed.');
  }

  const coverage = buildSeedStoryCoverage({
    persons: [
      { id: seedId, username: 'seed.boundary.user' },
      { id: runtimeId, username: 'runtime.boundary.user' },
    ],
    entities: [
      {
        id: seedId,
        name: 'Seed Boundary Fund',
        type: 'FAMILY',
        platformStatus: 'SUSPENDED',
      },
      {
        id: runtimeId,
        name: 'Runtime Boundary Fund',
        type: 'CAMPAIGN',
        platformStatus: 'READ_ONLY',
      },
    ],
    wallets: [
      { id: seedId, name: 'Seed Boundary Wallet', benefitType: 'SHARED' },
      { id: runtimeId, name: 'Runtime Boundary Wallet', benefitType: 'SEPARABLE' },
    ],
    governancePaths: [
      { id: seedId, type: 'BOARD' },
      { id: runtimeId, type: 'DONATION_ONLY' },
    ],
    subscriptions: [
      { id: seedId, state: 'ACTIVE' },
      { id: runtimeId, state: 'EXITED' },
    ],
    paymentDues: [
      { id: seedId, status: 'PAID' },
      { id: runtimeId, status: 'OVERDUE' },
    ],
    paymentRecords: [
      { id: seedId, status: 'CONFIRMED' },
      { id: runtimeId, status: 'REJECTED' },
    ],
    decisions: [
      {
        id: seedId,
        decisionType: 'CREATE_WALLET',
        status: 'CLOSED',
        result: 'APPROVED',
      },
      {
        id: runtimeId,
        decisionType: 'CLOSE_WALLET',
        status: 'OPEN',
        result: 'REJECTED',
      },
    ],
    disbursementRequests: [
      { id: seedId, status: 'EXECUTED' },
      { id: runtimeId, status: 'CANCELLED' },
    ],
    appeals: [
      { id: seedId, status: 'UNDER_REVIEW' },
      { id: runtimeId, status: 'CLOSED' },
    ],
    disputes: [
      { id: seedId, status: 'UNDER_MEDIATION' },
      { id: runtimeId, status: 'CLOSED' },
    ],
    documents: [
      { id: seedId, privacyLevel: 'HIDDEN_SENSITIVE' },
      { id: runtimeId, privacyLevel: 'PUBLIC_TO_MEMBERS' },
    ],
    entityRelationships: [
      { id: seedId, type: 'FINANCIAL_SUPPORT', approvalStatus: 'ACTIVE' },
      { id: runtimeId, type: 'MERGER', approvalStatus: 'REJECTED' },
    ],
    walletRelationships: [
      {
        id: seedId,
        relationshipType: 'SUPPORT',
        approvalStatus: 'ACTIVE',
        contributionPercent: 50,
        hasVotingRights: false,
        hasOversightRights: true,
      },
      {
        id: runtimeId,
        relationshipType: 'REPORT_ONLY',
        approvalStatus: 'REJECTED',
        contributionPercent: 0,
        hasVotingRights: true,
        hasOversightRights: true,
      },
    ],
  });

  const expectations: Array<[keyof typeof coverage, string, string]> = [
    ['usernames', 'seed.boundary.user', 'runtime.boundary.user'],
    ['entityNames', 'Seed Boundary Fund', 'Runtime Boundary Fund'],
    ['entityTypes', 'FAMILY', 'CAMPAIGN'],
    ['platformStatuses', 'SUSPENDED', 'READ_ONLY'],
    ['walletNames', 'Seed Boundary Wallet', 'Runtime Boundary Wallet'],
    ['walletBenefitTypes', 'SHARED', 'SEPARABLE'],
    ['governancePathTypes', 'BOARD', 'DONATION_ONLY'],
    ['subscriptionStates', 'ACTIVE', 'EXITED'],
    ['paymentDueStatuses', 'PAID', 'OVERDUE'],
    ['paymentRecordStatuses', 'CONFIRMED', 'REJECTED'],
    ['decisionTypes', 'CREATE_WALLET', 'CLOSE_WALLET'],
    ['decisionStatuses', 'CLOSED', 'OPEN'],
    ['decisionResults', 'APPROVED', 'REJECTED'],
    ['disbursementStatuses', 'EXECUTED', 'CANCELLED'],
    ['appealStatuses', 'UNDER_REVIEW', 'CLOSED'],
    ['disputeStatuses', 'UNDER_MEDIATION', 'CLOSED'],
    ['documentPrivacyLevels', 'HIDDEN_SENSITIVE', 'PUBLIC_TO_MEMBERS'],
    ['entityRelationshipTypes', 'FINANCIAL_SUPPORT', 'MERGER'],
    ['walletRelationshipTypes', 'SUPPORT', 'REPORT_ONLY'],
    ['relationshipApprovalStatuses', 'ACTIVE', 'REJECTED'],
    ['walletRelationshipRights', 'OVERSIGHT_WITHOUT_VOTE', 'VOTING_AND_OVERSIGHT'],
  ];

  for (const [key, seedValue, runtimeValue] of expectations) {
    expectSetIncludes(coverage[key], seedValue, key);
    expectSetExcludes(coverage[key], runtimeValue, key);
  }
}

checkCoverageBoundary();
console.log('Seed runtime boundary check passed.');
