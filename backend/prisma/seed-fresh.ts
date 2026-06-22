import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const scripts = [
  'prisma/seed-backup.ts',
  'prisma/seed-reset.ts',
  'prisma/seed.ts',
  'prisma/seed-validate.ts',
];
const forwardedArgs = process.argv.slice(2);
const tsNodeBin = resolve(
  process.cwd(),
  'node_modules',
  'ts-node',
  'dist',
  'bin.js',
);

for (const script of scripts) {
  const result = spawnSync(
    process.execPath,
    [tsNodeBin, '--transpile-only', script, ...forwardedArgs],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    if (script !== 'prisma/seed-backup.ts') {
      console.error(
        `Seed step "${script}" failed. Restoring the latest pre-seed backup...`,
      );
      spawnSync(
        process.execPath,
        [
          tsNodeBin,
          '--transpile-only',
          'prisma/seed-restore.ts',
          ...forwardedArgs,
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: 'inherit',
        },
      );
    }
    process.exit(result.status ?? 1);
  }
}
