"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getBeneficiaries, Beneficiary } from "../../../lib/api/beneficiaries";
import { getEntities, Entity } from "../../../lib/api/entities";
import { getEntityWallets, getWalletPaths, Wallet, GovernancePath } from "../../../lib/api/wallets";
import { getPathSpendingItems, SpendingItem } from "../../../lib/api/paths";
import { getDecisions, type Decision } from "../../../lib/api/decisions";
import { useTranslations } from "next-intl";
import { FINANCE_ROLES, hasRole } from "../../../lib/access";
import {
  getDisbursementRequests,
  createDisbursementRequest,
  approveDisbursementRequest,
  rejectDisbursementRequest,
  executeDisbursementRequest,
  cancelDisbursementRequest,
  DisbursementRequest,
} from "../../../lib/api/disbursement-requests";
import type { Translator } from "../../../lib/i18n";
import styles from "./disbursement-requests.module.css";
import RuleSummaryPanel from "../../../components/Governance/RuleSummaryPanel";
import RequestTimeline, { TimelineStep } from "../../../components/shared/RequestTimeline";
import VisibilityNotice from "../../../components/shared/VisibilityNotice";
import ConfirmActionDialog from "../../../components/shared/ConfirmActionDialog";

function buildDisbursementTimeline(
  r: DisbursementRequest,
  t: Translator,
): TimelineStep[] {
  const submitted: TimelineStep = {
    label: t("timelineSubmitted"),
    at: r.requestedAt,
    done: true,
  };

  const reviewing: TimelineStep = {
    label: r.status === "PENDING" ? t("timelineUnderReview") : t("timelineReviewed"),
    done: r.status !== "PENDING",
    active: r.status === "PENDING",
  };

  const reviewed: TimelineStep =
    r.status === "APPROVED" || r.status === "REJECTED" || r.status === "CANCELLED" || r.status === "EXECUTED"
      ? {
          label: r.status === "REJECTED"
            ? t("timelineRejected")
            : r.status === "CANCELLED"
            ? t("timelineCancelled")
            : t("timelineApproved"),
          sublabel: r.reviewerNotes ?? undefined,
          at: r.reviewedAt ?? undefined,
          done: true,
          failed: r.status === "REJECTED" || r.status === "CANCELLED",
        }
      : { label: t("timelineExecution"), done: false };

  const executed: TimelineStep =
    r.status === "EXECUTED"
      ? { label: t("timelineExecuted"), at: r.executedAt ?? undefined, done: true }
      : { label: t("timelineExecute"), done: false, active: r.status === "APPROVED" };

  return [submitted, reviewing, reviewed, executed];
}

