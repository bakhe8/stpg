import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

export type SeedProfile = 'small' | 'medium' | 'large' | 'stress';

export type SeedProfileConfig = {
  familyExtraCount: number;
  buildingExtraCount: number;
  neighborhoodExtraCount: number;
  campaignExtraCount: number;
  youthExtraCount: number;
};

export const seedProfiles: Record<SeedProfile, SeedProfileConfig> = {
  small: {
    familyExtraCount: 6,
    buildingExtraCount: 5,
    neighborhoodExtraCount: 6,
    campaignExtraCount: 4,
    youthExtraCount: 4,
  },
  medium: {
    familyExtraCount: 14,
    buildingExtraCount: 11,
    neighborhoodExtraCount: 12,
    campaignExtraCount: 10,
    youthExtraCount: 8,
  },
  large: {
    familyExtraCount: 24,
    buildingExtraCount: 18,
    neighborhoodExtraCount: 20,
    campaignExtraCount: 16,
    youthExtraCount: 12,
  },
  stress: {
    familyExtraCount: 40,
    buildingExtraCount: 28,
    neighborhoodExtraCount: 32,
    campaignExtraCount: 24,
    youthExtraCount: 18,
  },
};

type CliArgs = Record<string, string | boolean>;

export type SeedRuntimeOptions = {
  connectionString: string;
  profile: SeedProfile;
  profileConfig: SeedProfileConfig;
  referenceDate: Date;
};

const DEFAULT_CONNECTION_STRING =
  'postgresql://postgres:postgres@localhost:5432/stgp_dev?schema=public';

function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current?.startsWith('--')) {
      continue;
    }

    const withoutPrefix = current.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split('=', 2);
    const nextValue = argv[index + 1];

    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
      continue;
    }

    if (nextValue && !nextValue.startsWith('--')) {
      args[rawKey] = nextValue;
      index += 1;
      continue;
    }

    args[rawKey] = true;
  }

  return args;
}

function normalizeProfile(input?: string): SeedProfile {
  if (!input) {
    return 'medium';
  }

  if (input in seedProfiles) {
    return input as SeedProfile;
  }

  throw new Error(
    `Unsupported seed profile "${input}". Use one of: ${Object.keys(
      seedProfiles,
    ).join(', ')}`,
  );
}

function parseReferenceDate(input?: string): Date {
  if (!input) {
    return new Date();
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Invalid reference date "${input}". Use an ISO date like 2026-06-21 or 2026-06-21T00:00:00.000Z.`,
    );
  }

  return parsed;
}

export function resolveSeedRuntimeOptions(
  argv: string[] = process.argv.slice(2),
): SeedRuntimeOptions {
  const cliArgs = parseCliArgs(argv);
  const profile = normalizeProfile(
    typeof cliArgs.profile === 'string'
      ? cliArgs.profile
      : process.env.SEED_PROFILE,
  );
  const referenceDate = parseReferenceDate(
    typeof cliArgs['reference-date'] === 'string'
      ? cliArgs['reference-date']
      : process.env.SEED_REFERENCE_DATE,
  );
  const connectionString =
    (typeof cliArgs['database-url'] === 'string'
      ? cliArgs['database-url']
      : process.env.DATABASE_URL) ?? DEFAULT_CONNECTION_STRING;

  return {
    connectionString,
    profile,
    profileConfig: seedProfiles[profile],
    referenceDate,
  };
}

export function createSeedDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { pool, prisma };
}

export const formatSeedDate = (date: Date) => date.toISOString();
