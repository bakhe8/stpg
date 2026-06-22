const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(__dirname, '../src/app/(main)', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(fullPath, content);
  console.log(`Updated ${filePath}`);
}

replaceInFile('auditor/page.tsx', [
  ['"هذه البيانات مرئية للمراجع المالي فقط — لا تظهر لبقية الأعضاء"', 't("visibilityWarning")']
]);

replaceInFile('entities/[id]/platform-access/page.tsx', [
  ['"قراءة عادية"', 't("platformAccess.readOnly")'],
  ['"دعم فني"', 't("platformAccess.techSupport")'],
  ['"إجراء إداري"', 't("platformAccess.adminAction")'],
  ['"وصول طارئ"', 't("platformAccess.emergencyAccess")'],
  ['"خطأ في تحميل السجل"', 't("platformAccess.loadError")'],
  ['وصول فريق المنصة إلى بيانات كيانك', '{t("platformAccess.title")}'],
  ['كل وصول من فريق CollectiveTrustOS لبيانات كيانك يُسجَّل هنا بشكل تلقائي.', '{t("platformAccess.desc1")}'],
  ['هذا السجل غير قابل للحذف أو التعديل.', '{t("platformAccess.desc2")}'],
  ['جاري التحميل...', '{t("platformAccess.loading")}'],
  ['لم يصل أحد من فريق المنصة إلى بيانات كيانك حتى الآن.', '{t("platformAccess.empty")}'],
  ['العضو', '{t("platformAccess.colMember")}'],
  ['الدور', '{t("platformAccess.colRole")}'],
  ['نوع الوصول', '{t("platformAccess.colAccessType")}'],
  ['البيانات التي وُصل إليها', '{t("platformAccess.colDataAccessed")}'],
  ['السبب', '{t("platformAccess.colReason")}'],
  ['التوقيت', '{t("platformAccess.colTimestamp")}']
]);

replaceInFile('entities/[id]/page.tsx', [
  ['"الأعضاء"', 't("entityTabs.members")'],
  ['"مركز المراجعات"', 't("entityTabs.reviewCenter")'],
  ['"✓ تم النسخ"', 't("entityTabs.copied")']
]);

replaceInFile('entities/[id]/review/page.tsx', [
  ['"ملاحظة مطلوبة..."', 't("reviewCenter.noteRequired")'],
  ['تأكيد', '{t("reviewCenter.confirm")}'],
  ['إلغاء', '{t("reviewCenter.cancel")}'],
  ['لا توجد طلبات انضمام قيد المراجعة', '{t("reviewCenter.empty")}'],
  ['سبب رفض طلب الانضمام', '{t("reviewCenter.rejectReason")}'],
  ['متقدم غير معروف', '{t("reviewCenter.unknownApplicant")}'],
  ['العلاقة: {application.relationshipDescription}', '{t("reviewCenter.relationship", { desc: application.relationshipDescription })}'],
  ['المعرّف: {application.sponsorName}', '{t("reviewCenter.sponsor", { name: application.sponsorName })}']
]);

replaceInFile('entities/[id]/members/page.tsx', [
  ['"مقبول"', 't("membersPage.statusApproved")'],
  ['"مرفوض"', 't("membersPage.statusRejected")'],
  ['"ملغي"', 't("membersPage.statusCancelled")'],
  ['"القرار"', 't("membersPage.timelineDecision")'],
  ['>إلغاء<', '>{t("membersPage.cancelBtn")}<'],
  ['"تم رفض الطلب"', 't("membersPage.requestRejected")']
]);

replaceInFile('disputes/page.tsx', [
  ['كيف تعمل آلية الاعتراض؟', '{t("howItWorksTitle")}'],
  ['يمكنك فتح نزاع عند الاعتراض على قرار أو عملية. يُراجع المدير النزاع ويمكنه حله أو تصعيده. مدة الفصل محددة بلوائح الكيان.', '{t("howItWorksDesc")}']
]);

console.log('Replaced hardcoded strings in TSX files');
