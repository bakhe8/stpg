import React from "react";
import styles from "./PaymentMatchPanel.module.css";
import { useTranslations } from "next-intl";

interface Props {
  required: number;
  submitted: number;
  currency?: string;
  period?: string;
}

function fmt(n: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

export default function PaymentMatchPanel({ required, submitted, currency = "SAR", period }: Props) {
  const t = useTranslations("paymentMatch");
  const diff = submitted - required;
  const isMatch = Math.abs(diff) < 0.01;
  const isOver = diff > 0.01;
  const isUnder = diff < -0.01;

  return (
    <div className={`${styles.panel} ${isMatch ? styles.match : isOver ? styles.over : styles.under}`}>
      <div className={styles.header}>
        <span className={styles.icon}>{isMatch ? "✓" : isUnder ? "⚠" : "↑"}</span>
        <span className={styles.title}>
          {isMatch ? t("match") : isUnder ? t("under") : t("over")}
        </span>
        {period && <span className={styles.period}>{period}</span>}
      </div>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t("requiredByRule")}</span>
          <span className={styles.rowValue}>{fmt(required, currency)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{t("submittedAmount")}</span>
          <span className={`${styles.rowValue} ${styles.submitted}`}>{fmt(submitted, currency)}</span>
        </div>
        {!isMatch && (
          <div className={`${styles.row} ${styles.diffRow}`}>
            <span className={styles.rowLabel}>{t("difference")}</span>
            <span className={`${styles.rowValue} ${isUnder ? styles.negative : styles.positive}`}>
              {isOver ? "+" : ""}{fmt(diff, currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
