"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Entity, getEntities } from "../../../lib/api/entities";
import { EntitySummary, getEntitySummary } from "../../../lib/api/ledger";
import {
  PaymentDue,
  PaymentRecord,
  Subscription,
  approvePaymentRecord,
  cancelPaymentRecord,
  getEntityPaymentRecords,
  getMyPaymentDues,
  getMyPaymentRecords,
  getSubscriptions,
  rejectPaymentRecord,
  submitPaymentRecord,
} from "../../../lib/api/subscriptions";
import { fetchApi } from "../../../lib/api";
import styles from "./finance.module.css";
import RequestTimeline, { TimelineStep } from "../../../components/shared/RequestTimeline";
import PaymentMatchPanel from "../../../components/shared/PaymentMatchPanel";
import RuleSummaryPanel from "../../../components/Governance/RuleSummaryPanel";

function buildPaymentTimeline(r: PaymentRecord, labels: { submitted: string; reviewed: string; underReview: string; confirmed: string; rejected: string; cancelled: string; result: string }): TimelineStep[] {
  const isFinal = r.status === "CONFIRMED" || r.status === "REJECTED" || r.status === "CANCELLED";
  return [
    { label: labels.submitted, at: r.submittedAt, done: true },
    {
      label: isFinal ? labels.reviewed : labels.underReview,
      done: isFinal,
      active: r.status === "SUBMITTED",
    },
    {
      label: r.status === "CONFIRMED" ? labels.confirmed : r.status === "REJECTED" ? labels.rejected : r.status === "CANCELLED" ? labels.cancelled : labels.result,
      at: r.reviewedAt ?? r.confirmedAt ?? undefined,
      done: isFinal,
      active: false,
      failed: r.status === "REJECTED" || r.status === "CANCELLED",
    },
  ];
}

function formatCurrency(n: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency }).format(
    n,
  );
}

type Tab = "overview" | "dues" | "payment" | "reviews";

