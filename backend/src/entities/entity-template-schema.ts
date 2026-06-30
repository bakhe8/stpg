import {
  ExitRefundPolicy,
  GovernancePathType,
  Prisma,
  SubscriptionFrequency,
  TransparencyLevel,
  VoteType,
  WalletBenefitType,
} from '@prisma/client';

type JsonRecord = Record<string, unknown>;

type TemplateEnvelope = {
  id?: string;
  name?: string;
  defaultPolicy?: Prisma.JsonValue | null;
  defaultWallets?: Prisma.JsonValue | null;
  defaultPaths?: Prisma.JsonValue | null;
};

export type NormalizedTemplateWallet = {
  tempId?: string;
  name: string;
  description?: string;
  benefitType?: WalletBenefitType;
  currency?: string;
  policy: Prisma.WalletPolicyCreateWithoutWalletInput;
};

export type NormalizedTemplateSpendingItem = {
  currency?: string;
  data: Prisma.SpendingItemCreateWithoutGovernancePathInput;
};

export type NormalizedTemplatePath = {
  tempId?: string;
  walletTempId?: string;
  name: string;
  description?: string;
  type: GovernancePathType;
  currency?: string;
  policy: Prisma.PathPolicyCreateWithoutGovernancePathInput;
  spendingItems: NormalizedTemplateSpendingItem[];
};

export type NormalizedEntityTemplate = {
  policy: Prisma.EntityPolicyCreateWithoutEntityInput;
  wallets: NormalizedTemplateWallet[];
  paths: NormalizedTemplatePath[];
};

export class TemplateValidationError extends Error {
  constructor(
    readonly templateLabel: string,
    readonly findings: string[],
  ) {
    super(`${templateLabel}: ${findings.join('; ')}`);
    this.name = 'TemplateValidationError';
  }
}

const entityPolicyKeys = new Set([
  'allowOpenMembership',
  'requiresMemberApproval',
  'allowMultiplePaths',
  'allowSubEntities',
  'allowEntityRelations',
  'allowedGovernanceTypes',
  'defaultVoteType',
  'decisionQuorumPercent',
  'defaultTransparency',
  'allowAppeals',
  'appealTimeoutDays',
  'extraRules',
]);

const walletKeys = new Set([
  'id',
  'name',
  'description',
  'benefitType',
  'currency',
  'policy',
]);

const walletPolicyKeys = new Set([
  'subscriptionAmount',
  'subscriptionFrequency',
  'gracePeriodDays',
  'minimumActiveMonths',
  'maxBenefitPerYear',
  'exitNoticeDays',
  'exitRefundPolicy',
  'balanceTransparency',
  'transactionTransparency',
  'beneficiaryTransparency',
  'extraRules',
]);

const pathKeys = new Set([
  'id',
  'name',
  'description',
  'type',
  'walletTempId',
  'currency',
  'policy',
  'rules',
  'spendingItems',
]);

const pathPolicyKeys = new Set([
  'voteType',
  'individualSpendingCap',
  'requiresDocuments',
  'quorumPercent',
  'approvalPercent',
  'votingDurationHours',
  'allowAppeals',
  'appealWindowDays',
  'allowBalanceTransfer',
  'extraRules',
]);

const spendingItemKeys = new Set([
  'id',
  'name',
  'description',
  'eligibilityCriteria',
  'requiredDocuments',
  'maxAmountPerRequest',
  'maxAmountPerYear',
  'privacyLevel',
  'requiresCommitteeApproval',
  'allowsException',
  'currency',
]);

export function normalizeEntityTemplate(
  template: TemplateEnvelope,
): NormalizedEntityTemplate {
  const label = template.name ?? template.id ?? 'EntityTemplate';
  const findings: string[] = [];
  const policy = normalizeEntityPolicy(
    template.defaultPolicy,
    `${label}.defaultPolicy`,
    findings,
  );
  const wallets = normalizeWallets(
    template.defaultWallets,
    `${label}.defaultWallets`,
    findings,
  );
  const paths = normalizePaths(
    template.defaultPaths,
    `${label}.defaultPaths`,
    findings,
  );

  const walletIds = new Set(
    wallets
      .map((wallet) => wallet.tempId)
      .filter((tempId): tempId is string => !!tempId),
  );
  for (const path of paths) {
    if (path.walletTempId && !walletIds.has(path.walletTempId)) {
      findings.push(
        `${label}.defaultPaths path "${path.name}" references unknown walletTempId "${path.walletTempId}"`,
      );
    }
  }
  if (paths.length > 0 && wallets.length === 0) {
    findings.push(
      `${label}.defaultPaths cannot create paths without defaultWallets`,
    );
  }

  if (findings.length > 0) {
    throw new TemplateValidationError(label, findings);
  }

  return { policy, wallets, paths };
}

