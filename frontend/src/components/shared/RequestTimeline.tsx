import React from "react";
import styles from "./RequestTimeline.module.css";

export interface TimelineStep {
  label: string;
  sublabel?: string;
  at?: string | null;
  by?: string | null;
  done: boolean;
  active?: boolean;
  failed?: boolean;
}

interface Props {
  steps: TimelineStep[];
  compact?: boolean;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ar-SA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RequestTimeline({ steps, compact = false }: Props) {
  return (
    <div className={`${styles.timeline} ${compact ? styles.compact : ""}`}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const cls = step.failed
          ? styles.stepFailed
          : step.done
          ? styles.stepDone
          : step.active
          ? styles.stepActive
          : styles.stepPending;

        return (
          <div key={i} className={styles.stepRow}>
            {/* connector line above (except first) */}
            <div className={styles.lineCol}>
              {i > 0 && (
                <div
                  className={`${styles.connector} ${
                    steps[i - 1].done ? styles.connectorDone : styles.connectorPending
                  }`}
                />
              )}
              <div className={`${styles.dot} ${cls}`}>
                {step.failed ? "✕" : step.done ? "✓" : step.active ? "◎" : "○"}
              </div>
              {!isLast && (
                <div
                  className={`${styles.connector} ${
                    step.done ? styles.connectorDone : styles.connectorPending
                  }`}
                />
              )}
            </div>

            {/* content */}
            <div className={styles.content}>
              <span
                className={`${styles.label} ${
                  step.active ? styles.labelActive : step.done ? styles.labelDone : styles.labelPending
                }`}
              >
                {step.label}
              </span>
              {step.sublabel && (
                <span className={styles.sublabel}>{step.sublabel}</span>
              )}
              {(step.at || step.by) && (
                <span className={styles.meta}>
                  {step.at ? fmt(step.at) : ""}
                  {step.at && step.by ? " · " : ""}
                  {step.by ?? ""}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
