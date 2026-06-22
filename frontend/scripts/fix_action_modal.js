const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/(main)/entities/[id]/review/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to find <ActionNoteModal ... /> and add t={t} if missing
content = content.replace(/<ActionNoteModal([\s\S]*?)\/?>/g, (match, p1) => {
  if (!p1.includes('t={t}')) {
    return `<ActionNoteModal t={t}${p1}/>`;
  }
  return match;
});

fs.writeFileSync(filePath, content);
console.log('Fixed ActionNoteModal props');