export function defaultVoteTypeForPath(pathType: GovernancePathType): VoteType {
  const map: Record<GovernancePathType, VoteType> = {
    BOARD: VoteType.COMMITTEE_APPROVAL,
    COMMITTEE: VoteType.COMMITTEE_APPROVAL,
    INDIVIDUAL_WITH_CAP: VoteType.INDIVIDUAL_WITH_CAP,
    PUBLIC_VOTE: VoteType.ONE_MEMBER_ONE_VOTE,
    DONATION_ONLY: VoteType.INDIVIDUAL_WITH_CAP,
    EMERGENCY_FAST: VoteType.EMERGENCY_THEN_REVIEW,
  };
  return map[pathType];
}

function normalizeEntityPolicy(
  value: Prisma.JsonValue | null | undefined,
  path: string,
  findings: string[],
): Prisma.EntityPolicyCreateWithoutEntityInput {
  if (value === null || value === undefined) return {};
  const record = requireRecord(value, path, findings);
  if (!record) return {};

  rejectUnknownKeys(record, entityPolicyKeys, path, findings);

  const policy: Prisma.EntityPolicyCreateWithoutEntityInput = {};
  copyBoolean(record, policy, 'allowOpenMembership', path, findings);
  copyBoolean(record, policy, 'requiresMemberApproval', path, findings);
  copyBoolean(record, policy, 'allowMultiplePaths', path, findings);
  copyBoolean(record, policy, 'allowSubEntities', path, findings);
  copyBoolean(record, policy, 'allowEntityRelations', path, findings);
  copyEnumArray(
    record,
    policy,
    'allowedGovernanceTypes',
    GovernancePathType,
    path,
    findings,
  );
  copyEnum(record, policy, 'defaultVoteType', VoteType, path, findings);
  copyInteger(record, policy, 'decisionQuorumPercent', path, findings, 1, 100);
  copyEnum(
    record,
    policy,
    'defaultTransparency',
    TransparencyLevel,
    path,
    findings,
  );
  copyBoolean(record, policy, 'allowAppeals', path, findings);
  copyInteger(record, policy, 'appealTimeoutDays', path, findings, 1);
  copyJson(record, policy, 'extraRules');

  return policy;
}

