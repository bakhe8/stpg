const fs = require('fs');
const path = require('path');

function updateLocales() {
  const arPath = path.join(__dirname, '../src/locales/ar/admin.json');
  const enPath = path.join(__dirname, '../src/locales/en/admin.json');

  const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  const newStringsAr = {
    emptyRecords: "✓ لا توجد إثباتات دفع قيد المراجعة — كل الإيصالات تمت معالجتها",
    rejectReasonGeneral: "سبب الرفض",
    ruleRecordsTitle: "لماذا تُراجع هذه الإيصالات؟",
    ruleRecordsDesc: "أنت أمين الصندوق أو مدير الكيان. مهمتك التحقق من تطابق الإيصال مع المبلغ المطلوب وتأكيد صحة الدفعة قبل اعتمادها.",
    amountSAR: "{amount} ر.س",
    referencePrefix: "المرجع: {ref}",
    accept: "قبول",
    reject: "رفض",
    emptySubscriptions: "لا توجد اشتراكات قيد المراجعة",
    stateInterested: "مهتم",
    stateConditional: "مشروط",
    activate: "تفعيل",
    suspend: "تعليق",
    emptyDisbursements: "✓ لا توجد طلبات صرف قيد المراجعة حالياً",
    ruleDisbursementsTitle: "لماذا يُطلب منك الموافقة على الصرف؟",
    ruleDisbursementsDesc: "طلب الصرف يمر بمراجعة الإدارة قبل التنفيذ. اعتمادك يُطلق الخطوة التالية في مسار الحوكمة المعتمد في الكيان.",
    approve: "موافقة",
    emptyDisputes: "لا توجد نزاعات مفتوحة",
    resolveDecisionTitle: "قرار حل النزاع",
    ruleDisputesTitle: "لماذا تُراجع هذه النزاعات؟",
    ruleDisputesDesc: "آلية الاعتراض في الكيان تتيح لك كمدير الفصل في النزاعات أو تصعيدها. قرارك مُقيَّد بالسياسة الداخلية للكيان.",
    resolveAndClose: "أُغلق وحُل",
    unauthorizedAdmin: "هذه الصفحة مخصصة للمؤسسين والمدراء فقط",
    loadError: "خطأ في التحميل",
    loadingItems: "جاري تحميل بنود المراجعة...",
    tabMemberships: "طلبات الانضمام",
    tabRecords: "إثباتات الدفع",
    tabSubscriptions: "الاشتراكات",
    tabDisbursements: "طلبات الصرف",
    tabDisputes: "النزاعات",
    pageTitle: "مركز المراجعات",
    pendingCount: "{count} بند قيد المراجعة",
    notePrefix: "ملاحظة: {note}"
  };

  const newStringsEn = {
    emptyRecords: "[EN] ✓ لا توجد إثباتات دفع قيد المراجعة — كل الإيصالات تمت معالجتها",
    rejectReasonGeneral: "[EN] سبب الرفض",
    ruleRecordsTitle: "[EN] لماذا تُراجع هذه الإيصالات؟",
    ruleRecordsDesc: "[EN] أنت أمين الصندوق أو مدير الكيان. مهمتك التحقق من تطابق الإيصال مع المبلغ المطلوب وتأكيد صحة الدفعة قبل اعتمادها.",
    amountSAR: "[EN] {amount} ر.س",
    referencePrefix: "[EN] المرجع: {ref}",
    accept: "[EN] قبول",
    reject: "[EN] رفض",
    emptySubscriptions: "[EN] لا توجد اشتراكات قيد المراجعة",
    stateInterested: "[EN] مهتم",
    stateConditional: "[EN] مشروط",
    activate: "[EN] تفعيل",
    suspend: "[EN] تعليق",
    emptyDisbursements: "[EN] ✓ لا توجد طلبات صرف قيد المراجعة حالياً",
    ruleDisbursementsTitle: "[EN] لماذا يُطلب منك الموافقة على الصرف؟",
    ruleDisbursementsDesc: "[EN] طلب الصرف يمر بمراجعة الإدارة قبل التنفيذ. اعتمادك يُطلق الخطوة التالية في مسار الحوكمة المعتمد في الكيان.",
    approve: "[EN] موافقة",
    emptyDisputes: "[EN] لا توجد نزاعات مفتوحة",
    resolveDecisionTitle: "[EN] قرار حل النزاع",
    ruleDisputesTitle: "[EN] لماذا تُراجع هذه النزاعات؟",
    ruleDisputesDesc: "[EN] آلية الاعتراض في الكيان تتيح لك كمدير الفصل في النزاعات أو تصعيدها. قرارك مُقيَّد بالسياسة الداخلية للكيان.",
    resolveAndClose: "[EN] أُغلق وحُل",
    unauthorizedAdmin: "[EN] هذه الصفحة مخصصة للمؤسسين والمدراء فقط",
    loadError: "[EN] خطأ في التحميل",
    loadingItems: "[EN] جاري تحميل بنود المراجعة...",
    tabMemberships: "[EN] طلبات الانضمام",
    tabRecords: "[EN] إثباتات الدفع",
    tabSubscriptions: "[EN] الاشتراكات",
    tabDisbursements: "[EN] طلبات الصرف",
    tabDisputes: "[EN] النزاعات",
    pageTitle: "[EN] مركز المراجعات",
    pendingCount: "[EN] {count} بند قيد المراجعة",
    notePrefix: "[EN] ملاحظة: {note}"
  };

  if (!ar.reviewCenter) ar.reviewCenter = {};
  if (!en.reviewCenter) en.reviewCenter = {};

  Object.assign(ar.reviewCenter, newStringsAr);
  Object.assign(en.reviewCenter, newStringsEn);

  fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + '\n');
  fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
}

