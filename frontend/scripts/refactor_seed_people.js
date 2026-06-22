const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../backend/prisma/seed.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('./faker-utils')) {
  content = content.replace(
    "import { seedOperationalHistory } from './seed-operational-history';",
    "import { generateArabicName, generateSaudiPhone, generateDependantNotes, faker } from './faker-utils';\nimport { seedOperationalHistory } from './seed-operational-history';"
  );
}

// 2. Replace buildGeneratedPeople
const buildGeneratedPeopleRegex = /const buildGeneratedPeople = \(\{[\s\S]*?\}\) =>\s*Array\.from\(\{ length: count \}, \(_, index\) => \{[\s\S]*?\}\);/;

const newBuildGeneratedPeople = `const buildGeneratedPeople = ({
  prefix,
  usernamePrefix,
  label, // not used directly anymore but kept for compatibility
  familyName,
  count,
  phoneBase,
  startDaysAgo,
  verified = true,
}: GeneratedPeopleGroupConfig) => {
  return Array.from({ length: count }, (_, index) => {
    const order = index + 1;
    const code = String(order).padStart(2, '0');
    
    // Use Faker
    const name = generateArabicName(familyName);

    return {
      key: \`\${prefix}_\${code}\`,
      username: \`seed.\${usernamePrefix}.\${code}\`,
      name,
      phoneNumber: generateSaudiPhone(phoneBase, order),
      avatarUrl: \`https://seed.collectivetrust.local/avatars/\${prefix}-\${code}.png\`,
      isVerified: verified,
      createdAt: daysAgo(startDaysAgo - index),
    };
  });
};`;

content = content.replace(buildGeneratedPeopleRegex, newBuildGeneratedPeople);

fs.writeFileSync(filePath, content);
console.log('Refactored buildGeneratedPeople in seed.ts');