function normalizeWallets(
  value: Prisma.JsonValue | null | undefined,
  path: string,
  findings: string[],
): NormalizedTemplateWallet[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    findings.push(`${path} must be an array`);
    return [];
  }

  return value
    .map((item, index) => {
      const itemPath = `${path}[${index}]`;
      const record = requireRecord(item, itemPath, findings);
      if (!record) return null;

      rejectUnknownKeys(record, walletKeys, itemPath, findings);
      const policyRecord = optionalRecord(
        record.policy,
        `${itemPath}.policy`,
        findings,
      );
      if (policyRecord) {
        rejectUnknownKeys(
          policyRecord,
          walletPolicyKeys,
          `${itemPath}.policy`,
          findings,
        );
      }

      const name = readRequiredString(record, 'name', itemPath, findings);
      if (!name) return null;

      const policy: Prisma.WalletPolicyCreateWithoutWalletInput = {};
      if (policyRecord) {
        copyDecimal(
          policyRecord,
          policy,
          'subscriptionAmount',
          `${itemPath}.policy`,
          findings,
        );
        copyEnum(
          policyRecord,
          policy,
          'subscriptionFrequency',
          SubscriptionFrequency,
          `${itemPath}.policy`,
          findings,
        );
        copyInteger(
          policyRecord,
          policy,
          'gracePeriodDays',
          `${itemPath}.policy`,
          findings,
          0,
        );
        copyInteger(
          policyRecord,
          policy,
          'minimumActiveMonths',
          `${itemPath}.policy`,
          findings,
          0,
        );
        copyDecimal(
          policyRecord,
          policy,
          'maxBenefitPerYear',
          `${itemPath}.policy`,
          findings,
        );
        copyInteger(
          policyRecord,
          policy,
          'exitNoticeDays',
          `${itemPath}.policy`,
          findings,
          0,
        );
        copyEnum(
          policyRecord,
          policy,
          'exitRefundPolicy',
          ExitRefundPolicy,
          `${itemPath}.policy`,
          findings,
        );
        copyEnum(
          policyRecord,
          policy,
          'balanceTransparency',
          TransparencyLevel,
          `${itemPath}.policy`,
          findings,
        );
        copyEnum(
          policyRecord,
          policy,
          'transactionTransparency',
          TransparencyLevel,
          `${itemPath}.policy`,
          findings,
        );
        copyEnum(
          policyRecord,
          policy,
          'beneficiaryTransparency',
          TransparencyLevel,
          `${itemPath}.policy`,
          findings,
        );
        copyJson(policyRecord, policy, 'extraRules');
      }

      const wallet: NormalizedTemplateWallet = {
        name,
        policy,
      };
      const tempId = readOptionalString(record, 'id', itemPath, findings);
      const description = readOptionalString(
        record,
        'description',
        itemPath,
        findings,
      );
      const benefitType = readOptionalEnum(
        record,
        'benefitType',
        WalletBenefitType,
        itemPath,
        findings,
      );
      const currency = readOptionalString(
        record,
        'currency',
        itemPath,
        findings,
      );
      if (tempId !== undefined) wallet.tempId = tempId;
      if (description !== undefined) wallet.description = description;
      if (benefitType !== undefined) wallet.benefitType = benefitType;
      if (currency !== undefined) wallet.currency = currency;
      return wallet;
    })
    .filter((wallet): wallet is NormalizedTemplateWallet => wallet !== null);
}

function normalizePaths(
  value: Prisma.JsonValue | null | undefined,
  path: string,
  findings: string[],
): NormalizedTemplatePath[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    findings.push(`${path} must be an array`);
    return [];
  }

  return value
    .map((item, index) => {
      const itemPath = `${path}[${index}]`;
      const record = requireRecord(item, itemPath, findings);
      if (!record) return null;

      rejectUnknownKeys(record, pathKeys, itemPath, findings);
      const name = readRequiredString(record, 'name', itemPath, findings);
      const type = readRequiredEnum(
        record,
        'type',
        GovernancePathType,
        itemPath,
        findings,
      );
      if (!name || !type) return null;

      const policyRecord = optionalRecord(
        record.policy,
        `${itemPath}.policy`,
        findings,
      );
      if (policyRecord) {
        rejectUnknownKeys(
          policyRecord,
          pathPolicyKeys,
          `${itemPath}.policy`,
          findings,
        );
      }

      const policy: Prisma.PathPolicyCreateWithoutGovernancePathInput = {
        voteType: defaultVoteTypeForPath(type),
      };
      if (policyRecord) {
        copyEnum(
          policyRecord,
          policy,
          'voteType',
          VoteType,
          `${itemPath}.policy`,
          findings,
        );
        copyDecimal(
          policyRecord,
          policy,
          'individualSpendingCap',
          `${itemPath}.policy`,
          findings,
        );
        copyBoolean(
          policyRecord,
          policy,
          'requiresDocuments',
          `${itemPath}.policy`,
          findings,
        );
        copyInteger(
          policyRecord,
          policy,
          'quorumPercent',
          `${itemPath}.policy`,
          findings,
          1,
          100,
        );
        copyInteger(
          policyRecord,
          policy,
          'approvalPercent',
          `${itemPath}.policy`,
          findings,
          1,
          100,
        );
        copyInteger(
          policyRecord,
          policy,
          'votingDurationHours',
          `${itemPath}.policy`,
          findings,
          1,
        );
        copyBoolean(
          policyRecord,
          policy,
          'allowAppeals',
          `${itemPath}.policy`,
          findings,
        );
        copyInteger(
          policyRecord,
          policy,
          'appealWindowDays',
          `${itemPath}.policy`,
          findings,
          1,
        );
        copyBoolean(
          policyRecord,
          policy,
          'allowBalanceTransfer',
          `${itemPath}.policy`,
          findings,
        );
        copyJson(policyRecord, policy, 'extraRules');
      }

      const rules = readOptionalJson(record, 'rules');
      if (rules !== undefined) {
        policy.extraRules = mergePathExtraRules(policy.extraRules, rules);
      }

      const templatePath: NormalizedTemplatePath = {
        name,
        type,
        policy,
        spendingItems: normalizeSpendingItems(
          record.spendingItems,
          `${itemPath}.spendingItems`,
          findings,
        ),
      };
      const tempId = readOptionalString(record, 'id', itemPath, findings);
      const walletTempId = readOptionalString(
        record,
        'walletTempId',
        itemPath,
        findings,
      );
      const description = readOptionalString(
        record,
        'description',
        itemPath,
        findings,
      );
      const currency = readOptionalString(
        record,
        'currency',
        itemPath,
        findings,
      );
      if (tempId !== undefined) templatePath.tempId = tempId;
      if (walletTempId !== undefined) templatePath.walletTempId = walletTempId;
      if (description !== undefined) templatePath.description = description;
      if (currency !== undefined) templatePath.currency = currency;
      return templatePath;
    })
    .filter(
      (templatePath): templatePath is NormalizedTemplatePath =>
        templatePath !== null,
    );
}

