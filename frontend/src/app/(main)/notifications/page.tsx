'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  getMyNotifications,
  getNotificationRecipientMatrix,
  markAllRead,
  markRead,
  Notification,
  NotificationRecipientMatrixRow,
} from '../../../lib/api/notifications';
import styles from './notifications.module.css';

const TYPE_ICONS: Record<string, string> = {
  VOTE_REQUIRED: '⚖',
  PAYMENT_CONFIRMED: '✓',
  APPEAL_UPDATE: '⚑',
  POLICY_CHANGED: '📋',
  GOVERNANCE_CHANGED: '⌁',
  RELATIONSHIP_REQUEST: '↔',
  PAYMENT_DUE: '◷',
  CAMPAIGN_EXPIRED: '◇',
  MEMBERSHIP_APPLICATION_APPROVED: '✅',
  MEMBERSHIP_APPLICATION_REJECTED: '✗',
  PLATFORM_ACCESS: '🔒',
  GENERAL: '🔔',
};

const MATRIX_EVENT_KEYS: Record<string, string> = {
  DECISION_CREATED: 'matrixEventDecisionCreated',
  PAYMENT_CONFIRMED: 'matrixEventPaymentConfirmed',
  PAYMENT_DUE: 'matrixEventPaymentDue',
  APPEAL_FILED: 'matrixEventAppealFiled',
  POLICY_CHANGED: 'matrixEventPolicyChanged',
  GOVERNANCE_CHANGED: 'matrixEventGovernanceChanged',
  RELATIONSHIP_REQUESTED: 'matrixEventRelationshipRequested',
  RELATIONSHIP_APPROVED: 'matrixEventRelationshipApproved',
  MEMBERSHIP_APPLICATION_APPROVED: 'matrixEventMembershipApproved',
  MEMBERSHIP_APPLICATION_REJECTED: 'matrixEventMembershipRejected',
  CAMPAIGN_EXPIRED: 'matrixEventCampaignExpired',
  PLATFORM_ACCESS: 'matrixEventPlatformAccess',
};

const MATRIX_RECIPIENT_KEYS: Record<string, string> = {
  DECISION_SCOPE: 'matrixRecipientsDecisionScope',
  PAYMENT_OWNER: 'matrixRecipientsPaymentOwner',
  ENTITY_ADMINS_FOUNDERS: 'matrixRecipientsEntityAdminsFounders',
  ACTIVE_MEMBERS_EXCEPT_ACTOR: 'matrixRecipientsActiveMembersExceptActor',
  AFFECTED_SUBSCRIBERS: 'matrixRecipientsAffectedSubscribers',
  TARGET_ENTITY_ADMINS_FOUNDERS: 'matrixRecipientsTargetEntityAdminsFounders',
  SOURCE_ENTITY_ADMINS_FOUNDERS: 'matrixRecipientsSourceEntityAdminsFounders',
  APPLICANT: 'matrixRecipientsApplicant',
};

const MATRIX_DELIVERY_KEYS: Record<string, string> = {
  IN_APP: 'matrixDeliveryInApp',
  IN_APP_AND_ACTIVE_PUSH: 'matrixDeliveryInAppAndPush',
};

