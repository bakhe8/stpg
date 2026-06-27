'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEntities } from '../../../lib/api/entities';
import { getReviewTasksForEntities } from '../../../lib/api/review-center';
import { ReviewTask } from '../../../lib/models/ReviewTask';
import { ADMIN_ROLES, filterEntitiesByRoles } from '../../../lib/access';
import type { Translator } from '../../../lib/i18n';
import { useTranslations } from 'next-intl';
import styles from './review-center.module.css';

export default function ReviewCenterPage() {
  const t = useTranslations('reviewCenter');
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        const allEntities = await getEntities();
        const adminEntities = filterEntitiesByRoles(allEntities, ADMIN_ROLES);
        
        if (adminEntities.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const pendingTasks = await getReviewTasksForEntities(adminEntities, t);
        setTasks(pendingTasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorFetching'));
      } finally {
        setLoading(false);
      }
    }
    void loadTasks();
  }, [t]);

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>⚠ {error}</p>
      </div>
    );
  }

  const urgentTasks = tasks.filter(t => t.urgency === 'HIGH');
  const normalTasks = tasks.filter(t => t.urgency !== 'HIGH');

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <p className={styles.pageSubtitle}>{t('subtitle')}</p>
      </header>

      {tasks.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>✓</div>
          <p>{t('empty')}</p>
        </div>
      ) : (
        <div className={styles.taskList}>
          {urgentTasks.length > 0 && (
            <div className={styles.taskGroup}>
              <h2 className={styles.groupTitle}>{t('urgentGroup', { count: urgentTasks.length })}</h2>
              {urgentTasks.map(task => <TaskCard key={task.id} task={task} t={t} />)}
            </div>
          )}
          
          {normalTasks.length > 0 && (
            <div className={styles.taskGroup}>
              <h2 className={styles.groupTitle}>{t('normalGroup', { count: normalTasks.length })}</h2>
              {normalTasks.map(task => <TaskCard key={task.id} task={task} t={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, t }: { task: ReviewTask, t: Translator }) {
  const getIcon = () => {
    switch (task.type) {
      case 'JOIN_REQUEST': return '👋';
      case 'PAYMENT_RECEIPT': return '💰';
      case 'DISBURSEMENT_APPROVAL': return '📤';
      case 'DISPUTE_REVIEW': return '⚖️';
      case 'RULE_CHANGE_REQUEST': return '⚙️';
      default: return '📄';
    }
  };

  return (
    <div className={`${styles.taskCard} ${task.urgency === 'HIGH' ? styles.urgentCard : ''}`}>
      <div className={styles.taskIcon}>{getIcon()}</div>
      <div className={styles.taskBody}>
        <div className={styles.taskHeader}>
          <span className={styles.taskTitle}>{task.title}</span>
          <span className={styles.taskContext}>
            {task.context?.entityName} {task.context?.walletName ? `› ${task.context.walletName}` : ''}
          </span>
        </div>
        {task.subtitle && <div className={styles.taskSubtitle}>{task.subtitle}</div>}
        <div className={styles.taskMeta}>
          <span>{t('by')} {task.requestedBy.name}</span>
          <span>·</span>
          <span>{new Date(task.createdAt).toLocaleDateString('ar-SA')}</span>
        </div>
      </div>
      <div className={styles.taskActions}>
        <Link href={task.actionUrl} className={styles.actionBtn}>
          {t('detailsAndDecision')}
        </Link>
      </div>
    </div>
  );
}
