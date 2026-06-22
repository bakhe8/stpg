import React from "react";
import styles from "./StatusBadge.module.css";
import { useTranslations } from "next-intl";

type StatusKey =
  // عضوية
  | "active" | "inactive" | "pending" | "rejected"
  // مدفوعات
  | "paid" | "overdue" | "partial" | "awaiting_review"
  // قرارات / نزاعات
  | "approved" | "open" | "under_mediation" | "escalated" | "resolved" | "closed" | "cancelled"
  // منصة
  | "suspended" | "read_only" | "pending_review"
  // عام
  | "draft" | "archived";

const CONFIG: Record<StatusKey, { label: string; variant: string }> = {
  // عضوية
  active:          { label: "active",               variant: "green" },
  inactive:        { label: "inactive",            variant: "gray" },
  pending:         { label: "pending",   variant: "yellow" },
  rejected:        { label: "rejected",              variant: "red" },
  // مدفوعات
  paid:            { label: "paid",              variant: "green" },
  overdue:         { label: "overdue",              variant: "red" },
  partial:         { label: "partial",               variant: "yellow" },
  awaiting_review: { label: "awaiting_review",  variant: "yellow" },
  // قرارات / نزاعات
  approved:        { label: "approved",              variant: "green" },
  open:            { label: "open",              variant: "yellow" },
  under_mediation: { label: "under_mediation",        variant: "blue" },
  escalated:       { label: "escalated",            variant: "red" },
  resolved:        { label: "resolved",              variant: "green" },
  closed:          { label: "closed",               variant: "gray" },
  cancelled:       { label: "cancelled",               variant: "gray" },
  // منصة
  suspended:       { label: "suspended",              variant: "red" },
  read_only:       { label: "read_only",          variant: "blue" },
  pending_review:  { label: "pending_review",       variant: "yellow" },
  // عام
  draft:           { label: "draft",              variant: "gray" },
  archived:        { label: "archived",             variant: "gray" },
};

interface Props {
  status: StatusKey | string;
  customLabel?: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, customLabel, size = "md" }: Props) {
  const t = useTranslations("status");
  const key = status.toLowerCase().replace(/ /g, "_") as StatusKey;
  const cfg = CONFIG[key];
  const variant = cfg?.variant ?? "gray";
  const displayLabel = customLabel ?? (cfg ? t(cfg.label) : status);

  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${size === "sm" ? styles.sm : ""}`}
    >
      {displayLabel}
    </span>
  );
}
