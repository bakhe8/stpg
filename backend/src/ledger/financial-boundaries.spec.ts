import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const SRC_ROOT = join(__dirname, '..');
const ALLOWED_LEDGER_WRITER = join(SRC_ROOT, 'ledger', 'ledger.service.ts');

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (
        entry === 'generated' ||
        entry === 'dist' ||
        entry === 'node_modules'
      ) {
        continue;
      }
      files.push(...collectTsFiles(fullPath));
      continue;
    }

    if (
      entry.endsWith('.ts') &&
      !entry.endsWith('.spec.ts') &&
      fullPath !== ALLOWED_LEDGER_WRITER
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('financial write boundaries', () => {
  it('keeps ledger balance mutations inside LedgerService', () => {
    const offenders: string[] = [];
    const mutationPattern =
      /\bledgerAccount\s*\.\s*(update|updateMany|upsert|delete|deleteMany)\s*\(/;
    const balanceMutationPattern =
      /balance\s*:\s*(\{[^}]*\b(increment|decrement|set)\b|[^,}\n]+)/;

    for (const file of collectTsFiles(SRC_ROOT)) {
      const source = readFileSync(file, 'utf8');
      if (mutationPattern.test(source) && balanceMutationPattern.test(source)) {
        offenders.push(relative(SRC_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps ledger transaction creation inside LedgerService', () => {
    const offenders: string[] = [];
    const createTransactionPattern = /\bledgerTransaction\s*\.\s*create\s*\(/;

    for (const file of collectTsFiles(SRC_ROOT)) {
      const source = readFileSync(file, 'utf8');
      if (createTransactionPattern.test(source)) {
        offenders.push(relative(SRC_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not reintroduce the retired public transfers module', () => {
    const transferFiles = collectTsFiles(SRC_ROOT).filter(
      (file) => relative(SRC_ROOT, file).split(/[\\/]/)[0] === 'transfers',
    );

    expect(transferFiles.map((file) => basename(file))).toEqual([]);
  });
});