export default function DisbursementRequestsPage() {
  const t = useTranslations("disbursementRequests");
  const tCommon = useTranslations("common");

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t('statusPending'),
    APPROVED: t('statusApproved'),
    REJECTED: t('statusRejected'),
    EXECUTED: t('statusExecuted'),
    CANCELLED: t('statusCancelled'),
  };

  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [paths, setPaths] = useState<GovernancePath[]>([]);
  const [pathId, setPathId] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [spendingItems, setSpendingItems] = useState<SpendingItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [requests, setRequests] = useState<DisbursementRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    spendingItemId: "",
    beneficiaryId: "",
    beneficiaryName: "",
    beneficiaryNotes: "",
    amount: "",
    description: "",
  });

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
    setMsg(null);
  };

  const [reviewForm, setReviewForm] = useState({
    decisionId: "",
    reviewerNotes: "",
    reference: "",
  });
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [createConfirmPending, setCreateConfirmPending] = useState(false);
  const selectedEntity = entities.find((entity) => entity.id === entityId);
  const canReview = selectedEntity
    ? hasRole(selectedEntity, FINANCE_ROLES)
    : false;

  const approvedDecisions = decisions.filter(
    (d) => d.decisionType === "DISBURSE_FUNDS" && d.status === "CLOSED" && d.result === "APPROVED",
  );

  useEffect(() => {
    getEntities().then((fetched) => {
      setEntities(fetched);
      if (fetched.length === 1) setEntityId(fetched[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!entityId) { setWallets([]); setWalletId(""); setBeneficiaries([]); return; }
    Promise.all([
      getEntityWallets(entityId).catch(() => []),
      canReview ? getBeneficiaries(entityId).catch(() => []) : Promise.resolve([]),
    ]).then(([nextWallets, nextBeneficiaries]) => {
      setWallets(nextWallets as Wallet[]);
      if (nextWallets.length === 1) setWalletId((nextWallets as Wallet[])[0].id);
      setBeneficiaries(nextBeneficiaries as Beneficiary[]);
    }).catch(() => {});
  }, [canReview, entityId]);

  useEffect(() => {
    if (!walletId) { setPaths([]); setPathId(""); return; }
    getWalletPaths(walletId).then((fetched) => {
      setPaths(fetched);
      if (fetched.length === 1) setPathId(fetched[0].id);
    }).catch(() => {});
  }, [walletId]);

  const loadPathData = useCallback(() => {
    if (!pathId) { setSpendingItems([]); setDecisions([]); setRequests([]); return; }
    setLoading(true);
    Promise.all([
      getPathSpendingItems(pathId).catch(() => []),
      canReview ? getDecisions(pathId).catch(() => []) : Promise.resolve([]),
      getDisbursementRequests(pathId).catch(() => []),
    ]).then(([items, decs, reqs]) => {
      setSpendingItems(items as SpendingItem[]);
      setDecisions(decs as Decision[]);
      setRequests(reqs as DisbursementRequest[]);
    }).finally(() => setLoading(false));
  }, [canReview, pathId]);

  useEffect(() => { loadPathData(); }, [loadPathData]);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !pathId ||
      !form.spendingItemId ||
      (!form.beneficiaryId && !form.beneficiaryName) ||
      !form.amount ||
      !form.description
    ) return;
    setCreateConfirmPending(true);
  };

  const handleCreate = async () => {
    setCreateConfirmPending(false);
    setSubmitting(true);
    setMsg(null);
    try {
      await createDisbursementRequest(pathId, {
        spendingItemId: form.spendingItemId,
        beneficiaryId: form.beneficiaryId || undefined,
        beneficiaryName: form.beneficiaryName || undefined,
        beneficiaryNotes: form.beneficiaryNotes || undefined,
        amount: parseFloat(form.amount),
        description: form.description,
      });
      setMsg({ text: t('createSuccess'), type: "success" });
      setForm({
        spendingItemId: "",
        beneficiaryId: "",
        beneficiaryName: "",
        beneficiaryNotes: "",
        amount: "",
        description: "",
      });
      loadPathData();
    } catch (err) {
      setMsg({ text: String(err), type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setMsg(null);
    try {
      await approveDisbursementRequest(id, reviewForm.decisionId || undefined, reviewForm.reviewerNotes || undefined);
      setMsg({ text: t('approveSuccess'), type: "success" });
      setActiveReviewId(null);
      loadPathData();
    } catch (err) {
      setMsg({ text: String(err), type: "error" });
    }
  };

  const handleReject = async (id: string) => {
    if (!reviewForm.reviewerNotes) {
      setMsg({ text: t('rejectNoteRequired'), type: "error" });
      return;
    }
    setMsg(null);
    try {
      await rejectDisbursementRequest(id, reviewForm.reviewerNotes);
      setMsg({ text: t('rejectSuccess'), type: "success" });
      setActiveReviewId(null);
      loadPathData();
    } catch (err) {
      setMsg({ text: String(err), type: "error" });
    }
  };

  const handleExecute = async (id: string) => {
    setMsg(null);
    try {
      await executeDisbursementRequest(id, reviewForm.reference || undefined);
      setMsg({ text: t('executeSuccess'), type: "success" });
      setReviewForm({ decisionId: "", reviewerNotes: "", reference: "" });
      setActiveReviewId(null);
      loadPathData();
    } catch (err) {
      setMsg({ text: String(err), type: "error" });
    }
  };

  const handleCancel = async (id: string) => {
    setMsg(null);
    try {
      await cancelDisbursementRequest(id);
      setMsg({ text: t('cancelSuccess'), type: "success" });
      setCancelConfirmId(null);
      loadPathData();
    } catch (err) {
      setMsg({ text: String(err), type: "error" });
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>

      
      <div className={styles.selectors}>
        <select title={t('chooseEntity')} value={entityId} onChange={(e) => setEntityId(e.target.value)} className={styles.select}>
          <option value="">{t('chooseEntity')}</option>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select title={t('chooseWallet')} value={walletId} onChange={(e) => setWalletId(e.target.value)} className={styles.select} disabled={!entityId}>
          <option value="">{t('chooseWallet')}</option>
          {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select title={t('choosePath')} value={pathId} onChange={(e) => setPathId(e.target.value)} className={styles.select} disabled={!walletId}>
          <option value="">{t('choosePath')}</option>
          {paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {msg && (
        <div className={`${styles.msg} ${msg.type === "error" ? styles.error : styles.success}`}>
          {msg.text}
        </div>
      )}

      {createConfirmPending && (
        <ConfirmActionDialog
          title={`تأكيد طلب صرف ${form.amount ? Number(form.amount).toLocaleString("ar-SA") : ""} ر.س`}
          description="سيُرسَل هذا الطلب للمراجعة من قِبل المسؤولين. لا يمكن التعديل عليه بعد الإرسال."
          confirmLabel="إرسال الطلب"
          loading={submitting}
          onConfirm={() => void handleCreate()}
          onCancel={() => setCreateConfirmPending(false)}
        />
      )}

      {pathId && (
        <>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t('newRequestTitle')}</h2>
            <form onSubmit={handleCreateRequest} className={styles.form}>
              <select title={t('spendingItemOption')} value={form.spendingItemId} onChange={(e) => updateForm({ spendingItemId: e.target.value })} className={styles.input} required>
                <option value="">{t('spendingItemOption')}</option>
                {spendingItems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {canReview ? <select
                title={t('savedBeneficiaryOption')}
                value={form.beneficiaryId}
                onChange={(e) =>
                  updateForm({
                    beneficiaryId: e.target.value,
                    beneficiaryName: e.target.value ? "" : form.beneficiaryName,
                  })
                }
                className={styles.input}
              >
                <option value="">{t('savedBeneficiaryOption')}</option>
                {beneficiaries.map((beneficiary) => (
                  <option key={beneficiary.id} value={beneficiary.id}>
                    {beneficiary.displayName}
                    {beneficiary.annualCap ? ` — ${t('annualCap', { amount: Number(beneficiary.annualCap).toLocaleString("ar-SA") })}` : ""}
                  </option>
                ))}
              </select> : null}
              <input
                placeholder={t('externalBeneficiaryPlaceholder')}
                value={form.beneficiaryName}
                onChange={(e) =>
                  updateForm({
                    beneficiaryId: "",
                    beneficiaryName: e.target.value,
                  })
                }
                className={styles.input}
                disabled={Boolean(form.beneficiaryId)}
                required={!form.beneficiaryId}
              />
              <input placeholder={t('beneficiaryNotesPlaceholder')} value={form.beneficiaryNotes} onChange={(e) => updateForm({ beneficiaryNotes: e.target.value })} className={styles.input} />
              <input type="number" placeholder={t('amountPlaceholder')} value={form.amount} onChange={(e) => updateForm({ amount: e.target.value })} className={styles.input} min="1" step="0.01" required />
              <textarea placeholder={t('descriptionPlaceholder')} value={form.description} onChange={(e) => updateForm({ description: e.target.value })} className={styles.textarea} required rows={3} />
              <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                {submitting ? t('sending') : t('sendBtn')}
              </button>
            </form>
          </div>

          

          
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t('requestsTitle', { count: requests.length })}</h2>
            {loading ? <p className={styles.empty}>{t('loading')}</p> : requests.length === 0 ? (
              <p className={styles.empty}>{t('noRequests')}</p>
            ) : (
              <div className={styles.list}>
                {requests.map((r) => (
                  <div key={r.id} className={styles.requestCard}>
                    <div className={styles.requestHeader}>
                      <span className={styles.requestTitle}>
                        {r.beneficiary?.displayName ?? r.beneficiaryName}
                        {r.beneficiary?.type === "EXTERNAL" && (
                          <VisibilityNotice
                            level="VisibleToCommittee"
                            reason={t("externalBeneficiaryWarning")}
                            compact
                          />
                        )}
                      </span>
                      <span className={styles.badge} data-status={r.status}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <div className={styles.requestMeta}>
                      <span>{t('currencySAR', { amount: Number(r.amount).toLocaleString("ar-SA") })}</span>
                      <span>|</span>
                      <span>{r.spendingItem?.name}</span>
                      <span>|</span>
                      <span>{new Date(r.requestedAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <p className={styles.requestDesc}>{r.description}</p>
                    <RequestTimeline steps={buildDisbursementTimeline(r, t)} compact />
                    <div className={styles.requestActions}>
                      {r.status === "PENDING" && (
                        <>
                          {canReview ? (
                            activeReviewId === r.id ? (
                              <div className={styles.reviewFormContainer}>
                                <RuleSummaryPanel
                                  title={t('ruleSummaryTitle')}
                                  summary={t('ruleSummaryText')}
                                  icon="⚠️"
                                />
                                <select title={t('linkDecisionOption')} value={reviewForm.decisionId} onChange={(e) => { setReviewForm({ ...reviewForm, decisionId: e.target.value }); setMsg(null); }} className={styles.input}>
                                  <option value="">{t('linkDecisionOption')}</option>
                                  {approvedDecisions.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                                </select>
                                <input placeholder={t('reviewerNotesPlaceholder')} value={reviewForm.reviewerNotes} onChange={(e) => { setReviewForm({ ...reviewForm, reviewerNotes: e.target.value }); setMsg(null); }} className={styles.input} />
                                <div className={styles.reviewActions}>
                                  <button onClick={() => handleApprove(r.id)} className={styles.btnSuccess}>{t('approveBtn')}</button>
                                  <button onClick={() => handleReject(r.id)} className={styles.btnDanger}>{t('rejectBtn')}</button>
                                  <button onClick={() => { setActiveReviewId(null); setMsg(null); }} className={styles.btnGhost}>{t('cancelBtn')}</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => { setActiveReviewId(r.id); setReviewForm({ decisionId: "", reviewerNotes: "", reference: "" }); setMsg(null); }} className={styles.btnPrimary}>{t('reviewToolsTitle')}</button>
                            )
                          ) : (
                            cancelConfirmId === r.id ? (
                                <div className={styles.cancelConfirmPanel}>
                                  <span className={styles.cancelConfirmText}>{t('cancelConfirmPrompt')}</span>
                                  <button onClick={() => handleCancel(r.id)} className={styles.btnDanger} disabled={submitting}>{tCommon('yes')}</button>
                                  <button onClick={() => setCancelConfirmId(null)} className={styles.btnGhost}>{tCommon('no')}</button>
                                </div>
                              ) : (
                                <button onClick={() => setCancelConfirmId(r.id)} className={styles.btnGhost}>{t('cancelBtn')}</button>
                              )
                          )}
                        </>
                      )}
                      {r.status === "APPROVED" && canReview && (
                        activeReviewId === r.id ? (
                          <div className={styles.reviewFormContainer}>
                            <input placeholder={t('referencePlaceholder')} value={reviewForm.reference} onChange={(e) => { setReviewForm({ ...reviewForm, reference: e.target.value }); setMsg(null); }} className={styles.input} />
                            <div className={styles.reviewActions}>
                              <button onClick={() => handleExecute(r.id)} className={styles.btnSuccess}>{t('executeBtn')}</button>
                              <button onClick={() => { setActiveReviewId(null); setMsg(null); }} className={styles.btnGhost}>{t('cancelBtn')}</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setActiveReviewId(r.id); setReviewForm({ decisionId: "", reviewerNotes: "", reference: "" }); setMsg(null); }} className={styles.btnPrimary}>{t('executeBtn')}</button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