function normalizeSpendingItems(
  value: unknown,
  path: string,
  findings: string[],
): NormalizedTemplateSpendingItem[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    findings.push(`${path} must be an array`);
    return [];
  }

  return value
    .map((item, index) => {
      const itemPath = `${path}[${index}]`;
      const record = requireRecord(item, itemPath, findings);
      if (!record) return null;

      rejectUnknownKeys(record, spendingItemKeys, itemPath, findings);
      const name = readRequiredString(record, 'name', itemPath, findings);
      if (!name) return null;

      const data: Prisma.SpendingItemCreateWithoutGovernancePathInput = {
        name,
        description: readOptionalString(
          record,
          'description',
          itemPath,
          findings,
        ),
        requiredDocuments:
          readStringArray(record, 'requiredDocuments', itemPath, findings) ??
          [],
      };
      copyJson(record, data, 'eligibilityCriteria');
      copyDecimal(record, data, 'maxAmountPerRequest', itemPath, findings);
      copyDecimal(record, data, 'maxAmountPerYear', itemPath, findings);
      copyEnum(
        record,
        data,
        'privacyLevel',
        TransparencyLevel,
        itemPath,
        findings,
      );
      copyBoolean(
        record,
        data,
        'requiresCommitteeApproval',
        itemPath,
        findings,
      );
      copyBoolean(record, data, 'allowsException', itemPath, findings);

      const templateItem: NormalizedTemplateSpendingItem = { data };
      const currency = readOptionalString(
        record,
        'currency',
        itemPath,
        findings,
      );
      if (currency !== undefined) templateItem.currency = currency;
      return templateItem;
    })
    .filter((item): item is NormalizedTemplateSpendingItem => item !== null);
}

function requireRecord(
  value: unknown,
  path: string,
  findings: string[],
): JsonRecord | null {
  if (isRecord(value)) return value;
  findings.push(`${path} must be an object`);
  return null;
}

function optionalRecord(
  value: unknown,
  path: string,
  findings: string[],
): JsonRecord | null {
  if (value === null || value === undefined) return null;
  return requireRecord(value, path, findings);
}

function rejectUnknownKeys(
  record: JsonRecord,
  allowedKeys: Set<string>,
  path: string,
  findings: string[],
) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      findings.push(`${path}.${key} is not a supported template field`);
    }
  }
}

function readRequiredString(
  record: JsonRecord,
  key: string,
  path: string,
  findings: string[],
) {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    findings.push(`${path}.${key} must be a non-empty string`);
    return null;
  }
  return value.trim();
}

function readOptionalString(
  record: JsonRecord,
  key: string,
  path: string,
  findings: string[],
) {
  const value = record[key];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') {
    findings.push(`${path}.${key} must be a string`);
    return undefined;
  }
  return value.trim();
}

