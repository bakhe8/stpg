const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../backend/prisma/seed.ts');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const generatedFamilyDependents = compact\([\s\S]*?\n\);/m;

const newBlock = `const generatedFamilyDependents = compact(
  familyExtraKeys.map((personKey, index) => {
    // Generate dependents dynamically for family members
    // For realism, let's say 70% of family members have a dependent
    if (faker.number.float() > 0.7) return null;

    const relation = faker.helpers.arrayElement(['ابن', 'ابنة', 'زوجة', 'زوج', 'والدة', 'والد']);
    const name = generateArabicName('الهاشمي');
    const birthDate = faker.date.birthdate({ mode: 'age', min: 1, max: 80 });
    const notes = generateDependantNotes();
    const createdAtDaysAgo = faker.number.int({ min: 10, max: 250 });

    return {
      key: \`dependent_family_extra_\${index}\`,
      entityKey: 'family_core',
      personKey,
      name,
      relation,
      birthDate,
      notes,
      createdAt: daysAgo(createdAtDaysAgo),
    };
  })
);`;

content = content.replace(regex, newBlock);

fs.writeFileSync(filePath, content);
console.log('Refactored generatedFamilyDependents to use faker');
