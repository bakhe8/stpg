"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEntityTemplates, createEntity, EntityTemplate } from "@/lib/api/entities";
import { createInvitation } from "@/lib/api/invitations";
import styles from "./wizard.module.css";

// الوحدات المتاحة — تُعرض في بطاقة القالب
const MODULE_LABELS: Record<string, string> = {
  payments:      "المالية",
  decisions:     "القرارات",
  committees:    "اللجان",
  beneficiaries: "الصرف",
  auditor:       "التدقيق",
  governance:    "الحوكمة",
  documents:     "المستندات",
  disputes:      "الطعون",
};

// قالب "مخصص" — يعطي كامل الميزات ويسمح باختيار النوع
const CUSTOM_TEMPLATE: EntityTemplate = {
  id: "__custom__",
  name: "مخصص",
  type: "",
  description: "ابنِ كيانك من الصفر — تحكم كامل في جميع الإعدادات.",
  icon: "⚙️",
  enabledModules: null, // null = كل شيء
  suggestedGoals: null,
};

const ENTITY_TYPES = [
  { value: "FAMILY",       label: "عائلة",            icon: "👨‍👩‍👧‍👦" },
  { value: "NEIGHBORHOOD", label: "حي / مجتمع",       icon: "🏘️" },
  { value: "TRIBE",        label: "قبيلة / عشيرة",   icon: "⚜️" },
  { value: "COMMUNITY",    label: "مجموعة / تعاونية", icon: "🤝" },
  { value: "CAMPAIGN",     label: "حملة مؤقتة",       icon: "📣" },
  { value: "BUILDING",     label: "عمارة / مجمع",     icon: "🏢" },
];

