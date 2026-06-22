const fs = require('fs');
const path = require('path');

function replaceAllInFile(filePath, replacements) {
  const fullPath = path.join(__dirname, '../src/app/(main)', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const [search, replace] of replacements) {
    if (search instanceof RegExp) {
        content = content.replace(search, replace);
    } else {
        content = content.split(search).join(replace);
    }
  }
  fs.writeFileSync(fullPath, content);
}

const arMember = path.join(__dirname, '../src/locales/ar/member.json');
const enMember = path.join(__dirname, '../src/locales/en/member.json');
let memberAr = JSON.parse(fs.readFileSync(arMember, 'utf8'));
let memberEn = JSON.parse(fs.readFileSync(enMember, 'utf8'));

Object.assign(memberAr.portal, {
  payNowAlt: "ادفع الآن",
  dueOn: "مستحقة {date} — {period}",
  proofPending: "إثبات دفع ينتظر التأكيد — {period}",
  underReview: "قيد المراجعة",
  myRights: "حقوقي في هذا المسار",
  limitPerRequest: "سقف الطلب: {amount} ر.س",
  committeeApproval: "يتطلب موافقة لجنة",
  submitRequest: "قدّم طلباً ←",
  loadError: "خطأ في التحميل",
  loadingWallets: "جاري تحميل محافظك...",
  myWallets: "محافظي",
  myWalletsDesc: "التزاماتي وحقوقي في كل صندوق",
  subsAttention: "⚠ اشتراكات تحتاج انتباه",
  daysAlt: "أيام"
});

Object.assign(memberEn.portal, {
  payNowAlt: "[EN] ادفع الآن",
  dueOn: "[EN] مستحقة {date} — {period}",
  proofPending: "[EN] إثبات دفع ينتظر التأكيد — {period}",
  underReview: "[EN] قيد المراجعة",
  myRights: "[EN] حقوقي في هذا المسار",
  limitPerRequest: "[EN] سقف الطلب: {amount} ر.س",
  committeeApproval: "[EN] يتطلب موافقة لجنة",
  submitRequest: "[EN] قدّم طلباً ←",
  loadError: "[EN] خطأ في التحميل",
  loadingWallets: "[EN] جاري تحميل محافظك...",
  myWallets: "[EN] محافظي",
  myWalletsDesc: "[EN] التزاماتي وحقوقي في كل صندوق",
  subsAttention: "[EN] ⚠ اشتراكات تحتاج انتباه",
  daysAlt: "[EN] أيام"
});

fs.writeFileSync(arMember, JSON.stringify(memberAr, null, 2) + '\n');
fs.writeFileSync(enMember, JSON.stringify(memberEn, null, 2) + '\n');

replaceAllInFile('portal/page.tsx', [
  ['"ادفع الآن"', 't("payNowAlt")'],
  [/مستحقة \$\{new Date\(d\.dueDate\)\.toLocaleDateString\("ar-SA"\)\} — \$\{d\.periodLabel\}/g, '${t("dueOn", { date: new Date(d.dueDate).toLocaleDateString("ar-SA"), period: d.periodLabel })}'],
  [/إثبات دفع ينتظر التأكيد — \$\{r\.paymentDue\?\.periodLabel\}/g, '${t("proofPending", { period: r.paymentDue?.periodLabel })}'],
  ['"قيد المراجعة"', 't("underReview")'],
  ['"حقوقي في هذا المسار"', 't("myRights")'],
  [/سقف الطلب: \$\{Number\(item\.maxAmountPerRequest\)\.toLocaleString\(\)\} ر\.س/g, '${t("limitPerRequest", { amount: Number(item.maxAmountPerRequest).toLocaleString() })}'],
  ['"يتطلب موافقة لجنة"', 't("committeeApproval")'],
  ['"قدّم طلباً ←"', 't("submitRequest")'],
  ['"خطأ في التحميل"', 't("loadError")'],
  ['"جاري تحميل محافظك..."', 't("loadingWallets")'],
  ['"محافظي"', 't("myWallets")'],
  ['"التزاماتي وحقوقي في كل صندوق"', 't("myWalletsDesc")'],
  ['"⚠ اشتراكات تحتاج انتباه"', 't("subsAttention")'],
  ['"أيام"', 't("daysAlt")'],
  [/\$\{Number\(d\.amountDue\)\.toLocaleString\("ar-SA"\)\} ر\.س/g, '${t("amountSAR", { amount: Number(d.amountDue).toLocaleString("ar-SA") })}'],
  [/\$\{Number\(r\.amount\)\.toLocaleString\("ar-SA"\)\} ر\.س/g, '${t("amountSAR", { amount: Number(r.amount).toLocaleString("ar-SA") })}']
]);

replaceAllInFile('entities/[id]/review/page.tsx', [
  ['"سبب الرفض"', 't("rejectReasonGeneral")'],
  ['"ملاحظة مطلوبة..."', 't("noteRequired")'],
  ['>قبول وتفعيل العضوية<', '>{t("accept")}<'],
  ['>رفض<', '>{t("reject")}<'],
  ['>تفعيل<', '>{t("activate")}<'],
  ['>تعليق<', '>{t("suspend")}<'],
  ['>موافقة<', '>{t("approve")}<'],
  ['>أُغلق وحُل<', '>{t("resolveAndClose")}<'],
  ['>قبول<', '>{t("accept")}<']
]);

replaceAllInFile('disputes/page.tsx', [
  ['"كيف تعمل آلية الاعتراض؟"', 't("howItWorksTitle")'],
  ['"يمكنك فتح نزاع عند الاعتراض على قرار أو عملية. يُراجع المدير النزاع ويمكنه حله أو تصعيده. مدة الفصل محددة بلوائح الكيان."', 't("howItWorksDesc")']
]);

replaceAllInFile('entities/[id]/page.tsx', [
  ['"الأعضاء"', 't("entityTabs.members")'],
  ['"مركز المراجعات"', 't("entityTabs.reviewCenter")'],
  ['"✓ تم النسخ"', 't("entityTabs.copied")']
]);

replaceAllInFile('entities/[id]/members/page.tsx', [
  ['>إلغاء<', '>{t("cancelBtn")}<']
]);

console.log('Final portal & review cleanup done.');
