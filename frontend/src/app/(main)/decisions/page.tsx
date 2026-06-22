'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getDecisions, castVote, retryExecution, Decision } from '../../../lib/api/decisions';
import styles from './decisions.module.css';
import RuleSummaryPanel from '../../../components/Governance/RuleSummaryPanel';
import AccessReasonPanel, { inferReason } from '../../../components/shared/AccessReasonPanel';

function isAccessError(msg: string) {
  const lower = msg.toLowerCase();
  return lower.includes('forbidden') || lower.includes('unauthorized') || lower.includes('403') ||
    lower.includes('not a member') || lower.includes('not subscribed') || lower.includes('suspended') ||
    lower.includes('waiting') || lower.includes('role') || lower.includes('permission');
}

function getDecisionReason(type: string, t: any) {
  switch (type) {
    case "EXPEL_MEMBER": return t("reasonEviction");
    case "ACCEPT_MEMBER": return t("reasonMembership");
    case "DISBURSE_FUNDS": return t("reasonDisbursement");
    case "MODIFY_SUBSCRIPTION": return t("reasonPolicy");
    case "MODIFY_GOVERNANCE": return t("reasonGovernance");
    default: return t("reasonDefault");
  }
}

function isDecisionOpen(decision: Decision) {
  return decision.status === 'OPEN' && new Date(decision.closesAt) >= new Date();
}

