"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { EntityPlatformStatus } from "@/lib/api/entities";
import { exportEntityData, submitSuspensionAppeal } from "@/lib/api/entities";
import styles from "./PlatformStatusBanner.module.css";

interface Props {
  entityId: string;
  status: EntityPlatformStatus;
  reason?: string | null;
  suspendedAt?: string | null;
}

const CONFIG: Record<
  Exclude<EntityPlatformStatus, "ACTIVE">,
  { icon: string; labelKey: string; colorClass: string; canExport: boolean; canAppeal: boolean }
> = {
  SUSPENDED: {
    icon: "🚫",
    labelKey: "suspendedTitle",
    colorClass: "suspended",
    canExport: true,
    canAppeal: true,
  },
  READ_ONLY: {
    icon: "👁",
    labelKey: "readOnlyTitle",
    colorClass: "readOnly",
    canExport: false,
    canAppeal: false,
  },
  PENDING_REVIEW: {
    icon: "⏳",
    labelKey: "pendingReviewTitle",
    colorClass: "pendingReview",
    canExport: false,
    canAppeal: false,
  },
};

const STATUS_TYPE_LABELS: Record<Exclude<EntityPlatformStatus, "ACTIVE">, string> = {
  SUSPENDED: "suspendedType",
  READ_ONLY: "readOnlyType",
  PENDING_REVIEW: "pendingReviewType",
};

export default function PlatformStatusBanner({ entityId, status, reason, suspendedAt }: Props) {
  const t = useTranslations("platformBanner");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealing, setAppealing] = useState(false);
  const [appealMsg, setAppealMsg] = useState<string | null>(null);

  if (status === "ACTIVE") return null;

  const cfg = CONFIG[status];

  async function handleExport() {
    setExporting(true);
    setExportMsg(null);
    try {
      const data = await exportEntityData(entityId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entity-${entityId}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg(t("exportSuccess"));
    } catch {
      setExportMsg(t("exportError"));
    } finally {
      setExporting(false);
    }
  }

  async function handleAppeal(e: React.FormEvent) {
    e.preventDefault();
    if (!appealReason.trim()) return;
    setAppealing(true);
    setAppealMsg(null);
    try {
      await submitSuspensionAppeal(entityId, appealReason.trim());
      setAppealMsg(t("appealSuccess"));
      setShowAppealForm(false);
      setAppealReason("");
    } catch (err) {
      setAppealMsg(t("appealError", { error: err instanceof Error ? err.message : t("unknownError") }));
    } finally {
      setAppealing(false);
    }
  }

  return (
    <div className={`${styles.banner} ${styles[cfg.colorClass]}`}>
      <div className={styles.bannerTop}>
        <span className={styles.icon}>{cfg.icon}</span>
        <div className={styles.body}>
          <span className={styles.title}>{t(cfg.labelKey)}</span>
          <span className={styles.type}>{t(STATUS_TYPE_LABELS[status])}</span>
        </div>
      </div>

      {(reason || suspendedAt) && (
        <div className={styles.details}>
          {reason && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("reasonLabel")}</span>
              <span className={styles.detailVal}>{reason}</span>
            </div>
          )}
          {suspendedAt && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("dateLabel")}</span>
              <span className={styles.detailVal}>
                {new Date(suspendedAt).toLocaleDateString("ar-SA")}
              </span>
            </div>
          )}
        </div>
      )}

      {(exportMsg || appealMsg) && (
        <div className={styles.feedbackRow}>
          {exportMsg && <span>{exportMsg}</span>}
          {appealMsg && <span>{appealMsg}</span>}
        </div>
      )}

      <div className={styles.actions}>
        {cfg.canExport && (
          <button
            className={styles.exportBtn}
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? t("exporting") : t("exportData")}
          </button>
        )}
        {cfg.canAppeal && (
          <button
            className={styles.appealBtn}
            onClick={() => setShowAppealForm(!showAppealForm)}
          >
            {showAppealForm ? t("cancel") : t("appealSuspension")}
          </button>
        )}
        <Link href={`/entities/${entityId}/platform-access`} className={styles.logBtn}>
          {t("viewAccessLog")}
        </Link>
      </div>

      {showAppealForm && (
        <form className={styles.appealForm} onSubmit={(e) => void handleAppeal(e)}>
          <label className={styles.appealLabel} htmlFor="appeal-reason">
            {t("appealReasonLabel")}
          </label>
          <textarea
            id="appeal-reason"
            className={styles.appealTextarea}
            value={appealReason}
            onChange={(e) => setAppealReason(e.target.value)}
            rows={3}
            minLength={20}
            placeholder={t("appealPlaceholder")}
            required
          />
          <button
            type="submit"
            className={styles.appealSubmitBtn}
            disabled={appealing || appealReason.trim().length < 20}
          >
            {appealing ? t("sending") : t("submitAppeal")}
          </button>
        </form>
      )}
    </div>
  );
}
