import { Pool } from 'pg';
import { resolveSeedRuntimeOptions } from './seed-runtime';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function assertSafeTarget(connectionString: string) {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//, '') || 'postgres';
  const host = url.hostname.toLowerCase();

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to back up seed data while NODE_ENV=production.');
  }
  if (
    process.env.SEED_RESET_ALLOW_NON_LOCAL !== 'true' &&
    !LOCAL_HOSTS.has(host)
  ) {
    throw new Error(`Refusing to back up non-local database host "${host}".`);
  }
  if (
    process.env.SEED_RESET_ALLOW_NON_DEV_DB !== 'true' &&
    !/(^|[_-])(dev|test)([_-]|$)/i.test(database)
  ) {
    throw new Error(
      `Refusing to back up non-development database "${database}".`,
    );
  }
}

function backupSchemaName() {
  return `seed_backup_${new Date()
    .toISOString()
    .replace(/\D/g, '')
    .slice(0, 14)}`;
}

async function main() {
  const runtime = resolveSeedRuntimeOptions();
  assertSafeTarget(runtime.connectionString);

  const sourceSchema =
    new URL(runtime.connectionString).searchParams.get('schema') ?? 'public';
  const backupSchema = backupSchemaName();
  const pool = new Pool({ connectionString: runtime.connectionString });
  const client = await pool.connect();

  try {
    const { rows } = await client.query<{ tablename: string }>(
      `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = $1
          AND tablename <> '_prisma_migrations'
        ORDER BY tablename
      `,
      [sourceSchema],
    );

    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await client.query(`CREATE SCHEMA ${quoteIdentifier(backupSchema)}`);

    for (const { tablename } of rows) {
      await client.query(
        `CREATE TABLE ${quoteIdentifier(backupSchema)}.${quoteIdentifier(
          tablename,
        )} AS TABLE ${quoteIdentifier(sourceSchema)}.${quoteIdentifier(
          tablename,
        )}`,
      );
    }

    await client.query(
      `CREATE TABLE ${quoteIdentifier(backupSchema)}._seed_backup_metadata (
        created_at timestamptz NOT NULL,
        source_schema text NOT NULL,
        table_count integer NOT NULL
      )`,
    );
    await client.query(
      `INSERT INTO ${quoteIdentifier(
        backupSchema,
      )}._seed_backup_metadata VALUES (now(), $1, $2)`,
      [sourceSchema, rows.length],
    );
    await client.query('COMMIT');

    console.log(
      `Seed backup complete: ${backupSchema} (${rows.length} tables).`,
    );
    console.log(`SEED_BACKUP_SCHEMA=${backupSchema}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
