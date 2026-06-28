'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getEntity, Entity } from '../../../../../lib/api/entities';
import Breadcrumbs from '../../../../../components/shared/Breadcrumbs';
import {
  getEntityPaymentRecords,
  approvePaymentRecord,
  rejectPaymentRecord,
  PaymentRecord,
} from '../../../../../lib/api/subscriptions';
import {
  getSubscriptions,
  activateSubscription,
  suspendSubscription,
  Subscription,
} from '../../../../../lib/api/subscriptions';
import {
  getDisbursementRequests,
  rejectDisbursementRequest,
  DisbursementRequest,
} from '../../../../../lib/api/disbursement-requests';
import {
  getEntityDisputes,
  resolveDispute,
  Dispute,
} from '../../../../../lib/api/disputes';
import { getEntityWallets } from '../../../../../lib/api/wallets';
import { getWalletPaths } from '../../../../../lib/api/wallets';
import type { Translator } from '../../../../../lib/i18n';
import {
  approveMembershipApplication,
  getEntityMembershipApplications,
  MembershipApplication,
  rejectMembershipApplication,
} from '../../../../../lib/api/membership-applications';
import styles from './review.module.css';
import RuleSummaryPanel from '../../../../../components/Governance/RuleSummaryPanel';
import PaymentMatchPanel from '../../../../../components/shared/PaymentMatchPanel';
import StatusBadge from '../../../../../components/shared/StatusBadge';
import ConfirmActionDialog from '../../../../../components/shared/ConfirmActionDialog';

// ── أنواع علامات التبويب ──────────────────────────────────────────────
type TabId =
  | 'memberships'
  | 'records'
  | 'subscriptions'
  | 'disbursements'
  | 'disputes';

interface TabDef {
  id: TabId;
  label: string;
  count: number;
}