function readRequiredEnum<T extends Record<string, string>>(
  record: JsonRecord,
  key: string,
  enumObject: T,
  path: string,
  findings: string[],
) {
  const value = record[key];
  if (isEnumValue(enumObject, value)) return value;
  findings.push(
    `${path}.${key} must be one of ${Object.values(enumObject).join(', ')}`,
  );
  return null;
}

function readOptionalEnum<T extends Record<string, string>>(
  record: JsonRecord,
  key: string,
  enumObject: T,
  path: string,
  findings: string[],
) {
  const value = record[key];
  if (value === null || value === undefined) return undefined;
  if (isEnumValue(enumObject, value)) return value;
  findings.push(
    `${path}.${key} must be one of ${Object.values(enumObject).join(', ')}`,
  );
  return undefined;
}

function readStringArray(
  record: JsonRecord,
  key: string,
  path: string,
  findings: string[],
) {
  const value = record[key];
  if (value === null || value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    findings.push(`${path}.${key} must be an array of strings`);
    return undefined;
  }
  return value;
}

function readOptionalJson(record: JsonRecord, key: string) {
  const value = record[key];
  if (value === null || value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

function copyBoolean(
  source: JsonRecord,
  target: object,
  key: string,
  path: string,
  findings: string[],
) {
  const value = source[key];
  if (value === null || value === undefined) return;
  if (typeof value !== 'boolean') {
    findings.push(`${path}.${key} must be boolean`);
    return;
  }
  (target as JsonRecord)[key] = value;
}

function copyInteger(
  source: JsonRecord,
  target: object,
  key: string,
  path: string,
  findings: string[],
  min?: number,
  max?: number,
) {
  const value = source[key];
  if (value === null || value === undefined) return;
  if (!Number.isInteger(value)) {
    findings.push(`${path}.${key} must be an integer`);
    return;
  }
  const numberValue = value as number;
  if (
    (min !== undefined && numberValue < min) ||
    (max !== undefined && numberValue > max)
  ) {
    findings.push(
      `${path}.${key} must be between ${min ?? '-inf'} and ${max ?? 'inf'}`,
    );
    return;
  }
  (target as JsonRecord)[key] = numberValue;
}

function copyDecimal(
  source: JsonRecord,
  target: object,
  key: string,
  path: string,
  findings: string[],
) {
  const value = source[key];
  if (value === null || value === undefined) return;
  if (typeof value !== 'number' && typeof value !== 'string') {
    findings.push(`${path}.${key} must be numeric`);
    return;
  }
  if (Number(value) < 0 || Number.isNaN(Number(value))) {
    findings.push(`${path}.${key} must be a non-negative number`);
    return;
  }
  (target as JsonRecord)[key] = value;
}

function copyEnum<TEnum extends Record<string, string>>(
  source: JsonRecord,
  target: object,
  key: string,
  enumObject: TEnum,
  path: string,
  findings: string[],
) {
  const value = source[key];
  if (value === null || value === undefined) return;
  if (!isEnumValue(enumObject, value)) {
    findings.push(
      `${path}.${key} must be one of ${Object.values(enumObject).join(', ')}`,
    );
    return;
  }
  (target as JsonRecord)[key] = value;
}

function copyEnumArray<TEnum extends Record<string, string>>(
  source: JsonRecord,
  target: object,
  key: string,
  enumObject: TEnum,
  path: string,
  findings: string[],
) {
  const value = source[key];
  if (value === null || value === undefined) return;
  if (
    !Array.isArray(value) ||
    value.some((item) => !isEnumValue(enumObject, item))
  ) {
    findings.push(
      `${path}.${key} must be an array of ${Object.values(enumObject).join(', ')}`,
    );
    return;
  }
  (target as JsonRecord)[key] = value;
}

function copyJson(source: JsonRecord, target: object, key: string) {
  const value = source[key];
  if (value === null || value === undefined) return;
  (target as JsonRecord)[key] = value;
}

function mergePathExtraRules(
  existing: Prisma.PathPolicyCreateWithoutGovernancePathInput['extraRules'],
  rules: Prisma.InputJsonValue,
) {
  const payload = { templateRules: rules } as Prisma.InputJsonObject;
  if (!existing) return payload;
  if (isRecord(existing)) {
    return { ...existing, templateRules: rules } as Prisma.InputJsonObject;
  }
  return {
    templateExtraRules: existing,
    templateRules: rules,
  } as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObject).includes(value);
}
