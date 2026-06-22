const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/(main)/entities/[id]/review/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/t: any;\n\s+t: any;/g, 't: any;');

fs.writeFileSync(filePath, content);
console.log('Fixed duplicate t');
