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
            onChange={(e) => { setEntityId(e.target.value); setMsg(null); }}
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
              onChange={(e) => setWalletId(e.target.value)}
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
              onChange={(e) => { setPathId(e.target.value); setMsg(null); }}
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
                {pathBalance.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} {t('sar', { fallback: 'ر.س' })}
              </span>
            </div>
          )}

          {confirmPending && (
            <ConfirmActionDialog
              title={`تنفيذ صرف ${form.amount ? Number(form.amount).toLocaleString("ar-SA") : ""} ر.س`}
              description="هذه العملية ستُسجَّل في دفتر الأستاذ المالي ولا يمكن التراجع عنها. تأكد أن القرار المرتبط صحيح."
              confirmLabel="تأكيد الصرف"
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
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={
                    submitting ||
                    !form.spendingItemId ||
                    !form.decisionId ||
                    !form.amount ||
                    !form.description
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
