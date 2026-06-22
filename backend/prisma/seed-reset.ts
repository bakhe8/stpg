import { Pool } from 'pg';
import { formatSeedDate, resolveSeedRuntimeOptions } from './seed-runtime';

type DatabaseTarget = {
  database: string;
  host: string;
  schema: string;
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function resolveDatabaseTarget(connectionString: string): DatabaseTarget {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//, '') || 'postgres';
  const schema = url.searchParams.get('schema') ?? 'public';

  return {
    database,
    host: url.hostname.toLowerCase(),
    schema,
  };
}

function isDevLikeDatabase(database: string) {
  return /(^|[_-])(dev|test)([_-]|$)/i.test(database);
}

function assertSafeResetTarget(target: DatabaseTarget) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset database while NODE_ENV=production.');
  }

  const allowNonLocal = process.env.SEED_RESET_ALLOW_NON_LOCAL === 'true';
  if (!allowNonLocal && !LOCAL_HOSTS.has(target.host)) {
    throw new Error(
      `Refusing to reset non-local database host "${target.host}". Set SEED_RESET_ALLOW_NON_LOCAL=true only if you are absolutely sure.`,
    );
  }

  const allowNonDevDb = process.env.SEED_RESET_ALLOW_NON_DEV_DB === 'true';
  if (!allowNonDevDb && !isDevLikeDatabase(target.database)) {
    throw new Error(
      `Refusing to reset database "${target.database}" because it does not look like a dev/test database. Set SEED_RESET_ALLOW_NON_DEV_DB=true only if you are absolutely sure.`,
    );
  }
}

async function main() {
  const seedRuntime = resolveSeedRuntimeOptions();
  const target = resolveDatabaseTarget(seedRuntime.connectionString);

  assertSafeResetTarget(target);

  console.log(
    `Resetting seed data for database "${target.database}" on host "${target.host}" (schema=${target.schema}, profile=${seedRuntime.profile}, referenceDate=${formatSeedDate(seedRuntime.referenceDate)})...`,
  );

  const pool = new Pool({ connectionString: seedRuntime.connectionString });

  try {
    const { rows } = await pool.query<{ tablename: string }>(
      `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = $1
          AND tablename <> '_prisma_migrations'
        ORDER BY tablename
      `,
      [target.schema],
    );

    const tableNames = rows.map((row) => row.tablename);

    if (tableNames.length === 0) {
      console.log('No application tables found to truncate.');
      return;
    }

    const qualifiedTables = tableNames.map(
      (tableName) =>
        `"${target.schema.replace(/"/g, '""')}"."${tableName.replace(/"/g, '""')}"`,
    );

    await pool.query(
      `TRUNCATE TABLE ${qualifiedTables.join(', ')} RESTART IDENTITY CASCADE`,
    );

    console.log(`Seed reset complete. Truncated ${tableNames.length} tables.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