export default function EntityWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<EntityTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EntityTemplate | null>(null);
  const [entityType, setEntityType] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdEntityId, setCreatedEntityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    getEntityTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setIsVerified(false); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { isVerified?: boolean } | null) => setIsVerified(d?.isVerified ?? false))
      .catch(() => setIsVerified(false));
  }, []);

  const allTemplates = [...templates, CUSTOM_TEMPLATE];
  const isCustom = selectedTemplate?.id === "__custom__";
  const resolvedType = isCustom ? entityType : (selectedTemplate?.type ?? "");

  const canNext = (): boolean => {
    if (step === 0) return selectedTemplate !== null && (!isCustom || entityType !== "");
    if (step === 1) return name.trim().length >= 2;
    return legalAccepted;
  };

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const result = await createEntity({
        name: name.trim(),
        type: resolvedType,
        description: description.trim() || undefined,
        templateId: isCustom ? undefined : selectedTemplate?.id,
      }) as { id: string };
      setCreatedEntityId(result.id);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إنشاء الكيان");
    } finally {
      setCreating(false);
    }
  }

  async function copyInviteLink() {
    if (!createdEntityId) return;
    try {
      const { token } = await createInvitation({ entityId: createdEntityId });
      const url = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    } catch { /* clipboard unavailable */ }
  }

  // ── شاشة: لم يُفعَّل الحساب ─────────────────────────────────────
  if (isVerified === false) {
    return (
      <div className={styles.unverifiedScreen}>
        <div className={styles.unverifiedCard}>
          <div className={styles.unverifiedIcon}>🔒</div>
          <h2 className={styles.unverifiedTitle}>حسابك غير مفعّل</h2>
          <p className={styles.unverifiedDesc}>
            يجب تفعيل حسابك من قِبل إدارة المنصة قبل إنشاء كيان.
          </p>
          <button className={styles.primaryBtn} onClick={() => router.push("/profile")}>
            الملف الشخصي
          </button>
        </div>
      </div>
    );
  }

  // ── شاشة: تمّ الإنشاء ────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className={styles.page}>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>✅</div>
          <h2 className={styles.successTitle}>تم إنشاء {name} بنجاح!</h2>
          <p className={styles.successDesc}>
            كيانك جاهز — ابدأ بدعوة الأعضاء أو إعداد المحافظ.
          </p>

          <div className={styles.nextSteps}>
            <div className={styles.nextStep}>
              <span className={styles.nextStepNum}>١</span>
              <div className={styles.nextStepBody}>
                <strong>ادعُ الأعضاء</strong>
                <p>انسخ رابط الدعوة وشاركه مع من تريد.</p>
              </div>
              <button
                className={inviteCopied ? styles.nextStepBtnDone : styles.nextStepBtn}
                onClick={copyInviteLink}
              >
                {inviteCopied ? "✓ تم النسخ" : "نسخ رابط الدعوة"}
              </button>
            </div>

            <div className={styles.nextStep}>
              <span className={styles.nextStepNum}>٢</span>
              <div className={styles.nextStepBody}>
                <strong>أنشئ المحافظ</strong>
                <p>حدّد بنود الإنفاق وأهداف الصندوق.</p>
              </div>
              <button
                className={styles.nextStepBtn}
                onClick={() => router.push(createdEntityId ? `/entities/${createdEntityId}?tab=wallets` : "/entities")}
              >
                إعداد المحافظ
              </button>
            </div>

            {selectedTemplate?.suggestedGoals && selectedTemplate.suggestedGoals.length > 0 && (
              <div className={styles.suggestedGoals}>
                <p className={styles.suggestedLabel}>أهداف مقترحة لقالبك:</p>
                <div className={styles.goalsRow}>
                  {selectedTemplate.suggestedGoals.map((g, i) => (
                    <span key={i} className={styles.goalChip}>{g.icon ?? "◎"} {g.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.successActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => router.push(createdEntityId ? `/entities/${createdEntityId}` : "/entities")}
            >
              الذهاب للكيان
            </button>
            <button className={styles.secondaryBtn} onClick={() => router.push("/entities")}>
              قائمة كياناتي
            </button>
          </div>
        </div>
      </div>
    );
  }

  const STEP_LABELS = ["اختر القالب", "سمّ كيانك", "تأكيد الإنشاء"];

  return (
    <div className={styles.page}>
      {/* ── Stepper ──────────────────────────────────────────── */}
      <div className={styles.stepper}>
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={i}>
            <div className={`${styles.stepDot} ${i < step ? styles.stepDone : i === step ? styles.stepActive : styles.stepPending}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ""}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ""}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className={styles.card}>

        {/* ── الخطوة ٠: اختيار القالب ─────────────────────────── */}
        {step === 0 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>ما نوع صندوقك؟</h2>
            <p className={styles.stepHint}>اختر قالباً جاهزاً أو ابنِ كيانك من الصفر — يمكن توسيع أي قالب لاحقاً</p>
            <div className={styles.templateGrid}>
              {allTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  className={`${styles.templateCard} ${selectedTemplate?.id === tpl.id ? styles.templateCardSelected : ""}`}
                  onClick={() => {
                    setSelectedTemplate(tpl);
                    if (tpl.id !== "__custom__") setEntityType(tpl.type);
                    else setEntityType("");
                  }}
                >
                  <span className={styles.templateIcon}>{tpl.icon ?? "◇"}</span>
                  <span className={styles.templateName}>{tpl.name}</span>
                  {tpl.description && <span className={styles.templateDesc}>{tpl.description}</span>}
                  {tpl.enabledModules && tpl.enabledModules.length > 0 && (
                    <div className={styles.templateModules}>
                      {tpl.enabledModules.slice(0, 3).map((m) => (
                        <span key={m} className={styles.templateModuleBadge}>
                          {MODULE_LABELS[m] ?? m}
                        </span>
                      ))}
                      {tpl.enabledModules.length > 3 && (
                        <span className={styles.templateModuleBadge}>+{tpl.enabledModules.length - 3}</span>
                      )}
                    </div>
                  )}
                  {tpl.id === "__custom__" && (
                    <div className={styles.templateModules}>
                      <span className={styles.templateModuleBadgeAll}>كامل الميزات</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* اختيار نوع الكيان للمخصص */}
            {isCustom && (
              <div className={styles.typeSection}>
                <label className={styles.label}>نوع الكيان *</label>
                <div className={styles.typeGrid}>
                  {ENTITY_TYPES.map((et) => (
                    <button
                      key={et.value}
                      className={`${styles.typeCard} ${entityType === et.value ? styles.typeCardSelected : ""}`}
                      onClick={() => setEntityType(et.value)}
                    >
                      <span className={styles.typeIcon}>{et.icon}</span>
                      <span className={styles.typeLabel}>{et.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── الخطوة ١: اسم الكيان ─────────────────────────────── */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>سمّ كيانك</h2>

            {selectedTemplate && selectedTemplate.id !== "__custom__" && (
              <div className={styles.selectedTemplateBadge}>
                <span>{selectedTemplate.icon}</span>
                <span>{selectedTemplate.name}</span>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.label}>اسم الكيان *</label>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedTemplate?.id !== "__custom__" ? `مثال: ${selectedTemplate?.name} آل الهاشمي` : "اسم الكيان"}
                maxLength={60}
                autoFocus
              />
              <span className={styles.hint}>{name.length}/60</span>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>وصف مختصر (اختياري)</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="يمكن إضافة وصف لاحقاً"
                rows={3}
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* ── الخطوة ٢: المراجعة والموافقة ──────────────────────── */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>تأكيد إنشاء الكيان</h2>

            <div className={styles.reviewCard}>
              {[
                { label: "القالب", value: selectedTemplate?.id === "__custom__" ? "مخصص" : (selectedTemplate?.name ?? "—") },
                { label: "الاسم", value: name },
                { label: "الوصف", value: description || "—" },
                { label: "النوع", value: ENTITY_TYPES.find((t) => t.value === resolvedType)?.label ?? resolvedType },
              ].map((row) => (
                <div key={row.label} className={styles.reviewRow}>
                  <span className={styles.reviewLabel}>{row.label}</span>
                  <span className={styles.reviewValue}>{row.value}</span>
                </div>
              ))}
            </div>

            {selectedTemplate?.enabledModules && selectedTemplate.enabledModules.length > 0 && (
              <div className={styles.reviewModules}>
                <p className={styles.reviewModulesLabel}>الوحدات التي ستكون نشطة ابتداءً:</p>
                <div className={styles.reviewModulesRow}>
                  <span className={styles.moduleBadgeAlways}>الأعضاء</span>
                  <span className={styles.moduleBadgeAlways}>الرئيسية</span>
                  {selectedTemplate.enabledModules.map((m) => (
                    <span key={m} className={styles.moduleBadge}>
                      {MODULE_LABELS[m] ?? m}
                    </span>
                  ))}
                </div>
                <p className={styles.expandNote}>يمكن تفعيل وحدات إضافية لاحقاً من إعدادات الكيان</p>
              </div>
            )}

            <div className={styles.legalBox}>
              <div className={styles.legalTitle}>قبل الإنشاء:</div>
              <ul className={styles.legalList}>
                <li>الصندوق ومعلوماته مرئية لأعضائه فقط — ليست علنية.</li>
                <li>بصفتك مؤسساً، أنت المرجع الأول لأي نزاع داخل الكيان.</li>
                <li>فريق المنصة لا يملك صلاحية تعديل سجلاتك المالية.</li>
              </ul>
              <label className={styles.legalCheckRow}>
                <input type="checkbox" checked={legalAccepted}
                  onChange={(e) => setLegalAccepted(e.target.checked)}
                  className={styles.legalCheckbox} />
                <span>أفهم وأوافق على شروط الإنشاء</span>
              </label>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────── */}
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          رجوع
        </button>
        {step < 2 ? (
          <button className={styles.primaryBtn} onClick={() => setStep(step + 1)} disabled={!canNext()}>
            التالي
          </button>
        ) : (
          <button className={styles.primaryBtn} onClick={handleCreate} disabled={creating || !canNext()}>
            {creating ? "جارٍ الإنشاء..." : "إنشاء الكيان"}
          </button>
        )}
      </div>
    </div>
  );
}
