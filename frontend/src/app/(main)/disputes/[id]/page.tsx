"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getDispute,
  resolveDispute,
  escalateDispute,
  Dispute,
} from "../../../../lib/api/disputes";
import styles from "./dispute-detail.module.css";
import { DISPUTE_TYPE_KEYS } from "../../../../lib/enum-labels";
import RequestTimeline, { TimelineStep } from "../../../../components/shared/RequestTimeline";
import RuleSummaryPanel from "../../../../components/Governance/RuleSummaryPanel";

function buildDisputeTimeline(d: Dispute, t: any): TimelineStep[] {
  const isResolved = d.status === "RESOLVED" || d.status === "CLOSED";
  const isEscalated = d.status === "ESCALATED";
  const isMediation = d.status === "UNDER_MEDIATION";

  return [
    { label: t("timelineOpened"), at: d.createdAt, done: true },
    {
      label: t("timelineMediation"),
      done: isResolved || isEscalated,
      active: isMediation,
    },
    isEscalated
      ? { label: t("timelineEscalated"), done: true, failed: true }
      : {
          label: isResolved ? t("timelineClosed") : t("statusClosed"),
          at: d.closedAt ?? undefined,
          done: isResolved,
          active: !isResolved && !isEscalated,
        },
  ];
}

export default function DisputeDetailPage() {
  const t = useTranslations("disputes");
  const tEnums = useTranslations("enums");

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> =
    {
      OPEN: { label: t('statusOpen'), color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
      UNDER_MEDIATION: {
        label: t('statusMediation'),
        color: "var(--accent-primary)",
        bg: "var(--accent-soft)",
      },
      ESCALATED: { label: t('statusEscalated'), color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
      RESOLVED: { label: t('statusResolved'), color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
      CLOSED: { label: t('statusClosed'), color: "var(--text-secondary)", bg: "var(--surface-muted)" },
    };

  const { id } = useParams<{ id: string }>();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [resolveForm, setResolveForm] = useState({
    status: "RESOLVED",
    resolution: "",
    arbitratorNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDispute(id)
      .then(setDispute)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const updated = await resolveDispute(id, resolveForm);
      setDispute(updated);
      setMsg(t('updateSuccess'));
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('openFailed')}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEscalate() {
    setSubmitting(true);
    setMsg(null);
    try {
      const updated = await escalateDispute(id);
      setDispute(updated);
      setMsg(t('escalateSuccess'));
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : t('openFailed')}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  if (!dispute)
    return <div className={styles.error}>{t('notFound')}</div>;

  const s = STATUS_MAP[dispute.status] ?? {
    label: dispute.status,
    color: "var(--text-secondary)",
    bg: "rgba(100,116,139,0.15)",
  };
  const canAct =
    dispute.status === "OPEN" || dispute.status === "UNDER_MEDIATION";

  return (
    <div className={styles.page}>
      <Link href="/disputes" className={styles.back}>
        {t('detailBack')}
      </Link>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{dispute.title}</h1>
          <div
            className={styles.badge}
            data-status={dispute.status}
          >
            {s.label}
          </div>
        </div>
        <div className={styles.meta}>
          <span>
            {DISPUTE_TYPE_KEYS[dispute.type]
              ? tEnums(DISPUTE_TYPE_KEYS[dispute.type] as Parameters<typeof tEnums>[0])
              : dispute.type}
          </span>
          <span>·</span>
          <span>{new Date(dispute.createdAt).toLocaleDateString("ar-SA")}</span>
        </div>
      </div>

      {msg && (
        <div
          className={`${styles.msg} ${msg.startsWith("✓") ? styles.success : styles.msgError}`}
        >
          {msg}
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>{t('detailsTitle')}</div>
          <p className={styles.description}>{dispute.description}</p>
          {dispute.resolution && (
            <div className={styles.resolution}>
              <div className={styles.resolutionLabel}>{t('decisionLabel')}</div>
              <p>{dispute.resolution}</p>
            </div>
          )}
          <div className={styles.timelineWrapper}>
            <RequestTimeline steps={buildDisputeTimeline(dispute, t)} compact />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>{t('partiesTitle')}</div>
          <div className={styles.partyRow}>
            <span className={styles.partyLabel}>{t('initiator')}</span>
            <span>{dispute.initiator?.name ?? dispute.initiatorId}</span>
          </div>
          {dispute.respondent && (
            <div className={styles.partyRow}>
              <span className={styles.partyLabel}>{t('respondent')}</span>
              <span>{dispute.respondent.name}</span>
            </div>
          )}
          {dispute.arbitrator && (
            <div className={styles.partyRow}>
              <span className={styles.partyLabel}>{t('arbitrator')}</span>
              <span>{dispute.arbitrator.name}</span>
            </div>
          )}
          {dispute.deadline && (
            <div className={styles.partyRow}>
              <span className={styles.partyLabel}>{t('deadlineDetail')}</span>
              <span>
                {new Date(dispute.deadline).toLocaleDateString("ar-SA")}
              </span>
            </div>
          )}
        </div>
      </div>

      {canAct && (
        <RuleSummaryPanel
          icon="⚖"
          summary={t('processRuleSummary') as string}
        />
      )}

      {canAct && (
        <div className={styles.actionsCard}>
          <div className={styles.cardTitle}>{t('actionsTitle')}</div>
          <form onSubmit={handleResolve} className={styles.form}>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>{t('newStatusLabel')}</label>
                <select
                  className={styles.input}
                  title={t('newStatusLabel')}
                  value={resolveForm.status}
                  onChange={(e) =>
                    setResolveForm({ ...resolveForm, status: e.target.value })
                  }
                >
                  <option value="RESOLVED">{t('statusResolved')}</option>
                  <option value="CLOSED">{t('statusClosed')}</option>
                </select>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('decisionLabel')}</label>
              <textarea
                className={styles.textarea}
                value={resolveForm.resolution}
                onChange={(e) =>
                  setResolveForm({ ...resolveForm, resolution: e.target.value })
                }
                rows={2}
                placeholder={t('resolutionPlaceholder')}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>{t('arbitratorNotesLabel')}</label>
              <textarea
                className={styles.textarea}
                value={resolveForm.arbitratorNotes}
                onChange={(e) =>
                  setResolveForm({
                    ...resolveForm,
                    arbitratorNotes: e.target.value,
                  })
                }
                rows={2}
                minLength={10}
                placeholder={t('arbitratorNotesPlaceholder')}
                required
              />
            </div>
            <div className={styles.btnRow}>
              <button
                type="submit"
                className={styles.resolveBtn}
                disabled={submitting}
              >
                {submitting ? t('submitting') : t('updateStatus')}
              </button>
              <button
                type="button"
                className={styles.escalateBtn}
                onClick={handleEscalate}
                disabled={submitting}
              >
                {t('escalateBtn')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
