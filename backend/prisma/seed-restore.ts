import { Pool, type PoolClient } from 'pg';
import { resolveSeedRuntimeOptions } from './seed-runtime';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function readArg(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function assertSafeTarget(connectionString: string) {
  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//, '') || 'postgres';
  const host = url.hostname.toLowerCase();

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to restore seed data while NODE_ENV=production.');
  }
  if (
    process.env.SEED_RESET_ALLOW_NON_LOCAL !== 'true' &&
    !LOCAL_HOSTS.has(host)
  ) {
    throw new Error(`Refusing to restore non-local database host "${host}".`);
  }
  if (
    process.env.SEED_RESET_ALLOW_NON_DEV_DB !== 'true' &&
    !/(^|[_-])(dev|test)([_-]|$)/i.test(database)
  ) {
    throw new Error(
      `Refusing to restore non-development database "${database}".`,
    );
  }
}

async function resolveBackupSchema(client: PoolClient) {
  const requested =
    readArg('backup-schema') ?? process.env.SEED_BACKUP_SCHEMA?.trim();
  if (requested) return requested;

  const { rows } = await client.query<{ schema_name: string }>(
    `
      SELECT nspname AS schema_name
      FROM pg_namespace
      WHERE nspname LIKE 'seed_backup_%'
      ORDER BY nspname DESC
      LIMIT 1
    `,
  );
  if (!rows[0]) {
    throw new Error('No seed backup schema was found to restore.');
  }
  return rows[0].schema_name;
}

async function matchingColumns(
  client: PoolClient,
  sourceSchema: string,
  targetSchema: string,
  tableName: string,
) {
  const { rows } = await client.query<{ column_name: string }>(
    `
      SELECT source.column_name
      FROM information_schema.columns source
      JOIN information_schema.columns target
        ON target.table_schema = $2
       AND target.table_name = source.table_name
       AND target.column_name = source.column_name
      WHERE source.table_schema = $1
        AND source.table_name = $3
      ORDER BY source.ordinal_position
    `,
    [sourceSchema, targetSchema, tableName],
  );
  return rows.map((row) => row.column_name);
}

async function main() {
  const runtime = resolveSeedRuntimeOptions();
  assertSafeTarget(runtime.connectionString);

  const targetSchema =
    new URL(runtime.connectionString).searchParams.get('schema') ?? 'public';
  const pool = new Pool({ connectionString: runtime.connectionString });
  const client = await pool.connect();

  try {
    const backupSchema = await resolveBackupSchema(client);
    const backupExists = await client.query(
      'SELECT 1 FROM pg_namespace WHERE nspname = $1',
      [backupSchema],
    );
    if (backupExists.rowCount === 0) {
      throw new Error(`Backup schema "${backupSchema}" does not exist.`);
    }

    const { rows } = await client.query<{ table_name: string }>(
      `
        SELECT backup.tablename AS table_name
        FROM pg_tables backup
        JOIN pg_tables target
          ON target.schemaname = $2
         AND target.tablename = backup.tablename
        WHERE backup.schemaname = $1
          AND backup.tablename <> '_seed_backup_metadata'
          AND backup.tablename <> '_prisma_migrations'
        ORDER BY backup.tablename
      `,
      [backupSchema, targetSchema],
    );
    if (rows.length === 0) {
      throw new Error(
        `Backup schema "${backupSchema}" contains no restorable tables.`,
      );
    }

    await client.query('BEGIN');
    await client.query('SET LOCAL session_replication_role = replica');

    const qualifiedTargets = rows.map(
      ({ table_name }) =>
        `${quoteIdentifier(targetSchema)}.${quoteIdentifier(table_name)}`,
    );
    await client.query(
      `TRUNCATE TABLE ${qualifiedTargets.join(', ')} RESTART IDENTITY CASCADE`,
    );

    for (const { table_name } of rows) {
      const columns = await matchingColumns(
        client,
        backupSchema,
        targetSchema,
        table_name,
      );
      if (columns.length === 0) continue;
      const columnList = columns.map(quoteIdentifier).join(', ');
      await client.query(
        `INSERT INTO ${quoteIdentifier(targetSchema)}.${quoteIdentifier(
          table_name,
        )} (${columnList})
         SELECT ${columnList}
         FROM ${quoteIdentifier(backupSchema)}.${quoteIdentifier(table_name)}`,
      );
    }

    await client.query('COMMIT');
    console.log(
      `Seed restore complete from ${backupSchema} (${rows.length} tables).`,
    );
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