function FinanceContent() {
  const t = useTranslations("finance");
  const searchParams = useSearchParams();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedId, setSelectedId] = useState(
    searchParams.get("entityId") ?? "",
  );
  const [summary, setSummary] = useState<EntitySummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentDues, setPaymentDues] = useState<PaymentDue[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [entityPaymentRecords, setEntityPaymentRecords] = useState<
    PaymentRecord[] | null
  >(null);
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "payment" ||
      t === "dues" ||
      t === "reviews" ||
      t === "overview"
      ? t
      : "overview";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payForm, setPayForm] = useState({
    paymentDueId: searchParams.get("dueId") ?? "",
    reference: "",
    description: "",
  });
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  // inline confirm for approve/cancel; modal for reject
  const [pendingConfirm, setPendingConfirm] = useState<{
    id: string;
    action: "approve" | "cancel";
  } | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    notes: string;
  } | null>(null);

  function describeDueStatus(status: PaymentDue["status"]) {
    switch (status) {
      case "OVERDUE":
        return t("dueOverdue");
      case "PAID":
        return t("duePaid");
      case "WAIVED":
        return t("dueWaived");
      default:
        return t("duePending");
    }
  }

  function describeRecordStatus(status: PaymentRecord["status"]) {
    switch (status) {
      case "CONFIRMED":
        return t("recordConfirmed");
      case "REJECTED":
        return t("recordRejected");
      case "CANCELLED":
        return t("recordCancelled");
      default:
        return t("recordPending");
    }
  }

  useEffect(() => {
    getEntities()
      .then((nextEntities) => {
        setEntities(nextEntities);
        setSelectedId((current) => {
          const stored =
            typeof window !== "undefined"
              ? localStorage.getItem("currentEntityId")
              : null;
          const preferred = current || stored;
          const nextId =
            preferred && nextEntities.some((entity) => entity.id === preferred)
              ? preferred
              : nextEntities[0]?.id ?? "";
          if (nextId) localStorage.setItem("currentEntityId", nextId);
          return nextId;
        });
      })
      .catch(() => {});
  }, []);

  const loadFinanceData = useCallback(
    async (entityId: string, role?: string | null) => {
      if (!entityId) return;
      setLoading(true);
      setError(null);
      const canManageSubscriptions = role === "ADMIN" || role === "FOUNDER";
      const canReviewPayments = canManageSubscriptions || role === "TREASURER";
      try {
        const [
          nextSummary,
          nextSubscriptions,
          nextDues,
          nextRecords,
          nextReviews,
        ] = await Promise.all([
          getEntitySummary(entityId),
          getSubscriptions(canManageSubscriptions ? { entityId } : {}),
          getMyPaymentDues().catch(() => []),
          getMyPaymentRecords().catch(() => []),
          canReviewPayments
            ? getEntityPaymentRecords(entityId)
            : Promise.resolve(null),
        ]);
        setSummary(nextSummary);
        setSubscriptions(
          nextSubscriptions.filter(
            (subscription) => subscription.membership?.entityId === entityId,
          ),
        );
        setPaymentDues(nextDues);
        setPaymentRecords(nextRecords);
        setEntityPaymentRecords(nextReviews);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("generalError"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const selectedRole = entities.find(
    (entity) => entity.id === selectedId,
  )?.myRole;

  useEffect(() => {
    void loadFinanceData(selectedId, selectedRole);
  }, [loadFinanceData, selectedId, selectedRole]);

  const timelineLabels = {
    submitted: t("timelineSubmitted"),
    reviewed: t("timelineReviewed"),
    underReview: t("timelineUnderReview"),
    confirmed: t("timelineConfirmed"),
    rejected: t("timelineRejected"),
    cancelled: t("timelineCancelled"),
    result: t("timelineResult"),
  };

  const visibleDues = paymentDues.filter(
    (due) => due.subscription?.membership?.entityId === selectedId,
  );
  const myEntityRecords = paymentRecords.filter(
    (record) => record.subscription.membership.entityId === selectedId,
  );
  const selectedDue =
    visibleDues.find((due) => due.id === payForm.paymentDueId) ?? null;
  const reviewRecords = entityPaymentRecords ?? [];
  const canReview = entityPaymentRecords !== null;

  async function handlePaymentRecordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payForm.paymentDueId) return;
    setPaying(true);
    setPayMsg(null);
    try {
      await submitPaymentRecord({
        paymentDueId: payForm.paymentDueId,
        reference: payForm.reference,
        description: payForm.description || undefined,
      });
      setPayMsg(t("paySubmitSuccess"));
      setPayForm({ paymentDueId: "", reference: "", description: "" });
      await loadFinanceData(selectedId);
    } catch (err) {
      setPayMsg(
        `⚠ ${err instanceof Error ? err.message : t("paySubmitFailed")}`,
      );
    } finally {
      setPaying(false);
    }
  }

  async function confirmApproveRecord(recordId: string) {
    setPendingConfirm(null);
    setReviewingId(recordId);
    setReviewMsg(null);
    try {
      await approvePaymentRecord(recordId, {});
      setReviewMsg(t("approveSuccess"));
      await loadFinanceData(selectedId);
    } catch (err) {
      setReviewMsg(
        `⚠ ${err instanceof Error ? err.message : t("approveFailed")}`,
      );
    } finally {
      setReviewingId(null);
    }
  }

  async function confirmRejectRecord() {
    if (!rejectModal || !rejectModal.notes.trim()) return;
    const { id, notes } = rejectModal;
    setRejectModal(null);
    setReviewingId(id);
    setReviewMsg(null);
    try {
      await rejectPaymentRecord(id, { reviewerNotes: notes.trim() });
      setReviewMsg(t("rejectSuccess"));
      await loadFinanceData(selectedId);
    } catch (err) {
      setReviewMsg(
        `⚠ ${err instanceof Error ? err.message : t("rejectFailed")}`,
      );
    } finally {
      setReviewingId(null);
    }
  }

  async function confirmCancelRecord(recordId: string) {
    setPendingConfirm(null);
    setReviewingId(recordId);
    setPayMsg(null);
    try {
      await cancelPaymentRecord(recordId);
      setPayMsg(t("cancelSuccess"));
      await loadFinanceData(selectedId);
    } catch (err) {
      setPayMsg(`⚠ ${err instanceof Error ? err.message : t("cancelFailed")}`);
    } finally {
      setReviewingId(null);
    }
  }

  const totalBalance =
    summary?.wallets.reduce((sum, wallet) => sum + (wallet.balance ?? 0), 0) ??
    0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t("title")}</h1>
        <select
          className={styles.entitySelect}
          value={selectedId}
          title={t("chooseEntity")}
          aria-label={t("chooseEntity")}
          onChange={(e) => {
            const entityId = e.target.value;
            setSelectedId(entityId);
            localStorage.setItem("currentEntityId", entityId);
            setSummary(null);
            setSubscriptions([]);
            setPaymentDues([]);
            setPaymentRecords([]);
            setEntityPaymentRecords(null);
            setPayForm({ paymentDueId: "", reference: "", description: "" });
            setPayMsg(null);
            setReviewMsg(null);
            setTab("overview");
          }}
        >
          <option value="">{t("chooseEntity")}</option>
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedId && <div className={styles.prompt}>{t("prompt")}</div>}

      {selectedId && loading && (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      )}

      {selectedId && !loading && error && (
        <div className={styles.error}>{error}</div>
      )}

      {selectedId && !loading && summary && (
        <>
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                {formatCurrency(totalBalance)}
              </div>
              <div className={styles.kpiLabel}>{t("kpiTotalBalance")}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>{summary.wallets.length}</div>
              <div className={styles.kpiLabel}>{t("kpiWallets")}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                {summary.wallets.reduce(
                  (sum, wallet) => sum + wallet.paths.length,
                  0,
                )}
              </div>
              <div className={styles.kpiLabel}>{t("kpiPaths")}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiValue}>
                {
                  subscriptions.filter(
                    (subscription) => subscription.state === "ACTIVE",
                  ).length
                }
              </div>
              <div className={styles.kpiLabel}>{t("kpiActiveSubs")}</div>
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "overview" ? styles.tabActive : ""}`}
              onClick={() => setTab("overview")}
            >
              {t("tabOverview")}
            </button>
            <button
              className={`${styles.tab} ${tab === "dues" ? styles.tabActive : ""}`}
              onClick={() => setTab("dues")}
            >
              {t("tabDues", { count: visibleDues.length })}
            </button>
            <button
              className={`${styles.tab} ${tab === "payment" ? styles.tabActive : ""}`}
              onClick={() => setTab("payment")}
            >
              {t("tabPayment")}
            </button>
            {canReview && (
              <button
                className={`${styles.tab} ${tab === "reviews" ? styles.tabActive : ""}`}
                onClick={() => setTab("reviews")}
              >
                {t("tabReviews", { count: reviewRecords.length })}
              </button>
            )}
          </div>

          {tab === "overview" && (
            <div className={styles.walletsList}>
              {summary.wallets.map((wallet) => (
                <div key={wallet.id} className={styles.walletBlock}>
                  <div className={styles.walletHeader}>
                    <div className={styles.walletIcon}>⬡</div>
                    <div className={styles.walletInfo}>
                      <div className={styles.walletName}>{wallet.name}</div>
                      <div className={styles.walletCurrency}>
                        {wallet.currency}
                      </div>
                    </div>
                    <div className={styles.walletBalance}>
                      {formatCurrency(wallet.balance ?? 0, wallet.currency)}
                    </div>
                  </div>
                  {wallet.paths.length > 0 && (
                    <div className={styles.pathsList}>
                      {wallet.paths.map((path) => (
                        <div key={path.id} className={styles.pathRow}>
                          <span className={styles.pathDot}>◦</span>
                          <span className={styles.pathName}>{path.name}</span>
                          {path.account && (
                            <span className={styles.pathBalance}>
                              {formatCurrency(
                                path.account.balance,
                                wallet.currency,
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "dues" && (
            <div className={styles.stack}>
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.formTitle}>{t("duesTitle")}</h3>
                  <span className={styles.sectionHint}>
                    {visibleDues.length === 0 ? t("duesEmpty") : t("duesHint")}
                  </span>
                </div>
                {visibleDues.length === 0 ? (
                  <p className={styles.emptyState}>{t("duesEmptyMsg")}</p>
                ) : (
                  <div className={styles.recordList}>
                    {visibleDues.map((due) => (
                      <div key={due.id} className={styles.recordCard}>
                        <div className={styles.recordHeader}>
                          <div>
                            <div className={styles.recordTitle}>
                              {due.subscription?.governancePath.name ?? "—"}
                            </div>
                            <div className={styles.recordMeta}>
                              {t("period")} {due.periodLabel} • {t("dueDate")}{" "}
                              {new Date(due.dueDate).toLocaleDateString(
                                "ar-SA",
                              )}
                            </div>
                          </div>
                          <div className={styles.recordSide}>
                            <strong>
                              {formatCurrency(Number(due.amountDue))}
                            </strong>
                            <span
                              className={`${styles.statusBadge} ${
                                due.status === "OVERDUE"
                                  ? styles.statusRejected
                                  : styles.statusPending
                              }`}
                            >
                              {describeDueStatus(due.status)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.actionRow}>
                          <button
                            type="button"
                            className={styles.secondaryBtn}
                            onClick={() => {
                              setPayForm((current) => ({
                                ...current,
                                paymentDueId: due.id,
                              }));
                              setTab("payment");
                            }}
                          >
                            {t("uploadProof")}
                          </button>
                          <button
                            type="button"
                            className={styles.submitBtn}
                            onClick={async () => {
                               try {
                                 const res = await fetchApi<{ id: string }>('/payments/intent', { method: 'POST', body: JSON.stringify({ paymentDueId: due.id, provider: 'STRIPE' }) });
                                 alert(`تم تحويلك افتراضياً לבوابة الدفع (Stripe). الجلسة: ${res.id}`);
                                 setTimeout(() => void loadFinanceData(selectedId), 2000);
                               } catch(e) {
                                 alert(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
                               }
                            }}
                          >
                            دفع إلكتروني (Stripe)
                          </button>
                          <button
                            type="button"
                            className={styles.submitBtn}
                            onClick={async () => {
                               try {
                                 const res = await fetchApi<{ id: string }>('/payments/intent', { method: 'POST', body: JSON.stringify({ paymentDueId: due.id, provider: 'MOYASAR' }) });
                                 alert(`تم تحويلك افتراضياً לבوابة الدفع (Moyasar). الجلسة: ${res.id}`);
                                 setTimeout(() => void loadFinanceData(selectedId), 2000);
                               } catch(e) {
                                 alert(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
                               }
                            }}
                          >
                            دفع إلكتروني (Moyasar)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "payment" && (
            <div className={styles.stack}>
              <RuleSummaryPanel icon="💳" summary={t("paymentRule")} />
              <div className={styles.formCard}>
                <h3 className={styles.formTitle}>{t("payFormTitle")}</h3>
                <p className={styles.sectionHint}>{t("payFormHint")}</p>
                {payMsg && (
                  <div
                    className={`${styles.payMsg} ${payMsg.startsWith("✓") ? styles.paySuccess : styles.payError}`}
                  >
                    {payMsg}
                  </div>
                )}
                <form
                  onSubmit={handlePaymentRecordSubmit}
                  className={styles.form}
                >
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      {t("dueSelectLabel")}
                    </label>
                    <select
                      className={styles.input}
                      value={payForm.paymentDueId}
                      title={t("dueSelectLabel")}
                      aria-label={t("dueSelectLabel")}
                      onChange={(e) =>
                        setPayForm({ ...payForm, paymentDueId: e.target.value })
                      }
                      required
                    >
                      <option value="">{t("dueSelectPlaceholder")}</option>
                      {visibleDues.map((due) => (
                        <option key={due.id} value={due.id}>
                          {due.subscription?.governancePath.name ?? "—"} —{" "}
                          {due.periodLabel} —{" "}
                          {formatCurrency(Number(due.amountDue))}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDue && (
                    <div className={styles.infoBox}>
                      <div>
                        {t("infoPath")}{" "}
                        {selectedDue.subscription?.governancePath.name ?? "—"}
                      </div>
                      <div>
                        {t("infoAmount")}{" "}
                        {formatCurrency(Number(selectedDue.amountDue))}
                      </div>
                      <div>
                        {t("infoDueDate")}{" "}
                        {new Date(selectedDue.dueDate).toLocaleDateString(
                          "ar-SA",
                        )}
                      </div>
                    </div>
                  )}

                  <div className={styles.fieldRow}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        {t("referenceLabel")}
                      </label>
                      <input
                        className={styles.input}
                        value={payForm.reference}
                        onChange={(e) =>
                          setPayForm({ ...payForm, reference: e.target.value })
                        }
                        title={t("referenceLabel")}
                        placeholder={t("referencePlaceholder")}
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        {t("currentStatusLabel")}
                      </label>
                      <input
                        className={styles.input}
                        value={
                          selectedDue
                            ? describeDueStatus(selectedDue.status)
                            : "—"
                        }
                        title={t("currentStatusLabel")}
                        placeholder={t("currentStatusLabel")}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t("noteLabel")}</label>
                    <input
                      className={styles.input}
                      value={payForm.description}
                      onChange={(e) =>
                        setPayForm({ ...payForm, description: e.target.value })
                      }
                      title={t("noteLabel")}
                      placeholder={t("notePlaceholder")}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={
                      paying || !payForm.paymentDueId || !payForm.reference
                    }
                  >
                    {paying ? t("sending") : t("sendProof")}
                  </button>
                </form>
              </div>

              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.formTitle}>{t("myRecordsTitle")}</h3>
                  <span className={styles.sectionHint}>
                    {t("myRecordsHint")}
                  </span>
                </div>
                {myEntityRecords.length === 0 ? (
                  <p className={styles.emptyState}>{t("myRecordsEmpty")}</p>
                ) : (
                  <div className={styles.recordList}>
                    {myEntityRecords.map((record) => (
                      <div key={record.id} className={styles.recordCard}>
                        <div className={styles.recordHeader}>
                          <div>
                            <div className={styles.recordTitle}>
                              {record.subscription.governancePath.name}
                            </div>
                            <div className={styles.recordMeta}>
                              {t("period")} {record.paymentDue.periodLabel} •{" "}
                              {t("reference")} {record.reference}
                            </div>
                          </div>
                          <div className={styles.recordSide}>
                            <strong>
                              {formatCurrency(Number(record.amount))}
                            </strong>
                            <span
                              className={`${styles.statusBadge} ${
                                record.status === "CONFIRMED"
                                  ? styles.statusConfirmed
                                  : record.status === "REJECTED" ||
                                      record.status === "CANCELLED"
                                    ? styles.statusRejected
                                    : styles.statusPending
                              }`}
                            >
                              {describeRecordStatus(record.status)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.recordMeta}>
                          {t("submittedAt")}{" "}
                          {new Date(record.submittedAt).toLocaleString("ar-SA")}
                        </div>
                        <RequestTimeline steps={buildPaymentTimeline(record, timelineLabels)} compact />
                        {record.reviewerNotes && (
                          <div className={styles.noteBox}>
                            {t("reviewerNotes")} {record.reviewerNotes}
                          </div>
                        )}
                        {record.status === "SUBMITTED" &&
                          (pendingConfirm?.id === record.id &&
                          pendingConfirm.action === "cancel" ? (
                            <div className={styles.confirmRow}>
                              <span className={styles.confirmLabel}>
                                {t("cancelConfirm")}
                              </span>
                              <button
                                type="button"
                                className={styles.dangerBtn}
                                onClick={() =>
                                  void confirmCancelRecord(record.id)
                                }
                              >
                                {t("yes")}
                              </button>
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                onClick={() => setPendingConfirm(null)}
                              >
                                {t("no")}
                              </button>
                            </div>
                          ) : (
                            <div className={styles.actionRow}>
                              <button
                                type="button"
                                className={styles.secondaryBtn}
                                disabled={reviewingId === record.id}
                                onClick={() =>
                                  setPendingConfirm({
                                    id: record.id,
                                    action: "cancel",
                                  })
                                }
                              >
                                {t("cancelProof")}
                              </button>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "reviews" && canReview && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.formTitle}>{t("reviewsTitle")}</h3>
                <span className={styles.sectionHint}>{t("reviewsHint")}</span>
              </div>
              {reviewMsg && (
                <div
                  className={`${styles.payMsg} ${reviewMsg.startsWith("✓") ? styles.paySuccess : styles.payError}`}
                >
                  {reviewMsg}
                </div>
              )}
              {reviewRecords.length === 0 ? (
                <p className={styles.emptyState}>{t("reviewsEmpty")}</p>
              ) : (
                <div className={styles.recordList}>
                  {reviewRecords.map((record) => (
                    <div key={record.id} className={styles.recordCard}>
                      <div className={styles.recordHeader}>
                        <div>
                          <div className={styles.recordTitle}>
                            {record.subscription.membership.person.name} —{" "}
                            {record.subscription.governancePath.name}
                          </div>
                          <div className={styles.recordMeta}>
                            {t("period")} {record.paymentDue.periodLabel} •{" "}
                            {t("reference")} {record.reference}
                          </div>
                        </div>
                        <div className={styles.recordSide}>
                          <strong>
                            {formatCurrency(Number(record.amount))}
                          </strong>
                          <span
                            className={`${styles.statusBadge} ${
                              record.status === "CONFIRMED"
                                ? styles.statusConfirmed
                                : record.status === "REJECTED" ||
                                    record.status === "CANCELLED"
                                  ? styles.statusRejected
                                  : styles.statusPending
                            }`}
                          >
                            {describeRecordStatus(record.status)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.recordMeta}>
                        {t("submittedAt")}{" "}
                        {new Date(record.submittedAt).toLocaleString("ar-SA")}
                      </div>
                      <PaymentMatchPanel
                        required={Number(record.paymentDue.amountDue)}
                        submitted={Number(record.amount)}
                        period={record.paymentDue.periodLabel}
                      />
                      <RequestTimeline steps={buildPaymentTimeline(record, timelineLabels)} compact />
                      {record.description && (
                        <div className={styles.noteBox}>
                          {record.description}
                        </div>
                      )}
                      {record.reviewerNotes && (
                        <div className={styles.noteBox}>
                          {t("reviewerNotes")} {record.reviewerNotes}
                        </div>
                      )}
                      {record.status === "SUBMITTED" &&
                        (pendingConfirm?.id === record.id &&
                        pendingConfirm.action === "approve" ? (
                          <div className={styles.confirmRow}>
                            <span className={styles.confirmLabel}>
                              {t("approveConfirm")}
                            </span>
                            <button
                              type="button"
                              className={styles.submitBtn}
                              onClick={() =>
                                void confirmApproveRecord(record.id)
                              }
                            >
                              {t("yes")}
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              onClick={() => setPendingConfirm(null)}
                            >
                              {t("no")}
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actionRow}>
                            <button
                              type="button"
                              className={styles.submitBtn}
                              disabled={reviewingId === record.id}
                              onClick={() =>
                                setPendingConfirm({
                                  id: record.id,
                                  action: "approve",
                                })
                              }
                            >
                              {reviewingId === record.id
                                ? t("processing")
                                : t("approvePayment")}
                            </button>
                            <button
                              type="button"
                              className={styles.secondaryBtn}
                              disabled={reviewingId === record.id}
                              onClick={() =>
                                setRejectModal({ id: record.id, notes: "" })
                              }
                            >
                              {t("rejectPayment")}
                            </button>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {rejectModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setRejectModal(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t("rejectPrompt")}</h3>
            <textarea
              className={styles.modalTextarea}
              value={rejectModal.notes}
              onChange={(e) =>
                setRejectModal({ ...rejectModal, notes: e.target.value })
              }
              placeholder={t("rejectNotesPlaceholder")}
              rows={3}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={!rejectModal.notes.trim()}
                onClick={() => void confirmRejectRecord()}
              >
                {t("rejectPayment")}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setRejectModal(null)}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      }
    >
      <FinanceContent />
    </Suspense>
  );
}
