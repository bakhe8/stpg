const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/(main)/entities/[id]/review/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // SubscriptionsTab
  ['t: any;\n  subscriptions: Subscription[];\n  onRefresh: () => void;\n  t: any;\n}', 'subscriptions: Subscription[];\n  onRefresh: () => void;\n  t: any;\n}'],
  // RecordsTab
  ['t: any;\n  records: FinanceRecord[];\n  onRefresh: () => void;\n  t: any;\n}', 'records: FinanceRecord[];\n  onRefresh: () => void;\n  t: any;\n}'],
  // DisbursementsTab
  ['t: any;\n  requests: DisbursementRequest[];\n  onRefresh: () => void;\n  t: any;\n}', 'requests: DisbursementRequest[];\n  onRefresh: () => void;\n  t: any;\n}'],
  // DisputesTab
  ['t: any;\n  disputes: Dispute[];\n  onRefresh: () => void;\n  t: any;\n}', 'disputes: Dispute[];\n  onRefresh: () => void;\n  t: any;\n}']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync(filePath, content);
console.log('Fixed duplicate t completely');
