"use client";

import React, { useEffect, useState } from "react";
import { getEntities, Entity } from "../../../lib/api/entities";
import {
  filterEntitiesByRoles,
  FINANCE_ROLES,
} from "../../../lib/access";
import { useTranslations } from "next-intl";
import {
  getEntityWallets,
  getWalletPaths,
  Wallet,
  GovernancePath,
} from "../../../lib/api/wallets";
import { getPath, getPathSpendingItems, SpendingItem } from "../../../lib/api/paths";
import { getDecisions, type Decision } from "../../../lib/api/decisions";
import { recordDisbursement } from "../../../lib/api/ledger";
import ConfirmActionDialog from "../../../components/shared/ConfirmActionDialog";
import RuleSummaryPanel from "../../../components/Governance/RuleSummaryPanel";
import styles from "./disbursements.module.css";

function formatCurrency(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function DisbursementsPage() {
  const t = useTranslations("disbursements");
  const tCommon = useTranslations("common");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletId, setWalletId] = useState("");
  const [paths, setPaths] = useState<GovernancePath[]>([]);
  const [pathId, setPathId] = useState("");
  const [pathBalance, setPathBalance] = useState<number | null>(null);
  const [spendingItems, setSpendingItems] = useState<SpendingItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const [form, setForm] = useState({
    spendingItemId: "",
    decisionId: "",
    amount: "",
    description: "",
    reference: "",
  });

  const approvedDecisions = decisions.filter(
    (d) =>
      d.decisionType === "DISBURSE_FUNDS" &&
      d.status === "CLOSED" &&
      d.result === "APPROVED",
  );
  const selectedEntity = entities.find((entity) => entity.id === entityId);
  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  const selectedPath = paths.find((path) => path.id === pathId);
  const selectedSpendingItem = spendingItems.find(
    (item) => item.id === form.spendingItemId,
  );
  const selectedDecision = approvedDecisions.find(
    (decision) => decision.id === form.decisionId,
  );
  const amountValue = Number.parseFloat(form.amount);
  const hasValidAmount = Number.isFinite(amountValue) && amountValue > 0;
  const previewCurrency = selectedPath?.currency ?? "SAR";
  const projectedBalance =
    pathBalance !== null && hasValidAmount ? pathBalance - amountValue : null;
  const amountExceedsBalance =
    projectedBalance !== null && projectedBalance < 0;
  const spendingCap = selectedSpendingItem?.maxAmountPerRequest;
  const exceedsSpendingCap =
    spendingCap !== undefined &&
    spendingCap !== null &&
    hasValidAmount &&
    amountValue > Number(spendingCap);
  const decisionCap = selectedDecision?.amount;
  const exceedsDecisionCap =
    decisionCap !== undefined &&
    decisionCap !== null &&
    hasValidAmount &&
    amountValue > Number(decisionCap);
  const previewBlocksSubmit =
    amountExceedsBalance || exceedsSpendingCap || exceedsDecisionCap;
  const previewReady =
    Boolean(
      selectedPath &&
        selectedSpendingItem &&
        selectedDecision &&
        hasValidAmount,
    ) &&
    !previewBlocksSubmit;

  function resetForm() {
    setForm({
      spendingItemId: "",
      decisionId: "",
      amount: "",
      description: "",
      reference: "",
    });
  }

  useEffect(() => {
    getEntities()
      .then((items) => setEntities(filterEntitiesByRoles(items, FINANCE_ROLES)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!entityId) { setWallets([]); setWalletId(""); setPaths([]); setPathId(""); return; }
    getEntityWallets(entityId)
      .then(setWallets)
      .catch(() => {});
  }, [entityId]);

  useEffect(() => {
    if (!walletId) { setPaths([]); setPathId(""); return; }
    getWalletPaths(walletId)
      .then(setPaths)
      .catch(() => {});
  }, [walletId]);

  useEffect(() => {
    if (!pathId) {
      setPathBalance(null);
      setSpendingItems([]);
      setDecisions([]);
      return;
    }
    setLoading(true);
    Promise.all([
      getPath(pathId),
      getPathSpendingItems(pathId),
      getDecisions(pathId),
    ])
      .then(([pathInfo, items, decs]) => {
        setPathBalance(pathInfo.balance);
        setSpendingItems(items.filter((i) => i.isActive));
        setDecisions(decs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pathId]);

  function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (previewBlocksSubmit || !previewReady) return;
    setConfirmPending(true);
  }

  async function handleSubmit() {
    setConfirmPending(false);
    setSubmitting(true);
    setMsg(null);
    try {
      await recordDisbursement({
        pathId,
        spendingItemId: form.spendingItemId,
        decisionId: form.decisionId,
        amount: parseFloat(form.amount),
        description: form.description,
        reference: form.reference || undefined,
      });
      setMsg(t('submitSuccess'));
      setForm({ spendingItemId: "", decisionId: "", amount: "", description: "", reference: "" });
      const updatedPath = await getPath(pathId);
      setPathBalance(updatedPath.balance);
    } catch (err) {
      setMsg(`⚠ ${err instanceof Error ? err.message : tCommon('failed')}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <div className={styles.controls}>
          <select
            className={styles.select}
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setWalletId("");
              setPathId("");
              resetForm();
              setMsg(null);
            }}
            title={tCommon('chooseEntity')}
          >
            <option value="">{tCommon('chooseEntity')}</option>
            {entities.map((en) => (
              <option key={en.id} value={en.id}>{en.name}</option>
            ))}
          </select>
          {entityId && (
            <select
              className={styles.select}
              value={walletId}
              onChange={(e) => {
                setWalletId(e.target.value);
                setPathId("");
                resetForm();
                setMsg(null);
              }}
              title={tCommon('chooseWallet')}
            >
              <option value="">{tCommon('chooseWallet')}</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
          {walletId && (
            <select
              className={styles.select}
              value={pathId}
              onChange={(e) => {
                setPathId(e.target.value);
                resetForm();
                setMsg(null);
              }}
              title={tCommon('choosePath')}
            >
              <option value="">{tCommon('choosePath')}</option>
              {paths.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {msg && (
        <div className={`${styles.msg} ${msg.startsWith("✓") ? styles.success : styles.error}`}>
          {msg}
        </div>
      )}

      {!pathId && (
        <div className={styles.prompt}>{t('choosePrompt')}</div>
      )}

      {pathId && loading && (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
      )}

      {pathId && !loading && (
        <>
          <RuleSummaryPanel
            icon="⚖"
            summary={t('governanceRule')}
          />
          {pathBalance !== null && (
            <div className={styles.balanceStrip}>
              <span className={styles.balanceLabel}>{t('currentBalance')}</span>
              <span className={styles.balanceValue}>
                {formatCurrency(pathBalance, previewCurrency)}
              </span>
            </div>
          )}

          {confirmPending && (
            <ConfirmActionDialog
              title={t("confirmTitle", {
                amount: hasValidAmount
                  ? formatCurrency(amountValue, previewCurrency)
                  : "—",
              })}
              description={t("confirmDescription", {
                source: selectedPath?.name ?? "—",
                target: selectedSpendingItem?.name ?? "—",
                decision: selectedDecision?.title ?? "—",
              })}
              confirmLabel={t("confirmLabel")}
              danger={true}
              loading={submitting}
              onConfirm={() => void handleSubmit()}
              onCancel={() => setConfirmPending(false)}
            />
          )}

          {approvedDecisions.length === 0 ? (
            <div className={styles.notice}>
              {t('noApprovedDecisions')}
            </div>
          ) : (
            <div className={styles.formCard}>
              <h3 className={styles.formTitle}>{t('formTitle')}</h3>
              <form onSubmit={handleSubmitRequest} className={styles.form}>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('spendingItemLabel')}</label>
                    <select
                      className={styles.input}
                      value={form.spendingItemId}
                      onChange={(e) => setForm({ ...form, spendingItemId: e.target.value })}
                      required
                      title={t('spendingItemLabel')}
                    >
                      <option value="">{t('spendingItemOption')}</option>
                      {spendingItems.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('approvalDecisionLabel')}</label>
                    <select
                      className={styles.input}
                      value={form.decisionId}
                      onChange={(e) => setForm({ ...form, decisionId: e.target.value })}
                      required
                      title={t('approvalDecisionLabel')}
                    >
                      <option value="">{t('approvalDecisionOption')}</option>
                      {approvedDecisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('amountLabel')}</label>
                    <input
                      className={styles.input}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t('referenceLabel')}</label>
                    <input
                      className={styles.input}
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder={t('referencePlaceholder')}
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t('descriptionLabel')}</label>
                  <input
                    className={styles.input}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                    placeholder={t('descriptionPlaceholder')}
                  />
                </div>
                <div className={styles.previewPanel}>
                  <div className={styles.previewHeader}>
                    <div>
                      <div className={styles.previewTitle}>
                        {t("previewTitle")}
                      </div>
                      <div className={styles.previewText}>
                        {t("previewText")}
                      </div>
                    </div>
                  </div>
                  <div className={styles.previewGrid}>
                    <div className={styles.previewItem}>
                      <span>{t("previewEntity")}</span>
                      <strong>{selectedEntity?.name ?? "—"}</strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>{t("previewSource")}</span>
                      <strong>
                        {selectedWallet && selectedPath
                          ? `${selectedWallet.name} / ${selectedPath.name}`
                          : "—"}
                      </strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>{t("previewDestination")}</span>
                      <strong>{selectedSpendingItem?.name ?? "—"}</strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>{t("previewDecision")}</span>
                      <strong>{selectedDecision?.title ?? "—"}</strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>{t("previewAmount")}</span>
                      <strong>
                        {hasValidAmount
                          ? formatCurrency(amountValue, previewCurrency)
                          : "—"}
                      </strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>{t("previewBalanceBefore")}</span>
                      <strong>
                        {pathBalance !== null
                          ? formatCurrency(pathBalance, previewCurrency)
                          : "—"}
                      </strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>{t("previewBalanceAfter")}</span>
                      <strong>
                        {projectedBalance !== null
                          ? formatCurrency(projectedBalance, previewCurrency)
                          : "—"}
                      </strong>
                    </div>
                    <div className={styles.previewItem}>
                      <span>{t("previewDecisionLimit")}</span>
                      <strong>
                        {decisionCap !== undefined && decisionCap !== null
                          ? formatCurrency(Number(decisionCap), previewCurrency)
                          : t("notLimited")}
                      </strong>
                    </div>
                  </div>
                  <div
                    className={`${styles.previewOutcome} ${
                      previewBlocksSubmit
                        ? styles.previewBlocked
                        : previewReady
                          ? styles.previewReady
                          : ""
                    }`}
                  >
                    {amountExceedsBalance
                      ? t("previewInsufficientBalance")
                      : exceedsSpendingCap
                        ? t("previewSpendingCap", {
                            amount: formatCurrency(
                              Number(spendingCap),
                              previewCurrency,
                            ),
                          })
                        : exceedsDecisionCap
                          ? t("previewDecisionCap", {
                              amount: formatCurrency(
                                Number(decisionCap),
                                previewCurrency,
                              ),
                            })
                          : previewReady
                            ? t("previewReady")
                            : t("previewNeedsSelection")}
                  </div>
                </div>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={
                    submitting ||
                    !form.spendingItemId ||
                    !form.decisionId ||
                    !form.amount ||
                    !form.description ||
                    previewBlocksSubmit
                  }
                >
                  {submitting ? t('submitting') : t('submitBtn')}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
