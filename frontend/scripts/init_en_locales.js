const fs = require('fs');
const path = require('path');

const arDir = path.join(__dirname, '../src/locales/ar');
const enDir = path.join(__dirname, '../src/locales/en');

if (!fs.existsSync(enDir)) {
  fs.mkdirSync(enDir, { recursive: true });
}

function processObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key] = processObject(value);
    } else if (typeof value === 'string') {
      // Create a stub translation by prefixing with [EN]
      // We keep the Arabic text so translators know what to translate
      result[key] = `[EN] ${value}`;
    } else {
      result[key] = value;
    }
  }
  return result;
}

const files = fs.readdirSync(arDir);
let count = 0;

for (const file of files) {
  if (file.endsWith('.json')) {
    const arPath = path.join(arDir, file);
    const enPath = path.join(enDir, file);
    
    const arContent = JSON.parse(fs.readFileSync(arPath, 'utf8'));
    const enContent = processObject(arContent);
    
    fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2) + '\n');
    count++;
    console.log(`Created ${file}`);
  }
}

console.log(`Successfully initialized ${count} English locale files.`);
