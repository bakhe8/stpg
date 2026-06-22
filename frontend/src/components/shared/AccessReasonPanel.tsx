import React from "react";
import styles from "./AccessReasonPanel.module.css";
import { useTranslations } from "next-intl";

type ReasonCode =
  | "NOT_MEMBER"
  | "NOT_SUBSCRIBED"
  | "WAITING_PERIOD"
  | "INSUFFICIENT_ROLE"
  | "SUSPENDED"
  | "PENDING_REVIEW"
  | "UNKNOWN";

interface Props {
  reason?: ReasonCode;
  detail?: string;
  daysRemaining?: number;
  requiredRole?: string;
}

const REASON_ICONS: Record<ReasonCode, string> = {
  NOT_MEMBER: "🚫",
  NOT_SUBSCRIBED: "📋",
  WAITING_PERIOD: "⏳",
  INSUFFICIENT_ROLE: "🔒",
  SUSPENDED: "⛔",
  PENDING_REVIEW: "🕐",
  UNKNOWN: "ℹ",
};

function inferReason(errorMessage: string): ReasonCode {
  const msg = errorMessage.toLowerCase();
  if (msg.includes("not a member") || msg.includes("لست عضواً")) return "NOT_MEMBER";
  if (msg.includes("not subscribed") || msg.includes("subscription")) return "NOT_SUBSCRIBED";
  if (msg.includes("waiting") || msg.includes("eligibility") || msg.includes("انتظار")) return "WAITING_PERIOD";
  if (msg.includes("role") || msg.includes("permission") || msg.includes("forbidden")) return "INSUFFICIENT_ROLE";
  if (msg.includes("suspended") || msg.includes("موقوف")) return "SUSPENDED";
  if (msg.includes("pending") || msg.includes("review")) return "PENDING_REVIEW";
  return "UNKNOWN";
}

export default function AccessReasonPanel({ reason, detail, daysRemaining, requiredRole }: Props) {
  const t = useTranslations("accessReason");
  const code: ReasonCode = reason ?? (detail ? inferReason(detail) : "UNKNOWN");
  const icon = REASON_ICONS[code];

  const getTitle = () => {
    switch (code) {
      case "NOT_MEMBER": return t("notMemberTitle");
      case "NOT_SUBSCRIBED": return t("notSubscribedTitle");
      case "WAITING_PERIOD": return t("waitingPeriodTitle");
      case "INSUFFICIENT_ROLE": return t("insufficientRoleTitle");
      case "SUSPENDED": return t("suspendedTitle");
      case "PENDING_REVIEW": return t("pendingReviewTitle");
      default: return t("unknownTitle");
    }
  };

  const getBody = () => {
    switch (code) {
      case "NOT_MEMBER": return t("notMemberBody");
      case "NOT_SUBSCRIBED": return t("notSubscribedBody");
      case "WAITING_PERIOD": return daysRemaining ? t("waitingPeriodBodyDays", { daysRemaining }) : t("waitingPeriodBody");
      case "INSUFFICIENT_ROLE": return requiredRole ? t("insufficientRoleBodyRole", { requiredRole }) : t("insufficientRoleBody");
      case "SUSPENDED": return t("suspendedBody");
      case "PENDING_REVIEW": return t("pendingReviewBody");
      default: return detail ?? t("unknownBody");
    }
  };

  return (
    <div className={styles.panel}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.content}>
        <div className={styles.title}>{getTitle()}</div>
        <div className={styles.body}>{getBody()}</div>
      </div>
    </div>
  );
}

export { inferReason, type ReasonCode };