function getNotificationHref(notification: Notification): string | null {
  const { targetId, targetType, type } = notification;

  if (targetType === 'DECISION' && targetId) return `/decisions#decision-${targetId}`;
  if (targetType === 'WALLET' && targetId) return `/wallets/${targetId}`;
  if (targetType === 'GOVERNANCE_PATH' && targetId) return `/paths/${targetId}`;
  if (targetType === 'ENTITY' && targetId) return `/entities/${targetId}`;
  if (targetType === 'SUBSCRIPTION') return '/finance';
  if (targetType === 'APPEAL') return '/decisions';
  if (targetType === 'ENTITY_RELATIONSHIP') return '/entities';
  if (type === 'VOTE_REQUIRED') return '/decisions';
  if (type === 'PAYMENT_CONFIRMED' || type === 'PAYMENT_DUE') return '/finance';
  if (type === 'MEMBERSHIP_APPLICATION_APPROVED' && targetId) return `/entities/${targetId}`;
  if (type === 'MEMBERSHIP_APPLICATION_REJECTED') return '/entities';
  if (type === 'PLATFORM_ACCESS' && targetId) return `/entities/${targetId}`;
  return null;
}

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recipientMatrix, setRecipientMatrix] = useState<
    NotificationRecipientMatrixRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [nextNotifications, nextMatrix] = await Promise.all([
        getMyNotifications(onlyUnread),
        getNotificationRecipientMatrix().catch(
          () => [] as NotificationRecipientMatrixRow[],
        ),
      ]);
      setNotifications(nextNotifications);
      setRecipientMatrix(nextMatrix);
    }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [onlyUnread]);

  function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    void markRead(id).catch(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    });
  }

  async function handleMarkAll() {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>{t('title')}</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
        <div className={styles.actions}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={(e) => setOnlyUnread(e.target.checked)}
            />
            {t('unreadOnly')}
          </label>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={handleMarkAll}>
              {t('markAllRead')}
            </button>
          )}
        </div>
      </div>

      {recipientMatrix.length > 0 && (
        <section className={styles.matrixCard}>
          <div className={styles.matrixHeader}>
            <h2 className={styles.matrixTitle}>{t('matrixTitle')}</h2>
            <p className={styles.matrixHint}>{t('matrixHint')}</p>
          </div>
          <div className={styles.matrixList}>
            {recipientMatrix.map((row) => (
              <div key={row.id} className={styles.matrixRow}>
                <div>
                  <span className={styles.matrixLabel}>{t('matrixEvent')}</span>
                  <strong>
                    {t(MATRIX_EVENT_KEYS[row.event] ?? 'matrixEventFallback', {
                      event: row.event,
                    })}
                  </strong>
                </div>
                <div>
                  <span className={styles.matrixLabel}>
                    {t('matrixRecipients')}
                  </span>
                  <strong>
                    {t(
                      MATRIX_RECIPIENT_KEYS[row.recipientRule] ??
                        'matrixRecipientsFallback',
                      { rule: row.recipientRule },
                    )}
                  </strong>
                </div>
                <div>
                  <span className={styles.matrixLabel}>{t('matrixTarget')}</span>
                  <strong>{row.notificationType} · {row.targetType}</strong>
                </div>
                <div>
                  <span className={styles.matrixLabel}>
                    {t('matrixDelivery')}
                  </span>
                  <strong>
                    {t(
                      MATRIX_DELIVERY_KEYS[row.delivery] ??
                        'matrixDeliveryFallback',
                      { delivery: row.delivery },
                    )}
                  </strong>
                </div>
                <div>
                  <span className={styles.matrixLabel}>{t('matrixSource')}</span>
                  <strong>{row.source}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <div className={styles.centered}><div className={styles.spinner} /></div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>{t('empty')}</div>
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => {
            const href = getNotificationHref(n);
            const content = (
              <>
              <div className={styles.notifIcon}>{TYPE_ICONS[n.type] ?? '🔔'}</div>
              <div className={styles.notifBody}>
                <div className={styles.notifTitle}>{n.title}</div>
                <div className={styles.notifText}>{n.body}</div>
                <div className={styles.notifDate}>{new Date(n.createdAt).toLocaleString('ar-SA')}</div>
              </div>
              {!n.isRead && <div className={styles.unreadDot} />}
              {href && <span className={styles.notifAction}>{t('openRelated')}</span>}
              </>
            );
            const isMembershipType = n.type === 'MEMBERSHIP_APPLICATION_APPROVED' || n.type === 'MEMBERSHIP_APPLICATION_REJECTED';
            const className = `${styles.notifCard} ${!n.isRead ? styles.unread : ''} ${href ? styles.linked : ''} ${isMembershipType ? (n.type === 'MEMBERSHIP_APPLICATION_APPROVED' ? styles.membershipApproved : styles.membershipRejected) : ''}`;

            return href ? (
              <Link
                key={n.id}
                href={href}
                className={className}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
              >
                {content}
              </Link>
            ) : (
              <button
                key={n.id}
                type="button"
                className={className}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