updateLocales();

function replaceInFile(filePath, replacements) {
  const fullPath = path.join(__dirname, '../src/app/(main)', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add useTranslations import if missing
  if (!content.includes('useTranslations')) {
    content = content.replace("import Link from 'next/link';", "import Link from 'next/link';\nimport { useTranslations } from 'next-intl';");
  }

  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  fs.writeFileSync(fullPath, content);
}

const pageReplacements = [
  // Add t to functions
  ['function ActionNoteModal({', 'function ActionNoteModal({\n  t,'],
  ['requireNote: boolean;', 'requireNote: boolean;\n  t: any;'],
  ['function MembershipApplicationsTab({', 'function MembershipApplicationsTab({\n  t,'],
  ['onRefresh: () => void;', 'onRefresh: () => void;\n  t: any;'],
  ['function RecordsTab({', 'function RecordsTab({\n  t,'],
  ['function SubscriptionsTab({', 'function SubscriptionsTab({\n  t,'],
  ['function DisbursementsTab({', 'function DisbursementsTab({\n  t,'],
  ['function DisputesTab({', 'function DisputesTab({\n  t,'],

  // Pass t to components
  ['<ActionNoteModal', '<ActionNoteModal t={t}'],
  ['<MembershipApplicationsTab', '<MembershipApplicationsTab t={t}'],
  ['<RecordsTab', '<RecordsTab t={t}'],
  ['<SubscriptionsTab', '<SubscriptionsTab t={t}'],
  ['<DisbursementsTab', '<DisbursementsTab t={t}'],
  ['<DisputesTab', '<DisputesTab t={t}'],

  // ReviewCenterPage hook
  ['export default function ReviewCenterPage() {', 'export default function ReviewCenterPage() {\n  const t = useTranslations("reviewCenter");'],
  
  // Replacements
  ['✓ لا توجد إثباتات دفع قيد المراجعة — كل الإيصالات تمت معالجتها', '{t("emptyRecords")}'],
  ['"سبب الرفض"', 't("rejectReasonGeneral")'],
  ['"لماذا تُراجع هذه الإيصالات؟"', 't("ruleRecordsTitle")'],
  ['"أنت أمين الصندوق أو مدير الكيان. مهمتك التحقق من تطابق الإيصال مع المبلغ المطلوب وتأكيد صحة الدفعة قبل اعتمادها."', 't("ruleRecordsDesc")'],
  ['{Number(r.amount).toLocaleString(\'ar-SA\')} ر.س', '{t("amountSAR", { amount: Number(r.amount).toLocaleString("ar-SA") })}'],
  ['المرجع: {r.reference}', '{t("referencePrefix", { ref: r.reference })}'],
  ['>قبول<', '>{t("accept")}<'],
  ['>رفض<', '>{t("reject")}<'],
  ['لا توجد اشتراكات قيد المراجعة', '{t("emptySubscriptions")}'],
  ['\'مهتم\'', 't("stateInterested")'],
  ['\'مشروط\'', 't("stateConditional")'],
  ['>تفعيل<', '>{t("activate")}<'],
  ['>تعليق<', '>{t("suspend")}<'],
  ['✓ لا توجد طلبات صرف قيد المراجعة حالياً', '{t("emptyDisbursements")}'],
  ['"لماذا يُطلب منك الموافقة على الصرف؟"', 't("ruleDisbursementsTitle")'],
  ['"طلب الصرف يمر بمراجعة الإدارة قبل التنفيذ. اعتمادك يُطلق الخطوة التالية في مسار الحوكمة المعتمد في الكيان."', 't("ruleDisbursementsDesc")'],
  ['{Number(req.amount).toLocaleString(\'ar-SA\')} ر.س', '{t("amountSAR", { amount: Number(req.amount).toLocaleString("ar-SA") })}'],
  ['>موافقة<', '>{t("approve")}<'],
  ['لا توجد نزاعات مفتوحة', '{t("emptyDisputes")}'],
  ['"قرار حل النزاع"', 't("resolveDecisionTitle")'],
  ['"لماذا تُراجع هذه النزاعات؟"', 't("ruleDisputesTitle")'],
  ['"آلية الاعتراض في الكيان تتيح لك كمدير الفصل في النزاعات أو تصعيدها. قرارك مُقيَّد بالسياسة الداخلية للكيان."', 't("ruleDisputesDesc")'],
  ['>أُغلق وحُل<', '>{t("resolveAndClose")}<'],
  ['\'هذه الصفحة مخصصة للمؤسسين والمدراء فقط\'', 't("unauthorizedAdmin")'],
  ['\'خطأ في التحميل\'', 't("loadError")'],
  ['جاري تحميل بنود المراجعة...', '{t("loadingItems")}'],
  ['\'طلبات الانضمام\'', 't("tabMemberships")'],
  ['\'إثباتات الدفع\'', 't("tabRecords")'],
  ['\'الاشتراكات\'', 't("tabSubscriptions")'],
  ['\'طلبات الصرف\'', 't("tabDisbursements")'],
  ['\'النزاعات\'', 't("tabDisputes")'],
  ['مركز المراجعات', '{t("pageTitle")}'],
  ['{totalPending} بند قيد المراجعة', '{t("pendingCount", { count: totalPending })}'],
  ['ملاحظة: {application.note}', '{t("notePrefix", { note: application.note })}']
];

replaceInFile('entities/[id]/review/page.tsx', pageReplacements);

console.log('Finished translation logic');