// ── إجراء مع ملاحظة ──────────────────────────────────────────────────
function ActionNoteModal({
  t,
  title,
  onConfirm,
  onCancel,
  requireNote,
}: {
  title: string;
  onConfirm: (note: string) => void;
  onCancel: () => void;
  requireNote: boolean;
  t: Translator;
}) {
  const [note, setNote] = useState('');
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3 className={styles.modalTitle}>{title}</h3>
        <textarea
          className={styles.modalTextarea}
          placeholder={requireNote ? 'ملاحظة مطلوبة...' : 'ملاحظة اختيارية...'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          autoFocus
        />
        <div className={styles.modalActions}>
          <button
            className={styles.modalConfirm}
            onClick={() => onConfirm(note)}
            disabled={requireNote && !note.trim()}
          >
            {t("confirm")}
          </button>
          <button className={styles.modalCancel} onClick={onCancel}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
}

function MembershipApplicationsTab({
  t,
  applications,
  onRefresh,
}: {
  applications: MembershipApplication[];
  onRefresh: () => void;
  t: Translator;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);

  async function approve(id: string) {
    setApproveTarget(null);
    setBusy(id);
    try {
      await approveMembershipApplication(id);
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  async function confirmReject(note: string) {
    if (!rejectTarget) return;
    setBusy(rejectTarget);
    try {
      await rejectMembershipApplication(rejectTarget, note);
      onRefresh();
    } finally {
      setBusy(null);
      setRejectTarget(null);
    }
  }

  if (applications.length === 0) {
    return <div className={styles.empty}>{t("empty")}</div>;
  }

  return (
    <>
      {rejectTarget && (
        <ActionNoteModal t={t}
          title={t("rejectReason") as string}
          requireNote
          onConfirm={confirmReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}
      {approveTarget && (
        <ConfirmActionDialog
          title="قبول طلب الانضمام"
          description="سيُصبح مقدم الطلب عضواً نشطاً في الكيان."
          confirmLabel="تأكيد القبول"
          loading={busy === approveTarget}
          onConfirm={() => void approve(approveTarget)}
          onCancel={() => setApproveTarget(null)}
        />
      )}
      <div className={styles.cardList}>
        {applications.map((application) => (
          <div key={application.id} className={styles.reviewCard}>
            <div className={styles.cardMeta}>
              <span className={styles.cardName}>
                {application.person?.name ?? t("unknownApplicant") as string}
              </span>
              <span className={styles.cardSub}>
                {application.person?.phoneNumber ??
                  application.person?.email ??
                  application.person?.username}
              </span>
            </div>
            {application.relationshipDescription && (
              <div className={styles.cardRef}>
                {t("relationship", { desc: application.relationshipDescription })}
              </div>
            )}
            {application.sponsorName && (
              <div className={styles.cardRef}>
                {t("sponsor", { name: application.sponsorName })}
              </div>
            )}
            {application.note && (
              <div className={styles.cardRef}>{t("notePrefix", { note: application.note })}</div>
            )}
            <div className={styles.cardActions}>
              <button
                className={styles.approveBtn}
                onClick={() => setApproveTarget(application.id)}
                disabled={!!busy}
              >
                {busy === application.id ? '...' : 'قبول وتفعيل العضوية'}
              </button>
              <button
                className={styles.rejectBtn}
                onClick={() => setRejectTarget(application.id)}
                disabled={!!busy}
              >
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── قسم: إثباتات الدفع ───────────────────────────────────────────────
function RecordsTab({
  t,
  records,
  onRefresh,
}: {
  t: Translator;
  records: PaymentRecord[];
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    try {
      await approvePaymentRecord(id, {});
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  async function confirmReject(note: string) {
    if (!rejectTarget) return;
    setBusy(rejectTarget);
    try {
      await rejectPaymentRecord(rejectTarget, { reviewerNotes: note });
      onRefresh();
    } finally {
      setBusy(null);
      setRejectTarget(null);
    }
  }

  if (records.length === 0) {
    return <div className={styles.empty}>{t("emptyRecords")}</div>;
  }

  return (
    <>
      {rejectTarget && (
        <ActionNoteModal t={t}
          title={t("rejectReasonGeneral") as string}
          requireNote
          onConfirm={confirmReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}
      <RuleSummaryPanel
        title={t("ruleRecordsTitle") as string}
        summary={t("ruleRecordsDesc") as string}
        icon="🧾"
      />
      <div className={styles.cardList}>
        {records.map((r) => (
          <div key={r.id} className={styles.reviewCard}>
            <div className={styles.cardMeta}>
              <span className={styles.cardName}>
                {r.subscription.membership.person.name}
              </span>
              <span className={styles.cardSub}>
                {r.subscription.governancePath.name} · {r.paymentDue.periodLabel}
              </span>
            </div>
            <div className={styles.cardAmount}>
              {t("amountSAR", { amount: Number(r.amount).toLocaleString("ar-SA") })}
            </div>
            <PaymentMatchPanel
              required={Number(r.paymentDue.amountDue)}
              submitted={Number(r.amount)}
              period={r.paymentDue.periodLabel}
            />
            {r.reference && (
              <div className={styles.cardRef}>{t("referencePrefix", { ref: r.reference })}</div>
            )}
            <div className={styles.cardActions}>
              <button
                className={styles.approveBtn}
                onClick={() => approve(r.id)}
                disabled={busy === r.id}
              >
                {busy === r.id ? '...' : 'قبول'}
              </button>
              <button
                className={styles.rejectBtn}
                onClick={() => setRejectTarget(r.id)}
                disabled={!!busy}
              >
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── قسم: اشتراكات معلقة ──────────────────────────────────────────────
function SubscriptionsTab({
  t,
  subscriptions,
  onRefresh,
}: {
  subscriptions: Subscription[];
  onRefresh: () => void;
  t: Translator;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function activate(id: string) {
    setBusy(id);
    try {
      await activateSubscription(id);
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  async function suspend(id: string) {
    setBusy(id);
    try {
      await suspendSubscription(id);
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  if (subscriptions.length === 0) {
    return <div className={styles.empty}>{t("emptySubscriptions")}</div>;
  }

  return (
    <div className={styles.cardList}>
      {subscriptions.map((s) => (
        <div key={s.id} className={styles.reviewCard}>
          <div className={styles.cardMeta}>
            <span className={styles.cardName}>
              {s.membership?.person.name ?? '—'}
            </span>
            <span className={styles.cardSub}>
              {s.governancePath?.name ?? '—'}
            </span>
          </div>
          <StatusBadge
            status={s.state === 'INTERESTED' ? 'pending' : s.state === 'CONDITIONAL' ? 'partial' : s.state.toLowerCase()}
            customLabel={s.state === 'INTERESTED' ? t("stateInterested") as string : s.state === 'CONDITIONAL' ? t("stateConditional") as string : undefined}
            size="sm"
          />
          <div className={styles.cardActions}>
            <button
              className={styles.approveBtn}
              onClick={() => activate(s.id)}
              disabled={busy === s.id}
            >
              {busy === s.id ? '...' : 'تفعيل'}
            </button>
            <button
              className={styles.rejectBtn}
              onClick={() => suspend(s.id)}
              disabled={!!busy}
            >
              تعليق
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── قسم: طلبات الصرف ─────────────────────────────────────────────────
function DisbursementsTab({
  t,
  requests,
  onRefresh,
}: {
  requests: DisbursementRequest[];
  onRefresh: () => void;
  t: Translator;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  function openGovernedReview(req: DisbursementRequest) {
    router.push(
      `/disbursement-requests?pathId=${encodeURIComponent(req.governancePathId)}&requestId=${encodeURIComponent(req.id)}`,
    );
  }

  async function confirmReject(note: string) {
    if (!rejectTarget) return;
    setBusy(rejectTarget);
    try {
      await rejectDisbursementRequest(rejectTarget, note);
      onRefresh();
    } finally {
      setBusy(null);
      setRejectTarget(null);
    }
  }

  if (requests.length === 0) {
    return <div className={styles.empty}>{t("emptyDisbursements")}</div>;
  }

  return (
    <>
      {rejectTarget && (
        <ActionNoteModal t={t}
          title={t("rejectReasonGeneral") as string}
          requireNote
          onConfirm={confirmReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}
      <RuleSummaryPanel
        title={t("ruleDisbursementsTitle") as string}
        summary={t("ruleDisbursementsDesc") as string}
        icon="💸"
      />
      <div className={styles.cardList}>
        {requests.map((req) => (
          <div key={req.id} className={styles.reviewCard}>
            <div className={styles.cardMeta}>
              <span className={styles.cardName}>{req.beneficiaryName}</span>
              <span className={styles.cardSub}>
                {req.spendingItem?.name ?? '—'} · {req.governancePath?.name ?? '—'}
              </span>
            </div>
            <div className={styles.cardAmount}>
              {t("amountSAR", { amount: Number(req.amount).toLocaleString("ar-SA") })}
            </div>
            {req.description && (
              <div className={styles.cardRef}>{req.description}</div>
            )}
            <div className={styles.cardHint}>
              {t("disbursementDecisionRequired")}
            </div>
            <div className={styles.cardActions}>
              <button
                className={styles.approveBtn}
                onClick={() => openGovernedReview(req)}
                disabled={busy === req.id}
              >
                {t("openDisbursementReview")}
              </button>
              <button
                className={styles.rejectBtn}
                onClick={() => setRejectTarget(req.id)}
                disabled={!!busy}
              >
                رفض
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── قسم: النزاعات ────────────────────────────────────────────────────
function DisputesTab({
  t,
  disputes,
  onRefresh,
}: {
  disputes: Dispute[];
  onRefresh: () => void;
  t: Translator;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);

  async function confirmResolve(resolution: string) {
    if (!resolveTarget) return;
    setBusy(resolveTarget);
    try {
      await resolveDispute(resolveTarget, { status: 'RESOLVED', resolution });
      onRefresh();
    } finally {
      setBusy(null);
      setResolveTarget(null);
    }
  }

  if (disputes.length === 0) {
    return <div className={styles.empty}>{t("emptyDisputes")}</div>;
  }

  return (
    <>
      {resolveTarget && (
        <ActionNoteModal t={t}
          title={t("resolveDecisionTitle") as string}
          requireNote
          onConfirm={confirmResolve}
          onCancel={() => setResolveTarget(null)}
        />
      )}
      <RuleSummaryPanel
        title={t("ruleDisputesTitle") as string}
        summary={t("ruleDisputesDesc") as string}
        icon="⚖"
      />
      <div className={styles.cardList}>
        {disputes.map((d) => (
          <div key={d.id} className={styles.reviewCard}>
            <div className={styles.cardMeta}>
              <span className={styles.cardName}>{d.title}</span>
              <span className={styles.cardSub}>
                {d.initiator?.name ?? '—'} · {d.type}
              </span>
            </div>
            <div className={styles.cardRef}>{d.description}</div>
            <div className={styles.cardActions}>
              <button
                className={styles.approveBtn}
                onClick={() => setResolveTarget(d.id)}
                disabled={busy === d.id}
              >
                {busy === d.id ? '...' : 'أُغلق وحُل'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────
export default function ReviewCenterPage() {
  const t = useTranslations("reviewCenter");
  const nav = useTranslations("nav");
  const { id: entityId } = useParams<{ id: string }>();

  const [entity, setEntity] = useState<Entity | null>(null);
  const [membershipApplications, setMembershipApplications] = useState<
    MembershipApplication[]
  >([]);
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('memberships');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const ent = await getEntity(entityId);
      setEntity(ent);

      // التحقق من الصلاحية
      const role = ent.myRole;
      if (role !== 'FOUNDER' && role !== 'ADMIN') {
        setError(t("unauthorizedAdmin"));
        return;
      }

      // جلب كل البيانات بالتوازي
      const [applications, recs, subs, disps, wallets] = await Promise.all([
        getEntityMembershipApplications(entityId).catch(
          () => [] as MembershipApplication[],
        ),
        getEntityPaymentRecords(entityId).catch(() => [] as PaymentRecord[]),
        getSubscriptions({ entityId }).catch(() => [] as Subscription[]),
        getEntityDisputes(entityId).catch(() => [] as Dispute[]),
        getEntityWallets(entityId).catch(() => []),
      ]);

      // طلبات الصرف تتطلب جمع المسارات أولاً
      const allPaths = (
        await Promise.all(
          wallets.map((w) => getWalletPaths(w.id).catch(() => [])),
        )
      ).flat();

      const allDisbursements = (
        await Promise.all(
          allPaths.map((p) =>
            getDisbursementRequests(p.id).catch(() => [] as DisbursementRequest[]),
          ),
        )
      ).flat();

      setMembershipApplications(applications);
      setRecords(recs.filter((r) => r.status === 'SUBMITTED'));
      setSubscriptions(
        subs.filter((s) => s.state === 'INTERESTED' || s.state === 'CONDITIONAL'),
      );
      setDisbursements(allDisbursements.filter((d) => d.status === 'PENDING'));
      setDisputes(disps.filter((d) => d.status === 'OPEN'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [entityId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p>{t("loadingItems")}</p>
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorMsg}>⚠ {error}</div>;
  }

  const tabs: TabDef[] = [
    {
      id: 'memberships',
      label: t("tabMemberships"),
      count: membershipApplications.length,
    },
    { id: 'records', label: t("tabRecords"), count: records.length },
    { id: 'subscriptions', label: t("tabSubscriptions"), count: subscriptions.length },
    { id: 'disbursements', label: t("tabDisbursements"), count: disbursements.length },
    { id: 'disputes', label: t("tabDisputes"), count: disputes.length },
  ];

  const totalPending =
    membershipApplications.length +
    records.length +
    subscriptions.length +
    disbursements.length +
    disputes.length;

  return (
    <div className={styles.page}>
      <Breadcrumbs
        items={[
          { label: nav("dashboard"), href: "/dashboard" },
          { label: nav("entities"), href: "/entities" },
          { label: entity?.name ?? nav("entities"), href: `/entities/${entityId}` },
          { label: nav("reviewCenter") },
        ]}
      />
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{t("pageTitle")}</h1>
          <p className={styles.pageSubtitle}>{entity?.name}</p>
        </div>
        {totalPending > 0 && (
          <div className={styles.totalBadge}>{t("pendingCount", { count: totalPending })}</div>
        )}
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={styles.tabBadge}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'memberships' && (
          <MembershipApplicationsTab t={t}
            applications={membershipApplications}
            onRefresh={() => { setLoading(true); void loadAll(); }}
          />
        )}
        {activeTab === 'records' && (
          <RecordsTab t={t}
            records={records}
            onRefresh={() => { setLoading(true); void loadAll(); }}
          />
        )}
        {activeTab === 'subscriptions' && (
          <SubscriptionsTab t={t}
            subscriptions={subscriptions}
            onRefresh={() => { setLoading(true); void loadAll(); }}
          />
        )}
        {activeTab === 'disbursements' && (
          <DisbursementsTab t={t}
            requests={disbursements}
            onRefresh={() => { setLoading(true); void loadAll(); }}
          />
        )}
        {activeTab === 'disputes' && (
          <DisputesTab t={t}
            disputes={disputes}
            onRefresh={() => { setLoading(true); void loadAll(); }}
          />
        )}
      </div>
    </div>
  );
}
