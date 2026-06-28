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
  printDbIdentity: boolean;
  expectedDbHost?: string;
  expectedDbName?: string;
  expectedDbPort?: number;
};

export type SeedConnectionSummary = {
  host: string;
  port: string;
  database: string;
  username: string;
  sslmode: string | null;
};

export type SeedDbIdentity = {
  currentDatabase: string;
  currentUser: string;
  serverAddress: string | null;
  serverPort: number | null;
  postmasterStartedAt: Date;
  serverVersion: string;
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

function parseBooleanFlag(input: string | boolean | undefined): boolean {
  if (input === true) {
    return true;
  }

  if (typeof input !== 'string') {
    return false;
  }

  return ['1', 'true', 'yes', 'y'].includes(input.toLowerCase());
}

function parseOptionalPositiveInt(
  input: string | boolean | undefined,
): number | undefined {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer "${input}".`);
  }

  return Math.floor(parsed);
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
  const expectedDbPort = parseOptionalPositiveInt(
    typeof cliArgs['expected-db-port'] === 'string'
      ? cliArgs['expected-db-port']
      : process.env.SEED_EXPECTED_DB_PORT,
  );

  return {
    connectionString,
    profile,
    profileConfig: seedProfiles[profile],
    referenceDate,
    printDbIdentity:
      parseBooleanFlag(cliArgs['print-db-identity']) ||
      parseBooleanFlag(process.env.SEED_PRINT_DB_IDENTITY),
    expectedDbHost:
      typeof cliArgs['expected-db-host'] === 'string'
        ? cliArgs['expected-db-host']
        : process.env.SEED_EXPECTED_DB_HOST,
    expectedDbName:
      typeof cliArgs['expected-db-name'] === 'string'
        ? cliArgs['expected-db-name']
        : process.env.SEED_EXPECTED_DB_NAME,
    expectedDbPort,
  };
}

export function createSeedDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { pool, prisma };
}

export function summarizeConnectionString(
  connectionString: string,
): SeedConnectionSummary {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\/+/, '') || '(none)';

  return {
    host: url.hostname,
    port: url.port || '5432',
    database,
    username: decodeURIComponent(url.username),
    sslmode: url.searchParams.get('sslmode'),
  };
}

export async function readSeedDbIdentity(pool: Pool): Promise<SeedDbIdentity> {
  const result = await pool.query<{
    current_database: string;
    current_user: string;
    server_address: string | null;
    server_port: number | null;
    postmaster_started_at: Date;
    server_version: string;
  }>(`
    SELECT
      current_database(),
      current_user,
      inet_server_addr()::text AS server_address,
      inet_server_port() AS server_port,
      pg_postmaster_start_time() AS postmaster_started_at,
      version() AS server_version
  `);
  const row = result.rows[0];

  return {
    currentDatabase: row.current_database,
    currentUser: row.current_user,
    serverAddress: row.server_address,
    serverPort: row.server_port,
    postmasterStartedAt: row.postmaster_started_at,
    serverVersion: row.server_version,
  };
}

export function compareExpectedDbIdentity(
  identity: SeedDbIdentity,
  options: Pick<
    SeedRuntimeOptions,
    'expectedDbHost' | 'expectedDbName' | 'expectedDbPort'
  >,
) {
  const mismatches: string[] = [];

  if (
    options.expectedDbName &&
    identity.currentDatabase !== options.expectedDbName
  ) {
    mismatches.push(
      `Expected database "${options.expectedDbName}" but connected to "${identity.currentDatabase}".`,
    );
  }

  if (
    options.expectedDbHost &&
    identity.serverAddress &&
    identity.serverAddress !== options.expectedDbHost
  ) {
    mismatches.push(
      `Expected database host "${options.expectedDbHost}" but server address is "${identity.serverAddress}".`,
    );
  }

  if (
    options.expectedDbPort &&
    identity.serverPort &&
    identity.serverPort !== options.expectedDbPort
  ) {
    mismatches.push(
      `Expected database port ${options.expectedDbPort} but server port is ${identity.serverPort}.`,
    );
  }

  return mismatches;
}

export const formatSeedDate = (date: Date) => date.toISOString();
