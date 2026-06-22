import React from "react";
import styles from "./EmptyState.module.css";

interface Props {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = "◎", title, body, action }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon}</div>
      <p className={styles.title}>{title}</p>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
