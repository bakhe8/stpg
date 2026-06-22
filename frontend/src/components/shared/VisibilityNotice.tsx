import React from "react";
import styles from "./VisibilityNotice.module.css";
import { useTranslations } from "next-intl";

type VisibilityLevel =
  | "PublicToMembers"
  | "VisibleToParticipants"
  | "VisibleToCommittee"
  | "VisibleToAuditor"
  | "HiddenSensitive"
  | "AggregatedOnly";

const LEVEL_CONFIG: Record<
  VisibilityLevel,
  { icon: string; label: string; color: "blue" | "amber" | "red" | "gray" }
> = {
  PublicToMembers:      { icon: "◎", label: "PublicToMembers", color: "blue" },
  VisibleToParticipants:{ icon: "◑", label: "VisibleToParticipants", color: "blue" },
  VisibleToCommittee:   { icon: "◐", label: "VisibleToCommittee", color: "amber" },
  VisibleToAuditor:     { icon: "◔", label: "VisibleToAuditor", color: "amber" },
  HiddenSensitive:      { icon: "●", label: "HiddenSensitive", color: "red" },
  AggregatedOnly:       { icon: "◌", label: "AggregatedOnly", color: "gray" },
};

interface Props {
  level: VisibilityLevel;
  reason?: string;
  compact?: boolean;
}

export default function VisibilityNotice({ level, reason, compact = false }: Props) {
  const t = useTranslations("visibility");
  const cfg = LEVEL_CONFIG[level];

  return (
    <div className={`${styles.notice} ${styles[cfg.color]} ${compact ? styles.compact : ""}`}>
      <span className={styles.icon}>{cfg.icon}</span>
      <div className={styles.body}>
        <span className={styles.label}>{t(cfg.label)}</span>
        {reason && <span className={styles.reason}>{reason}</span>}
      </div>
    </div>
  );
}
