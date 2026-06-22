import React from 'react';
import styles from './RuleSummaryPanel.module.css';
import { useTranslations } from 'next-intl';

interface RuleSummaryPanelProps {
  title?: string;
  summary: string;
  icon?: string;
}

export default function RuleSummaryPanel({
  title,
  summary,
  icon = '💡',
}: RuleSummaryPanelProps) {
  const t = useTranslations('governance');
  const finalTitle = title || t('ruleExplanation');

  return (
    <div className={styles.panel}>
      <div className={styles.icon}>{icon}</div>
      <div>
        <h4 className={styles.title}>{finalTitle}</h4>
        <p className={styles.summary}>{summary}</p>
      </div>
    </div>
  );
}
