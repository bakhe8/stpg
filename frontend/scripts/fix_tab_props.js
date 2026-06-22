const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/(main)/entities/[id]/review/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Function ActionNoteModal({ t, ... }: { ...; t: any })
// My earlier script `translate_review.js` had this logic:
// ['requireNote: boolean;', 'requireNote: boolean;\n  t: any;'],
// Let's manually do it for the remaining ones.

const replacements = [
  // SubscriptionsTab
  ['subscriptions: Subscription[];\n  onRefresh: () => void;\n}', 'subscriptions: Subscription[];\n  onRefresh: () => void;\n  t: any;\n}'],
  // RecordsTab
  ['records: FinanceRecord[];\n  onRefresh: () => void;\n}', 'records: FinanceRecord[];\n  onRefresh: () => void;\n  t: any;\n}'],
  // DisbursementsTab
  ['requests: DisbursementRequest[];\n  onRefresh: () => void;\n}', 'requests: DisbursementRequest[];\n  onRefresh: () => void;\n  t: any;\n}'],
  // DisputesTab
  ['disputes: Dispute[];\n  onRefresh: () => void;\n}', 'disputes: Dispute[];\n  onRefresh: () => void;\n  t: any;\n}']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(filePath, content);
console.log('Fixed tab props');
