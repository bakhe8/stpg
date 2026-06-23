"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  type EntityTemplate,
  type CreateTemplatePayload,
} from "../../../lib/api/platform";
import styles from "./templates.module.css";

const ALL_MODULES = [
  { key: "payments",      label: "المالية / الاشتراكات" },
  { key: "decisions",     label: "القرارات" },
  { key: "committees",    label: "اللجان" },
  { key: "beneficiaries", label: "المستفيدون" },
  { key: "auditor",       label: "التدقيق" },
  { key: "governance",    label: "مسارات الحوكمة" },
  { key: "documents",     label: "المستندات" },
  { key: "disputes",      label: "الطعون" },
];

const ENTITY_TYPES = [
  { value: "FAMILY",       label: "عائلة" },
  { value: "NEIGHBORHOOD", label: "حي" },
  { value: "TRIBE",        label: "قبيلة" },
  { value: "FRIENDS",      label: "أصدقاء" },
  { value: "CAMPAIGN",     label: "حملة مؤقتة" },
  { value: "COMMUNITY",    label: "تعاونية / جمعية" },
  { value: "BUILDING",     label: "عمارة / مجمع" },
];

const BLANK: CreateTemplatePayload = {
  name: "",
  type: "FAMILY",
  description: "",
  icon: "🏠",
  isActive: true,
  sortOrder: 0,
  enabledModules: ["payments"],
  suggestedGoals: [],
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EntityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntityTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateTemplatePayload>(BLANK);
  const [saving, setSaving] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await getTemplates(true));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(BLANK);
    setGoalInput("");
    setCreating(true);
    setEditing(null);
  }

  function openEdit(tpl: EntityTemplate) {
    setForm({
      name: tpl.name,
      type: tpl.type,
      description: tpl.description ?? "",
      icon: tpl.icon ?? "",
      isActive: tpl.isActive,
      sortOrder: tpl.sortOrder,
      enabledModules: tpl.enabledModules ?? [],
      suggestedGoals: tpl.suggestedGoals ?? [],
    });
    setGoalInput("");
    setEditing(tpl);
    setCreating(false);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  function toggleModule(key: string) {
    const mods = form.enabledModules ?? [];
    setForm({
      ...form,
      enabledModules: mods.includes(key)
        ? mods.filter((m) => m !== key)
        : [...mods, key],
    });
  }

  function addGoal() {
    if (!goalInput.trim()) return;
    setForm({
      ...form,
      suggestedGoals: [...(form.suggestedGoals ?? []), { name: goalInput.trim() }],
    });
    setGoalInput("");
  }

  function removeGoal(idx: number) {
    setForm({
      ...form,
      suggestedGoals: (form.suggestedGoals ?? []).filter((_, i) => i !== idx),
    });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateTemplate(editing.id, form);
      } else {
        await createTemplate(form);
      }
      await load();
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا القالب؟ الكيانات الموجودة لن تتأثر.")) return;
    try {
      await deleteTemplate(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحذف");
    }
  }

  async function handleToggleActive(tpl: EntityTemplate) {
    try {
      await updateTemplate(tpl.id, { isActive: !tpl.isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحديث");
    }
  }

  const showForm = creating || editing !== null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>إدارة القوالب</h1>
          <p className={styles.subtitle}>
            القوالب تُوجَّه للمستخدمين عند إنشاء كيان جديد — كل قالب نقطة بداية قابلة للتوسعة
          </p>
        </div>
        <button className={styles.createBtn} onClick={openCreate}>+ قالب جديد</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* ── Form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {editing ? "تعديل القالب" : "إنشاء قالب جديد"}
          </h2>

          <div className={styles.formGrid}>
            {/* الاسم */}
            <div className={styles.field}>
              <label className={styles.label}>اسم القالب *</label>
              <input className={styles.input} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="صندوق عائلي" />
            </div>

            {/* الأيقونة */}
            <div className={styles.field}>
              <label className={styles.label}>الأيقونة (emoji)</label>
              <input className={styles.input} value={form.icon ?? ""}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🏠" maxLength={4} />
            </div>

            {/* نوع الكيان */}
            <div className={styles.field}>
              <label className={styles.label}>نوع الكيان</label>
              <select className={styles.select} value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* الترتيب */}
            <div className={styles.field}>
              <label className={styles.label}>الترتيب (رقم)</label>
              <input className={styles.input} type="number" min={0}
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
          </div>

          {/* الوصف */}
          <div className={styles.field}>
            <label className={styles.label}>الوصف</label>
            <textarea className={styles.textarea} rows={2}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="يُعرض للمستخدم عند اختيار القالب" />
          </div>

          {/* الوحدات */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>الوحدات المُفعَّلة ابتداءً</label>
            <p className={styles.hint}>الأعضاء والرئيسية مُفعَّلتان دائماً. اختر ما يُفعَّل إضافةً:</p>
            <div className={styles.modulesGrid}>
              {ALL_MODULES.map((m) => (
                <label key={m.key} className={styles.moduleToggle}>
                  <input type="checkbox"
                    checked={(form.enabledModules ?? []).includes(m.key)}
                    onChange={() => toggleModule(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {/* الأهداف المقترحة */}
          <div className={styles.section}>
            <label className={styles.sectionLabel}>الأهداف / المحافظ المقترحة</label>
            <p className={styles.hint}>ستظهر كاقتراحات للمستخدم عند إنشاء محافظ كيانه</p>
            <div className={styles.goalsList}>
              {(form.suggestedGoals ?? []).map((g, i) => (
                <span key={i} className={styles.goalChip}>
                  {g.name}
                  <button onClick={() => removeGoal(i)} className={styles.chipRemove}>×</button>
                </span>
              ))}
            </div>
            <div className={styles.goalRow}>
              <input className={styles.input} value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
                placeholder="اسم الهدف..." />
              <button className={styles.addGoalBtn} onClick={addGoal}>إضافة</button>
            </div>
          </div>

          {/* نشط */}
          <label className={styles.activeRow}>
            <input type="checkbox" checked={form.isActive ?? true}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            القالب نشط (يظهر للمستخدمين)
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formActions}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? "جارٍ الحفظ..." : "حفظ القالب"}
            </button>
            <button className={styles.cancelBtn} onClick={closeForm}>إلغاء</button>
          </div>
        </div>
      )}

      {/* ── Templates List ──────────────────────────────────── */}
      {loading ? (
        <div className={styles.loading}>جارٍ التحميل...</div>
      ) : (
        <div className={styles.list}>
          {templates.length === 0 && (
            <div className={styles.empty}>لا توجد قوالب بعد — أنشئ أول قالب</div>
          )}
          {templates.map((tpl) => (
            <div key={tpl.id} className={`${styles.card} ${!tpl.isActive ? styles.cardInactive : ""}`}>
              <div className={styles.cardIcon}>{tpl.icon || "◇"}</div>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <span className={styles.cardName}>{tpl.name}</span>
                  <span className={styles.cardType}>{ENTITY_TYPES.find((t) => t.value === tpl.type)?.label ?? tpl.type}</span>
                  {!tpl.isActive && <span className={styles.badgeInactive}>مخفي</span>}
                </div>
                {tpl.description && <p className={styles.cardDesc}>{tpl.description}</p>}
                <div className={styles.cardModules}>
                  {(tpl.enabledModules ?? []).map((m) => (
                    <span key={m} className={styles.moduleBadge}>
                      {ALL_MODULES.find((x) => x.key === m)?.label ?? m}
                    </span>
                  ))}
                  {(!tpl.enabledModules || tpl.enabledModules.length === 0) && (
                    <span className={styles.noModules}>كامل الميزات</span>
                  )}
                </div>
                {tpl.suggestedGoals && tpl.suggestedGoals.length > 0 && (
                  <div className={styles.cardGoals}>
                    <span className={styles.goalsLabel}>أهداف مقترحة:</span>
                    {tpl.suggestedGoals.map((g, i) => (
                      <span key={i} className={styles.goalBadge}>{g.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.editBtn} onClick={() => openEdit(tpl)}>تعديل</button>
                <button
                  className={tpl.isActive ? styles.hideBtn : styles.showBtn}
                  onClick={() => handleToggleActive(tpl)}
                >
                  {tpl.isActive ? "إخفاء" : "إظهار"}
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(tpl.id)}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
