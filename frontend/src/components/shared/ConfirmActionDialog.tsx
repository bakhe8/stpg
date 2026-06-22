import React from "react";
import styles from "./ConfirmActionDialog.module.css";
import { useTranslations } from "next-intl";

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const t = useTranslations("common");
  const finalCancelLabel = cancelLabel || t("cancel");

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.icon}>{danger ? "⚠" : "?"}</div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>
            {finalCancelLabel}
          </button>
          <button
            className={`${styles.confirmBtn} ${danger ? styles.confirmDanger : styles.confirmSafe}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t("executing") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
