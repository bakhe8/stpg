const fs = require('fs');
const path = require('path');

function updateLocales() {
  const arPath = path.join(__dirname, '../src/locales/ar/member.json');
  const enPath = path.join(__dirname, '../src/locales/en/member.json');
  const arAdmin = path.join(__dirname, '../src/locales/ar/admin.json');
  const enAdmin = path.join(__dirname, '../src/locales/en/admin.json');

  const memberAr = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  const memberEn = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const adminAr = JSON.parse(fs.readFileSync(arAdmin, 'utf8'));
  const adminEn = JSON.parse(fs.readFileSync(enAdmin, 'utf8'));

  // admin.json for finance
  if (!adminAr.finance) adminAr.finance = {};
  if (!adminEn.finance) adminEn.finance = {};
  adminAr.finance.timelineSubmitted = "رُفع الإيصال";
  adminEn.finance.timelineSubmitted = "[EN] رُفع الإيصال";
  adminAr.finance.timelineReviewed = "تمت المراجعة";
  adminEn.finance.timelineReviewed = "[EN] تمت المراجعة";
  adminAr.finance.timelineConfirmed = "مؤكَّد";
  adminEn.finance.timelineConfirmed = "[EN] مؤكَّد";

  // member.json for paths
  if (!memberAr.paths) memberAr.paths = {};
  if (!memberEn.paths) memberEn.paths = {};
  memberAr.paths.backToWallet = "← العودة للمحفظة";
  memberEn.paths.backToWallet = "[EN] ← العودة للمحفظة";
  memberAr.paths.tabDisbursements = "بنود الصرف ({count})";
  memberEn.paths.tabDisbursements = "[EN] بنود الصرف ({count})";
  memberAr.paths.tabSubscriptions = "الاشتراكات ({count})";
  memberEn.paths.tabSubscriptions = "[EN] الاشتراكات ({count})";
  memberAr.paths.tabDecisions = "القرارات ({count})";
  memberEn.paths.tabDecisions = "[EN] القرارات ({count})";
  memberAr.paths.colNo = "م";
  memberEn.paths.colNo = "[EN] م";
  memberAr.paths.voteAction = "تصويت";
  memberEn.paths.voteAction = "[EN] تصويت";

  // member.json for portal
  if (!memberAr.portal) memberAr.portal = {};
  if (!memberEn.portal) memberEn.portal = {};
  memberAr.portal.regularStatus = "أنت منتظم في هذا المسار";
  memberEn.portal.regularStatus = "[EN] أنت منتظم في هذا المسار";
  memberAr.portal.lastConfirmed = "آخر دفعة مؤكَّدة · التالية في {date}";
  memberEn.portal.lastConfirmed = "[EN] آخر دفعة مؤكَّدة · التالية في {date}";
  memberAr.portal.ruleTitle = "لماذا ظهرت هذه المستحقات؟";
  memberEn.portal.ruleTitle = "[EN] لماذا ظهرت هذه المستحقات؟";
  memberAr.portal.ruleDesc = "هذه المبالغ صدرت بناءً على شروط اشتراكك في هذا المسار. سداد كل فترة في موعدها يحافظ على حقوقك في الاستفادة من المحفظة.";
  memberEn.portal.ruleDesc = "[EN] هذه المبالغ صدرت بناءً على شروط اشتراكك في هذا المسار. سداد كل فترة في موعدها يحافظ على حقوقك في الاستفادة من المحفظة.";
  memberAr.portal.veryOverdue = "متأخرة جداً ({days} يوم) — {period}";
  memberEn.portal.veryOverdue = "[EN] متأخرة جداً ({days} يوم) — {period}";
  memberAr.portal.suspensionWarning = "قد يُوقَف اشتراكك إذا لم تُسوَّ هذه الدفعة";
  memberEn.portal.suspensionWarning = "[EN] قد يُوقَف اشتراكك إذا لم تُسوَّ هذه الدفعة";
  memberAr.portal.amountSAR = "{amount} ر.س";
  memberEn.portal.amountSAR = "[EN] {amount} ر.س";
  memberAr.portal.payNow = "ادفع فوراً";
  memberEn.portal.payNow = "[EN] ادفع فوراً";

  fs.writeFileSync(arPath, JSON.stringify(memberAr, null, 2) + '\n');
  fs.writeFileSync(enPath, JSON.stringify(memberEn, null, 2) + '\n');
  fs.writeFileSync(arAdmin, JSON.stringify(adminAr, null, 2) + '\n');
  fs.writeFileSync(enAdmin, JSON.stringify(adminEn, null, 2) + '\n');
}