function DecisionCard({ decision, onRefresh }: { decision: Decision; onRefresh: () => void }) {
  const t = useTranslations('decisions');
  const tCommon = useTranslations('common');
  const tMember = useTranslations('member');
  const closesAt = new Date(decision.closesAt);

  const DECISION_TYPE_LABELS: Record<string, string> = {
    CREATE_WALLET: t('typeCreateWallet'),
    CREATE_PATH: t('typeCreatePath'),
    DISBURSE_FUNDS: t('typeDisburseFunds'),
    MODIFY_SUBSCRIPTION: t('typeModifySubscription'),
    MODIFY_GOVERNANCE: t('typeModifyGovernance'),
    TRANSFER_BALANCE: t('typeTransferBalance'),
    ACCEPT_MEMBER: t('typeAcceptMember'),
    EXPEL_MEMBER: t('typeExpelMember'),
    OPEN_DISPUTE: t('typeOpenDispute'),
    CLOSE_WALLET: t('typeCloseWallet'),
    FREEZE_WALLET: t('typeFreezeWallet'),
    MERGE_PATHS: t('typeMergePaths'),
  };
  const isOpen = isDecisionOpen(decision);

  const STATUS_LABELS: Record<string, string> = {
    OPEN: t('statusOpen'),
    CLOSED: t('statusClosed'),
    AUTO_CLOSED: t('statusAutoClosed'),
    APPEALED: t('statusAppealed'),
    EXPIRED: t('statusExpired'),
  };

  const EXECUTION_STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: t('execNotStarted'),
    PARTIAL: t('execPartial'),
    COMPLETED: t('execCompleted'),
    REVERSED: t('execReversed'),
    FAILED: t('execFailed'),
  };

  const VOTE_LABELS: Record<string, string> = {
    APPROVE: t('voteApprove'),
    REJECT: t('voteReject'),
    ABSTAIN: t('voteAbstain'),
  };

  const [voting, setVoting] = useState(false);
  const [choice, setChoice] = useState<'APPROVE' | 'REJECT' | 'ABSTAIN'>('APPROVE');
  const [notes, setNotes] = useState('');
  const [coiDeclared, setCoiDeclared] = useState(false);

  const [confirmRetry, setConfirmRetry] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // أنواع القرارات التي قد تحمل تعارض مصالح
  const COI_TYPES = new Set(['EXPEL_MEMBER', 'ACCEPT_MEMBER', 'DISBURSE_FUNDS', 'MODIFY_SUBSCRIPTION']);
  const hasPotentialCoI = COI_TYPES.has(decision.decisionType);

  function declareCoI() {
    setCoiDeclared(true);
    setChoice('ABSTAIN');
    setNotes(t('coiDeclareNote'));
    setVoting(true);
  }

  async function submitVote() {
    setLoading(true);
    setError(null);
    try {
      await castVote(decision.id, choice, notes || undefined);
      setVoting(false);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('voteFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function submitRetry() {
    setLoading(true);
    setError(null);
    try {
      await retryExecution(decision.id);
      setConfirmRetry(false);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('retryFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.card} id={`decision-${decision.id}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{decision.title}</div>
        <div className={styles.cardHeaderFlex}>
          <div
            className={`${styles.statusBadge} ${isOpen ? styles.statusOpen : styles.statusClosed}`}
          >
            {STATUS_LABELS[decision.status] ?? decision.status}
          </div>
          {decision.executionStatus && (
            <div
              className={`${styles.statusBadge} ${
                decision.executionStatus === 'COMPLETED' ? styles.execCompleted :
                decision.executionStatus === 'FAILED' ? styles.execFailed : styles.execPending
              }`}
            >
              {t('executionLabel')} {EXECUTION_STATUS_LABELS[decision.executionStatus] ?? decision.executionStatus}
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('typeLabel')}</span>
          <span>{DECISION_TYPE_LABELS[decision.decisionType] ?? decision.decisionType}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('votesLabel')}</span>
          <span>{t('votesCount', { count: decision._count?.votes ?? 0 })}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('expiresLabel')}</span>
          <span>{closesAt.toLocaleDateString('ar-SA')}</span>
        </span>
      </div>

      {error && (
        isAccessError(error)
          ? <AccessReasonPanel reason={inferReason(error)} detail={error} />
          : <div className={styles.error}>{error}</div>
      )}

      
      {isOpen && (
        <RuleSummaryPanel
          title={t("whyVoteTitle")}
          summary={getDecisionReason(decision.decisionType, t)}
          icon="📋"
        />
      )}

      
      {isOpen && hasPotentialCoI && !voting && (
        <div className={styles.coiBanner}>
          <span className={styles.coiIcon}>⚖</span>
          <div className={styles.coiBody}>
            <span className={styles.coiTitle}>{t('coiTitle')}</span>
            <span className={styles.coiNote}>
              {t('coiNote')}
            </span>
          </div>
          <button className={styles.coiDeclareBtn} onClick={declareCoI}>
            {t('coiDeclareBtn')}
          </button>
        </div>
      )}

      {isOpen && decision.voteType === 'ONE_FAMILY_ONE_VOTE' && (
        <div className={styles.householdVoteBanner}>
          <span className={styles.coiIcon}>⚠️</span>
          <span>{tMember('familyVoteWarning')}</span>
        </div>
      )}

      {isOpen && !voting && (
        <button
          className={styles.voteBtn}
          onClick={() => setVoting(true)}
        >
          {t('voteBtn')}
        </button>
      )}

      {isOpen && voting && (
        <div className={styles.voteEditor}>
          {coiDeclared && (
            <div className={styles.coiActiveNote}>
              ✓ {t('coiActiveNote')}
            </div>
          )}
          <div className={styles.voteOptions}>
            {(['APPROVE', 'REJECT', 'ABSTAIN'] as const).map((c) => (
              <button
                key={c}
                className={`${styles.voteOption} ${choice === c ? styles.voteOptionSelected : ''} ${
                  choice === c ? (
                    c === 'APPROVE' ? styles.voteApprove : c === 'REJECT' ? styles.voteReject : styles.voteAbstain
                  ) : ''
                }`}
                onClick={() => setChoice(c)}
              >
                {VOTE_LABELS[c]}
              </button>
            ))}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor={`notes-${decision.id}`}>{t('notesLabel')}</label>
            <textarea
              id={`notes-${decision.id}`}
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className={styles.voteActions}>
            <button onClick={submitVote} disabled={loading} className={styles.submitVote}>
              {loading ? '...' : t('confirmVote')}
            </button>
            <button onClick={() => setVoting(false)} disabled={loading} className={styles.ghostAction}>
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      )}

      {!isOpen && decision.executionStatus === 'FAILED' && !confirmRetry && (
        <button
          className={`${styles.voteBtn} ${styles.btnRetry}`}
          onClick={() => setConfirmRetry(true)}
        >
          {t('retryBtn')}
        </button>
      )}

      {confirmRetry && (
        <div className={styles.confirmPanel}>
          <span className={styles.confirmText}>{t('retryConfirm')}</span>
          <button onClick={submitRetry} disabled={loading} className={styles.confirmDanger}>
            {loading ? '...' : tCommon('yes')}
          </button>
          <button onClick={() => setConfirmRetry(false)} disabled={loading} className={styles.ghostAction}>
            {tCommon('no')}
          </button>
        </div>
      )}
    </div>
  );
}

// VoteModal was removed to embrace inline confirmations

export default function DecisionsPage() {
  const t = useTranslations('decisions');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entityId = searchParams.get('entityId');
      if (entityId && typeof window !== "undefined") {
        localStorage.setItem("currentEntityId", entityId);
      }
      setDecisions(await getDecisions());
    } catch (e) {
      setError(e instanceof Error ? e.message : t('generalError'));
    } finally {
      setLoading(false);
    }
  }, [t, searchParams]);

  // handleRetry is now handled inline inside DecisionCard

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || typeof window === 'undefined' || !window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [decisions, loading]);

  const openCount = decisions.filter(isDecisionOpen).length;
  const closedCount = decisions.length - openCount;
  const visibleDecisions = decisions.filter((decision) => {
    if (filter === 'OPEN') return isDecisionOpen(decision);
    if (filter === 'CLOSED') return !isDecisionOpen(decision);
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <div className={styles.filters} aria-label={t('filterLabel')}>
          {([
            ['ALL', t('filterAll', { count: decisions.length })],
            ['OPEN', t('filterOpen', { count: openCount })],
            ['CLOSED', t('filterClosed', { count: closedCount })],
          ] as const).map(([value, label]) => {
            const isPressed = filter === value;
            return isPressed ? (
              <button
                key={value}
                type="button"
                className={`${styles.filterBtn} ${styles.filterActive}`}
                aria-pressed="true"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ) : (
              <button
                key={value}
                type="button"
                className={styles.filterBtn}
                aria-pressed="false"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.centered}><div className={styles.spinner} /></div>
      ) : decisions.length === 0 ? (
        <div className={styles.empty}>{t('empty')}</div>
      ) : visibleDecisions.length === 0 ? (
        <div className={styles.empty}>{t('filterEmpty')}</div>
      ) : (
        <div className={styles.list}>
          {visibleDecisions.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
