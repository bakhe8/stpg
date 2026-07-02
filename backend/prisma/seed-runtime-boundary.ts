import { type SeedStoryRequirements } from './seed-stories';

type Identified = {
  id: string;
};

type CoverageInput = {
  persons: Array<Identified & { username: string }>;
  entities: Array<
    Identified & {
      name: string;
      type: string;
      platformStatus: string;
    }
  >;
  wallets: Array<Identified & { name: string; benefitType: string }>;
  governancePaths: Array<Identified & { type: string }>;
  subscriptions: Array<Identified & { state: string }>;
  paymentDues: Array<Identified & { status: string }>;
  paymentRecords: Array<Identified & { status: string }>;
  decisions: Array<
    Identified & {
      decisionType: string;
      status: string;
      result: string;
    }
  >;
  disbursementRequests: Array<Identified & { status: string }>;
  appeals: Array<Identified & { status: string }>;
  disputes: Array<Identified & { status: string }>;
  documents: Array<Identified & { privacyLevel: string }>;
  entityRelationships: Array<
    Identified & {
      type: string;
      approvalStatus: string;
    }
  >;
  walletRelationships: Array<
    Identified & {
      relationshipType: string;
      approvalStatus: string;
      contributionPercent: unknown;
      hasVotingRights: boolean;
      hasOversightRights: boolean;
    }
  >;
};

export const isStableSeedUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );

export const seedOnly = <T extends Identified>(items: T[]) =>
  items.filter((item) => isStableSeedUuid(item.id));

function toCoverageSet(values: Array<string | null | undefined>) {
  return new Set(
    values
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function buildSeedStoryCoverage(
  input: CoverageInput,
): Record<keyof SeedStoryRequirements, Set<string>> {
  const persons = seedOnly(input.persons);
  const entities = seedOnly(input.entities);
  const wallets = seedOnly(input.wallets);
  const governancePaths = seedOnly(input.governancePaths);
  const subscriptions = seedOnly(input.subscriptions);
  const paymentDues = seedOnly(input.paymentDues);
  const paymentRecords = seedOnly(input.paymentRecords);
  const decisions = seedOnly(input.decisions);
  const disbursementRequests = seedOnly(input.disbursementRequests);
  const appeals = seedOnly(input.appeals);
  const disputes = seedOnly(input.disputes);
  const documents = seedOnly(input.documents);
  const entityRelationships = seedOnly(input.entityRelationships);
  const walletRelationships = seedOnly(input.walletRelationships);

  return {
    usernames: toCoverageSet(persons.map((person) => person.username)),
    entityNames: toCoverageSet(entities.map((entity) => entity.name)),
    entityTypes: toCoverageSet(entities.map((entity) => entity.type)),
    platformStatuses: toCoverageSet(
      entities.map((entity) => entity.platformStatus),
    ),
    walletNames: toCoverageSet(wallets.map((wallet) => wallet.name)),
    walletBenefitTypes: toCoverageSet(
      wallets.map((wallet) => wallet.benefitType),
    ),
    governancePathTypes: toCoverageSet(
      governancePaths.map((path) => path.type),
    ),
    subscriptionStates: toCoverageSet(
      subscriptions.map((subscription) => subscription.state),
    ),
    paymentDueStatuses: toCoverageSet(paymentDues.map((due) => due.status)),
    paymentRecordStatuses: toCoverageSet(
      paymentRecords.map((record) => record.status),
    ),
    decisionTypes: toCoverageSet(
      decisions.map((decision) => decision.decisionType),
    ),
    decisionStatuses: toCoverageSet(
      decisions.map((decision) => decision.status),
    ),
    decisionResults: toCoverageSet(
      decisions.map((decision) => decision.result),
    ),
    disbursementStatuses: toCoverageSet(
      disbursementRequests.map((request) => request.status),
    ),
    appealStatuses: toCoverageSet(appeals.map((appeal) => appeal.status)),
    disputeStatuses: toCoverageSet(disputes.map((dispute) => dispute.status)),
    documentPrivacyLevels: toCoverageSet(
      documents.map((document) => document.privacyLevel),
    ),
    entityRelationshipTypes: toCoverageSet(
      entityRelationships.map((relationship) => relationship.type),
    ),
    walletRelationshipTypes: toCoverageSet(
      walletRelationships.map((relationship) => relationship.relationshipType),
    ),
    relationshipApprovalStatuses: toCoverageSet([
      ...entityRelationships.map((relationship) => relationship.approvalStatus),
      ...walletRelationships.map((relationship) => relationship.approvalStatus),
    ]),
    walletRelationshipRights: toCoverageSet(
      walletRelationships.flatMap((relationship) => [
        relationship.hasOversightRights && !relationship.hasVotingRights
          ? 'OVERSIGHT_WITHOUT_VOTE'
          : null,
        relationship.hasVotingRights && relationship.hasOversightRights
          ? 'VOTING_AND_OVERSIGHT'
          : null,
        Number(relationship.contributionPercent ?? 0) > 0
          ? 'CONTRIBUTION_PERCENT'
          : null,
      ]),
    ),
  };
}