updateLocales();

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(__dirname, '../src/app/(main)', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');

  // Ensure useTranslations import
  if (!content.includes('useTranslations')) {
    content = content.replace("import React", "import React\nimport { useTranslations } from 'next-intl';");
  }

  // Ensure hooks
  if (filePath === 'finance/page.tsx' && !content.includes('useTranslations("finance")')) {
    content = content.replace('export default function FinanceDashboard() {', 'export default function FinanceDashboard() {\n  const t = useTranslations("finance");');
  }
  if (filePath === 'paths/[id]/page.tsx' && !content.includes('useTranslations("paths")')) {
    content = content.replace('export default function GovernancePathPage() {', 'export default function GovernancePathPage() {\n  const t = useTranslations("paths");');
  }
  if (filePath === 'portal/page.tsx' && !content.includes('useTranslations("portal")')) {
    content = content.replace('export default function MemberPortal() {', 'export default function MemberPortal() {\n  const t = useTranslations("portal");');
  }

  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(fullPath, content);
}

replaceInFile('finance/page.tsx', [
  ['"رُفع الإيصال"', 't("timelineSubmitted")'],
  ['"تمت المراجعة"', 't("timelineReviewed")'],
  ['"مؤكَّد"', 't("timelineConfirmed")']
]);

replaceInFile('paths/[id]/page.tsx', [
  ['← العودة للمحفظة', '{t("backToWallet")}'],
  ['بنود الصرف (${items.length})', '{t("tabDisbursements", { count: items.length })}'],
  ['الاشتراكات (${subscriptions.length})', '{t("tabSubscriptions", { count: subscriptions.length })}'],
  ['القرارات (${decisions.length})', '{t("tabDecisions", { count: decisions.length })}'],
  ['>م<', '>{t("colNo")}<'],
  ['>تصويت<', '>{t("voteAction")}<']
]);

replaceInFile('portal/page.tsx', [
  ['"أنت منتظم في هذا المسار"', 't("regularStatus")'],
  ['آخر دفعة مؤكَّدة · التالية في ${new Date(dues[dues.length - 1]?.dueDate ?? "").toLocaleDateString("ar-SA")}', '${t("lastConfirmed", { date: new Date(dues[dues.length - 1]?.dueDate ?? "").toLocaleDateString("ar-SA") })}'],
  ['"لماذا ظهرت هذه المستحقات؟${pathName ? ` في ${pathName}` : \'\'}"', 't("ruleTitle") + (pathName ? ` في ${pathName}` : \'\')'],
  ['"هذه المبالغ صدرت بناءً على شروط اشتراكك في هذا المسار. سداد كل فترة في موعدها يحافظ على حقوقك في الاستفادة من المحفظة."', 't("ruleDesc")'],
  ['متأخرة جداً (${days} يوم) — ${d.periodLabel}', '${t("veryOverdue", { days, period: d.periodLabel })}'],
  ['"قد يُوقَف اشتراكك إذا لم تُسوَّ هذه الدفعة"', 't("suspensionWarning")'],
  ['${Number(d.amountDue).toLocaleString("ar-SA")} ر.س', '${t("amountSAR", { amount: Number(d.amountDue).toLocaleString("ar-SA") })}'],
  ['"ادفع فوراً"', 't("payNow")']
]);

console.log('Finished translation logic');
