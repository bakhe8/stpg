const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales/ar');
const srcDir = path.join(__dirname, '../src');

// 1. Extract all translation keys
function flattenObject(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) {
      keys = keys.concat(flattenObject(v, newKey));
    } else {
      keys.push({ namespaceKey: newKey, rawKey: k });
    }
  }
  return keys;
}

let allKeys = [];
fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
    const ns = path.basename(file, '.json');
    const flattened = flattenObject(content, ns);
    allKeys = allKeys.concat(flattened);
  }
});

// 2. Read all TS/TSX files
function getAllFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const sourceFiles = getAllFiles(srcDir);
const sourceContents = sourceFiles.map(f => ({ path: f, content: fs.readFileSync(f, 'utf8') }));

// 3. Find unused keys
const unusedKeys = [];
const usedRawKeys = new Set();

for (const { namespaceKey, rawKey } of allKeys) {
  let isUsed = false;
  for (const file of sourceContents) {
    // Check if the raw key is used anywhere (like t('key'))
    // Or if namespaceKey is used
    if (file.content.includes(`"${rawKey}"`) || 
        file.content.includes(`'${rawKey}'`) || 
        file.content.includes(`\`${rawKey}\``) ||
        file.content.includes(namespaceKey)) {
      isUsed = true;
      break;
    }
  }
  if (!isUsed) {
    unusedKeys.push(namespaceKey);
  } else {
    usedRawKeys.add(rawKey);
  }
}

// 4. Find hardcoded Arabic text
const arabicRegex = /[\u0600-\u06FF]/;
const hardcodedTexts = [];

for (const file of sourceContents) {
  const content = file.content;
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Ignore console.log and comments
    if (line.trim().startsWith('//') || line.includes('console.log') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      return;
    }
    
    if (arabicRegex.test(line)) {
      // Extract what might be text
      // Usually between > < or inside quotes
      const matchTag = line.match(/>([^<]*[\u0600-\u06FF]+[^<]*)<\/?/);
      const matchQuote = line.match(/['"`]([^'"`]*[\u0600-\u06FF]+[^'"`]*)['"`]/);
      
      let text = '';
      if (matchTag && matchTag[1].trim()) text = matchTag[1].trim();
      else if (matchQuote && matchQuote[1].trim()) text = matchQuote[1].trim();
      else text = line.trim();
      
      hardcodedTexts.push({
        file: file.path.replace(srcDir, ''),
        line: index + 1,
        text: text
      });
    }
  });
}

const report = {
  unusedKeysCount: unusedKeys.length,
  unusedKeysSample: unusedKeys.slice(0, 50),
  hardcodedCount: hardcodedTexts.length,
  hardcodedSample: hardcodedTexts.slice(0, 50)
};

fs.writeFileSync(path.join(__dirname, 'translation_report.json'), JSON.stringify(report, null, 2));
console.log('Report generated at scripts/translation_report.json');
