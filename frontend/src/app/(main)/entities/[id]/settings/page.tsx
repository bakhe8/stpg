"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getEntity,
  updateEntity,
  getClosureChecklist,
  requestClosure,
  Entity,
  ClosureChecklist,
} from "../../../../../lib/api/entities";
import { isCampaignRecord } from "../../../../../lib/entity-display";
import ConfirmActionDialog from "../../../../../components/shared/ConfirmActionDialog";
import Breadcrumbs from "../../../../../components/shared/Breadcrumbs";
import styles from "./settings.module.css";

export default function EntitySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useTranslations("nav");
  const t = useTranslations("entitySettings");

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
      setSaveMsg({ type: "success", text: t("saveSuccess") });
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : t("saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestClosure() {
    if (!id || !closureReason.trim()) return;
    setClosureSubmitting(true);
    try {
      await requestClosure(id, closureReason);
      setClosureMsg(t("closureSentMsg"));
      setClosureConfirmOpen(false);
      void getClosureChecklist(id).then(setChecklist);
    } catch (err) {
      setClosureMsg(err instanceof Error ? err.message : t("closureSentFailed"));
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
    return <div className={styles.error}>{t("entityNotFound")}</div>;
  }

  const alreadyRequestedClosure = !!entity.closureStatus;
  const isCampaign = isCampaignRecord(entity);
  const scopedSettingKey = (
    fundKey: Parameters<typeof t>[0],
    campaignKey: Parameters<typeof t>[0],
  ) => (isCampaign ? campaignKey : fundKey);
  const hasNameChange = name.trim() !== entity.name;
  const hasDescriptionChange = description.trim() !== (entity.description ?? "");
  const hasBankChange =
    bankAccountNumber.trim() !== (entity.bankAccountNumber ?? "") ||
    bankName.trim() !== (entity.bankName ?? "");
  const bankWillBeComplete = Boolean(
    bankAccountNumber.trim() && bankName.trim(),
  );
  const hasAnyBasicChange =
    hasNameChange || hasDescriptionChange || hasBankChange;
  const impactItems = [
    hasNameChange ? t("impactName") : null,
    hasDescriptionChange ? t("impactDescription") : null,
    hasBankChange && bankWillBeComplete ? t("impactBankComplete") : null,
    hasBankChange && !bankWillBeComplete ? t("impactBankIncomplete") : null,
    hasAnyBasicChange ? t("impactNoPermissionChange") : t("impactNoneYet"),
  ].filter((item): item is string => Boolean(item));

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: nav("dashboard"), href: "/dashboard" },
          { label: nav("entities"), href: "/entities" },
          { label: entity.name, href: `/entities/${id}` },
          { label: t("breadcrumbSettings") },
        ]}
      />
      <Link href={`/entities/${id}`} className={styles.back}>{t(scopedSettingKey("backToEntity", "backToCampaign"))}</Link>

      <h1 className={styles.title}>{t(scopedSettingKey("title", "campaignTitle"))}</h1>

      {/* ── بيانات الصندوق / الحملة ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("basicTitle")}</h2>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>{t(scopedSettingKey("nameLabel", "campaignNameLabel"))}</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t("descriptionLabel")}</label>
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
              <label className={styles.label}>{t("bankAccountLabel")}</label>
              <input
                className={styles.input}
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                maxLength={30}
                dir="ltr"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("bankNameLabel")}</label>
              <input
                className={styles.input}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <div className={styles.impactPreview}>
            <div className={styles.impactHeader}>
              <strong>{t("impactTitle")}</strong>
              <span>{hasAnyBasicChange ? t("unsavedChanges") : t("noChanges")}</span>
            </div>
            <ul>
              {impactItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          {saveMsg && (
            <div className={`${styles.msg} ${saveMsg.type === "success" ? styles.msgSuccess : styles.msgError}`}>
              {saveMsg.text}
            </div>
          )}
          <button className={styles.saveBtn} type="submit" disabled={saving || !isFounderOrAdmin}>
            {saving ? t("saving") : t("saveChanges")}
          </button>
        </form>
      </section>

      {/* ── طلب الإغلاق (للمؤسس والمدير فقط) ── */}
      {isFounderOrAdmin && (
        <section className={`${styles.section} ${styles.dangerSection}`}>
          <h2 className={styles.sectionTitle}>{t(scopedSettingKey("closureTitle", "campaignClosureTitle"))}</h2>

          {alreadyRequestedClosure ? (
            <div className={styles.closureStatus}>
              <div className={styles.closureStatusIcon}>⏳</div>
              <div>
                <div className={styles.closureStatusLabel}>{t("closureRequestSent")}</div>
                <div className={styles.closureStatusSub}>
                  {t("closureRequestedOn", {
                    date: entity.closureRequestedAt
                      ? new Date(entity.closureRequestedAt).toLocaleDateString("ar-SA")
                      : "—",
                  })}
                </div>
                {entity.closureReason && (
                  <div className={styles.closureReasonDisplay}>{entity.closureReason}</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className={styles.dangerNote}>{t(scopedSettingKey("closureWarning", "campaignClosureWarning"))}</p>

              {/* Checklist */}
              {checklistLoading ? (
                <div className={styles.checklistLoading}>{t("checklistLoading")}</div>
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
                <label className={styles.label}>{t("closureReasonLabel")}</label>
                <textarea
                  className={styles.textarea}
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder={t(scopedSettingKey("closureReasonPlaceholder", "campaignClosureReasonPlaceholder"))}
                />
              </div>

              <button
                className={styles.dangerBtn}
                onClick={() => setClosureConfirmOpen(true)}
                disabled={!checklist?.canClose || !closureReason.trim()}
              >
                {t(scopedSettingKey("requestClosureBtn", "requestCampaignClosureBtn"))}
              </button>
              {checklist && !checklist.canClose && (
                <p className={styles.checkHint}>{t("completeChecksHint")}</p>
              )}
            </>
          )}
        </section>
      )}

      {closureConfirmOpen && (
        <ConfirmActionDialog
          title={t(scopedSettingKey("confirmClosureTitle", "confirmCampaignClosureTitle"))}
          description={t(scopedSettingKey("confirmClosureDesc", "confirmCampaignClosureDesc"))}
          confirmLabel={t("confirmClosureBtn")}
          danger
          loading={closureSubmitting}
          onConfirm={() => void handleRequestClosure()}
          onCancel={() => setClosureConfirmOpen(false)}
        />
      )}
    </div>
  );
}
