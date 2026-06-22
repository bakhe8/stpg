'use client';

import React from 'react';
import styles from './PlatformSupportBanner.module.css';
import { useTranslations } from 'next-intl';

interface Props {
  operatorName: string;
  operatorRole: string;
}

export default function PlatformSupportBanner({
  operatorName,
  operatorRole,
}: Props) {
  const t = useTranslations('platformSupportBanner');
  return (
    <div className={styles.banner} role="alert" aria-live="polite">
      <span className={styles.icon}>⚠</span>
      <span>
        {t('supportModeMessage', { operatorName, operatorRole })}
      </span>
    </div>
  );
}
