const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(__dirname, '../src/app/(main)', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const [search, replace] of replacements) {
    // If search is a RegExp, replace all occurrences
    if (search instanceof RegExp) {
        content = content.replace(search, replace);
    } else {
        // String replacement
        content = content.split(search).join(replace);
    }
  }
  fs.writeFileSync(fullPath, content);
}

// 1. Remove JSX comments with Arabic characters: {/* ... */}
function removeArabicCommentsFromDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      removeArabicCommentsFromDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Regex to match {/* ... */} containing Arabic letters
      // [\s\S]*? matches any character including newlines non-greedily
      const arabicRegex = /\{\/\*[\s\S]*?[\u0600-\u06FF][\s\S]*?\*\/\}/g;
      const initialLength = content.length;
      content = content.replace(arabicRegex, '');
      
      if (content.length !== initialLength) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

// Update remaining missing translation keys
const arAdmin = path.join(__dirname, '../src/locales/ar/admin.json');
const enAdmin = path.join(__dirname, '../src/locales/en/admin.json');
const arMember = path.join(__dirname, '../src/locales/ar/member.json');
const enMember = path.join(__dirname, '../src/locales/en/member.json');

const adminAr = JSON.parse(fs.readFileSync(arAdmin, 'utf8'));
const adminEn = JSON.parse(fs.readFileSync(enAdmin, 'utf8'));
adminAr.finance.timelineUnderReview = "قيد المراجعة";
adminEn.finance.timelineUnderReview = "[EN] قيد المراجعة";
adminAr.finance.timelineRejected = "مرفوض";
adminEn.finance.timelineRejected = "[EN] مرفوض";
fs.writeFileSync(arAdmin, JSON.stringify(adminAr, null, 2) + '\n');
fs.writeFileSync(enAdmin, JSON.stringify(adminEn, null, 2) + '\n');

const memberAr = JSON.parse(fs.readFileSync(arMember, 'utf8'));
const memberEn = JSON.parse(fs.readFileSync(enMember, 'utf8'));

if (!memberAr.portal) memberAr.portal = {};
if (!memberEn.portal) memberEn.portal = {};

memberAr.portal.days = "يوم";
memberEn.portal.days = "[EN] يوم";
memberAr.portal.pay = "ادفع";
memberEn.portal.pay = "[EN] ادفع";
memberAr.portal.overdue = "متأخرة ({days} يوماً) — {period}";
memberEn.portal.overdue = "[EN] متأخرة ({days} يوماً) — {period}";

fs.writeFileSync(arMember, JSON.stringify(memberAr, null, 2) + '\n');
fs.writeFileSync(enMember, JSON.stringify(memberEn, null, 2) + '\n');

// Perform precise replacements on the remaining files
replaceInFile('finance/page.tsx', [
  ['"قيد المراجعة"', 't("timelineUnderReview")'],
  ['"مرفوض"', 't("timelineRejected")']
]);

replaceInFile('paths/[id]/page.tsx', [
  ['"م"', 't("colNo")'],
  ['"تصويت"', 't("voteAction")']
]);

// Portal had a lot of backticks and complex interpolations that failed in the first script
replaceInFile('portal/page.tsx', [
  [/آخر دفعة مؤكَّدة · التالية في \$\{new Date\(dues\[dues\.length \- 1\]\?\.dueDate \?\? ""\)\.toLocaleDateString\("ar-SA"\)\}/g, 
    '${t("lastConfirmed", { date: new Date(dues[dues.length - 1]?.dueDate ?? "").toLocaleDateString("ar-SA") })}'],
  [/"لماذا ظهرت هذه المستحقات\؟\$\{pathName \? ` في \$\{pathName\}` : ''\}"/g,
    't("ruleTitle") + (pathName ? ` في ${pathName}` : \'\')'],
  [/متأخرة جداً \(\$\{days\} يوم\) — \$\{d\.periodLabel\}/g,
    '${t("veryOverdue", { days, period: d.periodLabel })}'],
  [/\$\{Number\(d\.amountDue\)\.toLocaleString\("ar-SA"\)\} ر\.س/g,
    '${t("amountSAR", { amount: Number(d.amountDue).toLocaleString("ar-SA") })}'],
  ['"ادفع فوراً"', 't("payNow")'],
  ['"يوم"', 't("days")'],
  ['"ادفع"', 't("pay")'],
  [/متأخرة \(\$\{days\} يوماً\) — \$\{d\.periodLabel\}/g,
    '${t("overdue", { days, period: d.periodLabel })}']
]);

const srcAppPath = path.join(__dirname, '../src/app');
removeArabicCommentsFromDirectory(srcAppPath);

console.log('Removed Arabic JSX comments and updated remaining strings.');
