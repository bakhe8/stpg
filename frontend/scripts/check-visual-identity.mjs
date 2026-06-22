import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['src/app', 'src/components'];
const extensions = new Set(['.css', '.tsx', '.ts']);
const forbidden = [
  { label: 'legacy blue', pattern: /#(?:3b82f6|2563eb|1d4ed8|4f46e5|eff6ff|dbeafe|93c5fd)\b/gi },
  { label: 'legacy indigo RGB', pattern: /rgba?\(\s*79\s*,\s*70\s*,\s*229\b/gi },
  { label: 'legacy blue RGB', pattern: /rgba?\(\s*59\s*,\s*130\s*,\s*246\b/gi },
  { label: 'legacy neutral palette', pattern: /#(?:0f172a|1e293b|334155|475569|64748b|94a3b8|cbd5e1|e2e8f0|f1f5f9|f8fafc|111827|374151|6b7280|9ca3af|d1d5db|e5e7eb|f3f4f6|f9fafb)\b/gi },
  { label: 'dark color scheme', pattern: /(?:prefers-color-scheme\s*:\s*dark|color-scheme\s*:\s*dark)/gi },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(target);
    return extensions.has(path.extname(entry.name)) ? [target] : [];
  }));
  return files.flat();
}

const files = (await Promise.all(roots.map(collectFiles))).flat();
const violations = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const rule of forbidden) {
    rule.pattern.lastIndex = 0;
    for (const match of source.matchAll(rule.pattern)) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${path.relative(process.cwd(), file)}:${line} ${rule.label}: ${match[0]}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Visual identity check failed:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(`Visual identity check passed across ${files.length} source files.`);
