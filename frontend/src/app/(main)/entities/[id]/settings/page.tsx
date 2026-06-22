"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getEntity,
  updateEntity,
  getClosureChecklist,
  requestClosure,
  Entity,
  ClosureChecklist,
} from "../../../../../lib/api/entities";
import ConfirmActionDialog from "../../../../../components/shared/ConfirmActionDialog";
import styles from "./settings.module.css";

export default function EntitySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Closure
  const [checklist, setChecklist] = useState<ClosureChecklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [closureReason, setClosureReason] = useState("");
  const [closureConfirmOpen, setClosureConfirmOpen] = useState(false);
  const [closureSubmitting, setClosureSubmitting] = useState(false);
  const [closureMsg, setClosureMsg] = useState<string | null>(null);

  const isFounderOrAdmin = entity?.myRole === "FOUNDER" || entity?.myRole === "ADMIN";

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getEntity(id)
      .then((e) => {
        setEntity(e);
        setName(e.name);
        setDescription(e.description ?? "");
        setBankAccountNumber(e.bankAccountNumber ?? "");
        setBankName(e.bankName ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !isFounderOrAdmin) return;
    setChecklistLoading(true);
    getClosureChecklist(id)
      .then(setChecklist)
      .catch(() => {})
      .finally(() => setChecklistLoading(false));
  }, [id, isFounderOrAdmin]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await updateEntity(id, { name, description, bankAccountNumber, bankName });
      setEntity((prev) => (prev ? { ...prev, ...updated } : updated));
      setSaveMsg({ type: "success", text: "تم حفظ الإعدادات بنجاح" });
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "فشل الحفظ" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestClosure() {
    if (!id || !closureReason.trim()) return;
    setClosureSubmitting(true);
    try {
      await requestClosure(id, closureReason);
      setClosureMsg("تم إرسال طلب الإغلاق — ستتولى المنصة مراجعته وإشعارك");
      setClosureConfirmOpen(false);
      void getClosureChecklist(id).then(setChecklist);
    } catch (err) {
      setClosureMsg(err instanceof Error ? err.message : "فشل إرسال طلب الإغلاق");
    } finally {
      setClosureSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!entity) {
    return <div className={styles.error}>لم يُعثر على الكيان</div>;
  }

  const alreadyRequestedClosure = !!entity.closureStatus;

  return (
    <div className={styles.page}>
      <Link href={`/entities/${id}`} className={styles.back}>← العودة للكيان</Link>

      <h1 className={styles.title}>إعدادات الكيان</h1>

      {/* ── بيانات الكيان ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>البيانات الأساسية</h2>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>اسم الكيان</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>الوصف</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>رقم الحساب البنكي</label>
              <input
                className={styles.input}
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                maxLength={30}
                dir="ltr"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>البنك</label>
              <input
                className={styles.input}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          {saveMsg && (
            <div className={`${styles.msg} ${saveMsg.type === "success" ? styles.msgSuccess : styles.msgError}`}>
              {saveMsg.text}
            </div>
          )}
          <button className={styles.saveBtn} type="submit" disabled={saving || !isFounderOrAdmin}>
            {saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
          </button>
        </form>
      </section>

      {/* ── طلب الإغلاق (للمؤسس والمدير فقط) ── */}
      {isFounderOrAdmin && (
        <section className={`${styles.section} ${styles.dangerSection}`}>
          <h2 className={styles.sectionTitle}>إغلاق الكيان</h2>

          {alreadyRequestedClosure ? (
            <div className={styles.closureStatus}>
              <div className={styles.closureStatusIcon}>⏳</div>
              <div>
                <div className={styles.closureStatusLabel}>تم إرسال طلب الإغلاق</div>
                <div className={styles.closureStatusSub}>
                  بتاريخ {entity.closureRequestedAt ? new Date(entity.closureRequestedAt).toLocaleDateString("ar-SA") : "—"}
                </div>
                {entity.closureReason && (
                  <div className={styles.closureReasonDisplay}>{entity.closureReason}</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className={styles.dangerNote}>
                يؤدي طلب الإغلاق إلى تجميد الكيان. يجب استيفاء الشروط أدناه قبل الإغلاق.
              </p>

              {/* Checklist */}
              {checklistLoading ? (
                <div className={styles.checklistLoading}>جارٍ التحقق من الشروط…</div>
              ) : checklist ? (
                <div className={styles.checklist}>
                  {checklist.checks.map((c) => (
                    <div key={c.key} className={`${styles.checkItem} ${c.passed ? styles.checkPassed : styles.checkFailed}`}>
                      <span className={styles.checkIcon}>{c.passed ? "✓" : "✗"}</span>
                      <div>
                        <div className={styles.checkLabel}>{c.label}</div>
                        {!c.passed && c.detail && (
                          <div className={styles.checkDetail}>{c.detail}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {closureMsg && (
                <div className={`${styles.msg} ${styles.msgError}`}>{closureMsg}</div>
              )}

              <div className={styles.closureReasonField}>
                <label className={styles.label}>سبب الإغلاق (مطلوب)</label>
                <textarea
                  className={styles.textarea}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="اذكر سبب إغلاق الكيان…"
                />
              </div>

              <button
                className={styles.dangerBtn}
                onClick={() => setClosureConfirmOpen(true)}
                disabled={!checklist?.canClose || !closureReason.trim()}
              >
                طلب إغلاق الكيان
              </button>
              {checklist && !checklist.canClose && (
                <p className={styles.checkHint}>أكمل الشروط أعلاه لتفعيل زر الإغلاق</p>
              )}
            </>
          )}
        </section>
      )}

      {closureConfirmOpen && (
        <ConfirmActionDialog
          title="تأكيد طلب إغلاق الكيان"
          description={`سيُجمَّد الكيان وتُرسل المنصة إشعاراً لجميع الأعضاء. هذا الإجراء يصعب التراجع عنه.`}
          confirmLabel="تأكيد طلب الإغلاق"
          danger
          loading={closureSubmitting}
          onConfirm={() => void handleRequestClosure()}
          onCancel={() => setClosureConfirmOpen(false)}
        />
      )}
    </div>
  );
}
