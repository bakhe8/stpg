const fs = require('fs');
const path = require('path');

function fixNamespaces(locale) {
  const adminPath = path.join(__dirname, '../src/locales', locale, 'admin.json');
  const memberPath = path.join(__dirname, '../src/locales', locale, 'member.json');
  
  let admin = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
  let member = JSON.parse(fs.readFileSync(memberPath, 'utf8'));

  // Fix decisions
  if (admin.decisions) {
    member.decisions = { ...member.decisions, ...admin.decisions };
    delete admin.decisions;
  }

  // Fix disputes
  if (admin.disputes) {
    member.disputes = { ...member.disputes, ...admin.disputes };
    delete admin.disputes;
  }

  // Rename analytics object to analyticsPage to avoid collision with common.json's "analytics" string
  if (admin.analytics) {
    admin.analyticsPage = admin.analytics;
    delete admin.analytics;
  }

  fs.writeFileSync(adminPath, JSON.stringify(admin, null, 2) + '\n');
  fs.writeFileSync(memberPath, JSON.stringify(member, null, 2) + '\n');
  console.log(`Fixed namespaces for ${locale}`);
}

fixNamespaces('ar');
fixNamespaces('en');
