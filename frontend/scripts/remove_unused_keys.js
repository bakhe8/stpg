const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales/ar');
const srcDir = path.join(__dirname, '../src');

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

const unusedKeys = [];
for (const { namespaceKey, rawKey } of allKeys) {
  let isUsed = false;
  for (const file of sourceContents) {
    if (file.content.includes(`"${rawKey}"`) || 
        file.content.includes(`'${rawKey}'`) || 
        file.content.includes(`\`${rawKey}\``) ||
        file.content.includes(namespaceKey)) {
      isUsed = true;
      break;
    }
  }
  if (!isUsed) {
    unusedKeys.push({ namespaceKey, rawKey });
  }
}

console.log(`Found ${unusedKeys.length} unused keys. Removing them...`);

function deleteKeyPath(obj, keyPath) {
  const parts = keyPath.split('.');
  // The first part is the namespace (filename), so we skip it
  parts.shift();
  
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) return false;
    current = current[parts[i]];
  }
  
  const lastPart = parts[parts.length - 1];
  if (current && current.hasOwnProperty(lastPart)) {
    delete current[lastPart];
    return true;
  }
  return false;
}

// Map files to their json objects
const fileObjects = {};
fs.readdirSync(localesDir).forEach(file => {
  if (file.endsWith('.json')) {
    const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
    fileObjects[file] = content;
  }
});

let removedCount = 0;
for (const { namespaceKey } of unusedKeys) {
  const ns = namespaceKey.split('.')[0];
  const file = `${ns}.json`;
  if (fileObjects[file]) {
    if (deleteKeyPath(fileObjects[file], namespaceKey)) {
      removedCount++;
    }
  }
}

// Write back to files
for (const [file, content] of Object.entries(fileObjects)) {
  fs.writeFileSync(path.join(localesDir, file), JSON.stringify(content, null, 2) + '\n');
}

console.log(`Successfully removed ${removedCount} unused keys.`);
