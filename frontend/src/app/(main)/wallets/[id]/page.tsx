"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  getWallet,
  getWalletPaths,
  getWalletRelationships,
  approveWalletRelationship,
  rejectWalletRelationship,
  createWalletRelationship,
  executeTransfer,
  Wallet,
  GovernancePath,
  WalletRelationship,
} from "../../../../lib/api/wallets";
import {
  getAccountTransactions,
  LedgerEntry,
} from "../../../../lib/api/ledger";
import { getRules, Rule } from "../../../../lib/api/rules";
import RuleSummaryPanel from "../../../../components/Governance/RuleSummaryPanel";
import ConfirmActionDialog from "../../../../components/shared/ConfirmActionDialog";
import styles from "./wallet-detail.module.css";

function formatCurrency(n: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency }).format(
    n,
  );
}

export default function WalletDetailPage() {
  const t = useTranslations("wallets");
  const { id } = useParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [paths, setPaths] = useState<GovernancePath[]>([]);
  const [selectedPathAccountId, setSelectedPathAccountId] = useState<
    string | null
  >(null);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [incomingRels, setIncomingRels] = useState<WalletRelationship[]>([]);
  const [outgoingRels, setOutgoingRels] = useState<WalletRelationship[]>([]);
  const [walletRules, setWalletRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  
  const [showRelForm, setShowRelForm] = useState(false);
  const [newRel, setNewRel] = useState({ targetWalletId: '', relationshipType: 'FUNDING', contributionPercent: '' });
  
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferData, setTransferData] = useState({ targetWalletId: '', amount: '', reason: '' });
  const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject'; relId: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    try {
      const [w, ps, rels, rules] = await Promise.all([
        getWallet(id),
        getWalletPaths(id),
        getWalletRelationships(id),
        getRules("WALLET", id).catch(() => [] as Rule[]),
      ]);
      setWallet(w);
      setPaths(ps);
      setIncomingRels(rels.incoming);
      setOutgoingRels(rels.outgoing);
      setWalletRules(rules);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function confirmApproveRel() {
    if (!confirmAction) return;
    try {
      await approveWalletRelationship(confirmAction.relId);
      setStatusMsg({ text: t('approveSuccess'), ok: true });
      await loadData();
    } catch {
      setStatusMsg({ text: t('approveFailed'), ok: false });
    } finally {
      setConfirmAction(null);
    }
  }

  async function confirmRejectRel() {
    if (!confirmAction) return;
    try {
      await rejectWalletRelationship(confirmAction.relId, t('relRejectedBy'));
      setStatusMsg({ text: t('rejectSuccess'), ok: true });
      await loadData();
    } catch {
      setStatusMsg({ text: t('rejectFailed'), ok: false });
    } finally {
      setConfirmAction(null);
    }
  }

  async function handleCreateRel(e: React.FormEvent) {
    e.preventDefault();
    if (!newRel.targetWalletId) {
      setStatusMsg({ text: t('targetRequired'), ok: false });
      return;
    }
    try {
      await createWalletRelationship({
        sourceWalletId: wallet!.id,
        targetWalletId: newRel.targetWalletId,
        relationshipType: newRel.relationshipType,
        contributionPercent: newRel.contributionPercent ? parseFloat(newRel.contributionPercent) : undefined,
      });
      setShowRelForm(false);
      setNewRel({ targetWalletId: '', relationshipType: 'FUNDING', contributionPercent: '' });
      setStatusMsg({ text: t('requestSent'), ok: true });
      await loadData();
    } catch (e: unknown) {
      setStatusMsg({ text: e instanceof Error ? e.message : t('createRelFailed'), ok: false });
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!transferData.targetWalletId || !transferData.amount) {
      setStatusMsg({ text: t('fieldsRequired'), ok: false });
      return;
    }
    try {
      await executeTransfer({
        sourceWalletId: wallet!.id,
        targetWalletId: transferData.targetWalletId,
        amount: parseFloat(transferData.amount),
        reason: transferData.reason,
      });
      setShowTransferForm(false);
      setTransferData({ targetWalletId: '', amount: '', reason: '' });
      setStatusMsg({ text: t('transferSuccess'), ok: true });
      await loadData();
    } catch (e: unknown) {
      setStatusMsg({ text: e instanceof Error ? e.message : t('transferFailed'), ok: false });
    }
  }

  async function loadTransactions(accountId: string) {
    setSelectedPathAccountId(accountId);
    setTxLoading(true);
    try {
      setTransactions(await getAccountTransactions(accountId));
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }

  if (loading)
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  if (!wallet) return <div className={styles.error}>{t('notFound')}</div>;

  return (
    <div className={styles.page}>
      {confirmAction && (
        <ConfirmActionDialog
          title={confirmAction.type === 'approve' ? t('approveConfirm') : t('rejectConfirm')}
          description={confirmAction.type === 'approve' ? t('approveConfirmDesc') : t('rejectConfirmDesc')}
          confirmLabel={confirmAction.type === 'approve' ? t('confirmApproveBtn') : t('confirmRejectBtn')}
          cancelLabel={t('cancelBtn')}
          danger={confirmAction.type === 'reject'}
          onConfirm={confirmAction.type === 'approve' ? confirmApproveRel : confirmRejectRel}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {statusMsg && (
        <div className={`${styles.msg} ${statusMsg.ok ? styles.msgSuccess : styles.msgError}`}>
          {statusMsg.ok ? '✓ ' : '⚠ '}{statusMsg.text}
        </div>
      )}

      <Link href={`/entities/${wallet.entityId}`} className={styles.back}>
        {t('backToEntity')}
      </Link>

      <div className={styles.header}>
        <div className={styles.headerIcon}>⬡</div>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{wallet.name}</h1>
          <div className={styles.subtitle}>{wallet.currency}</div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.balanceBadge}>
            {formatCurrency(wallet.balance ?? 0, wallet.currency)}
          </div>
          <button 
            className={styles.btnTransfer} 
            onClick={() => setShowTransferForm(!showTransferForm)}
          >
            {t('transferBtn')}
          </button>
        </div>
      </div>

      {showTransferForm && (
        <form onSubmit={handleTransfer} className={`${styles.relItem} ${styles.relFormItem} ${styles.transferFormWrapper}`}>
          <h4 className={styles.relFormTitle}>{t('transferFormTitle')}</h4>
          <div className={styles.relFormGroup}>
            <input 
              placeholder={t('targetWalletPlaceholder')} 
              required
              value={transferData.targetWalletId}
              onChange={e => setTransferData({...transferData, targetWalletId: e.target.value})}
              className={styles.relFormInput}
            />
            <input 
              type="number" 
              placeholder={t('amountPlaceholder')} 
              required
              min="1"
              step="0.01"
              value={transferData.amount}
              onChange={e => setTransferData({...transferData, amount: e.target.value})}
              className={styles.relFormInput}
            />
            <input 
              placeholder={t('reasonPlaceholder')} 
              required
              value={transferData.reason}
              onChange={e => setTransferData({...transferData, reason: e.target.value})}
              className={styles.relFormInput}
            />
          </div>
          <div className={styles.relFormButtons}>
            <button type="submit" className={styles.btnApprove}>{t('confirmTransfer')}</button>
            <button type="button" onClick={() => setShowTransferForm(false)} className={styles.btnReject}>{t('cancelBtn')}</button>
          </div>
        </form>
      )}

      {/* ── سياق الحوكمة ── */}
      {paths.length > 0 && (
        <div className={styles.rulesSection}>
          <div className={styles.rulesSectionTitle}>{t('governanceContextTitle')}</div>
          <div className={styles.governanceContext}>
            <div className={styles.govContextItem}>
              <span className={styles.govContextIcon}>💳</span>
              <div>
                <div className={styles.govContextLabel}>{t('whoContributes')}</div>
                <div className={styles.govContextValue}>{t('whoContributesValue', { count: paths.length })}</div>
              </div>
            </div>
            <div className={styles.govContextItem}>
              <span className={styles.govContextIcon}>◎</span>
              <div>
                <div className={styles.govContextLabel}>{t('activePaths')}</div>
                <div className={styles.govContextValue}>{paths.filter(p => p.isActive !== false).length}</div>
              </div>
            </div>
            <div className={styles.govContextItem}>
              <span className={styles.govContextIcon}>⚖</span>
              <div>
                <div className={styles.govContextLabel}>{t('linkedRelationships')}</div>
                <div className={styles.govContextValue}>{incomingRels.length + outgoingRels.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {walletRules.length > 0 && (
        <div className={styles.rulesSection}>
          <div className={styles.rulesSectionTitle}>{t('walletRulesTitle')}</div>
          <div className={styles.rulesList}>
            {walletRules.filter((r) => r.isActive).map((rule) => (
              <RuleSummaryPanel
                key={rule.id}
                title={rule.name}
                summary={rule.description ?? ""}
                icon="⚖"
              />
            ))}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {/* Paths */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            {t('pathsTitle', { count: paths.length })}
          </div>
          {paths.length === 0 ? (
            <div className={styles.empty}>{t('noPaths')}</div>
          ) : (
            <div className={styles.pathsList}>
              {paths.map((p) => (
                <div key={p.id} className={styles.pathItem}>
                  <button
                    className={`${styles.pathRow} ${selectedPathAccountId === p.ledgerAccountId ? styles.pathActive : ""}`}
                    onClick={() => {
                      if (p.ledgerAccountId) {
                        void loadTransactions(p.ledgerAccountId);
                      }
                    }}
                    disabled={!p.ledgerAccountId}
                  >
                    <span className={styles.pathDot}>◦</span>
                    <span className={styles.pathName}>{p.name}</span>
                  </button>
                  <Link
                    href={`/paths/${p.id}`}
                    className={styles.pathLink}
                    title={t('pathDetails')}
                  >
                    →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            {selectedPathAccountId
              ? t('latestTransactions')
              : t('choosePathForTx')}
          </div>
          {txLoading ? (
            <div className={styles.centered}>
              <div className={styles.spinnerSm} />
            </div>
          ) : selectedPathAccountId && transactions.length === 0 ? (
            <div className={styles.empty}>{t('noTransactions')}</div>
          ) : (
            <div className={styles.txList}>
              {transactions.map((tx) => (
                <div key={tx.id} className={styles.txRow}>
                  <div
                    className={`${styles.txType} ${tx.type === "CREDIT" ? styles.txIconCredit : styles.txIconDebit}`}
                  >
                    {tx.type === "CREDIT" ? "↑" : "↓"}
                  </div>
                  <div className={styles.txInfo}>
                    <div className={styles.txDesc}>
                      {tx.description || tx.reference || "—"}
                    </div>
                    <div className={styles.txDate}>
                      {new Date(tx.createdAt).toLocaleDateString("ar-SA")}
                    </div>
                  </div>
                  <div
                    className={`${styles.txAmount} ${tx.type === "CREDIT" ? styles.txCredit : styles.txDebit}`}
                  >
                    {tx.type === "CREDIT" ? "+" : "-"}
                    {formatCurrency(tx.amount, wallet.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Wallet Relationships */}
        <div className={`${styles.card} ${styles.fullWidthCard}`}>
          <div className={styles.cardTitle}>{t('relationsTitle')}</div>
          <div className={styles.relationshipsGrid}>
            <div className={styles.relColumn}>
              <div className={styles.relHeader}>
                <h3 className={`${styles.relTitle} ${styles.relTitleNoBorder}`}>{t('outgoingRels')}</h3>
                <button onClick={() => setShowRelForm(!showRelForm)} className={styles.pathLink}>
                  {t('linkWallet')}
                </button>
              </div>

              {showRelForm && (
                <form onSubmit={handleCreateRel} className={`${styles.relItem} ${styles.relFormItem}`}>
                  <h4 className={styles.relFormTitle}>{t('createRelTitle')}</h4>
                  <div className={styles.relFormGroup}>
                    <input 
                      placeholder={t('targetWalletPlaceholder')} 
                      required
                      value={newRel.targetWalletId}
                      onChange={e => setNewRel({...newRel, targetWalletId: e.target.value})}
                      className={styles.relFormInput}
                    />
                    <select 
                      value={newRel.relationshipType}
                      onChange={e => setNewRel({...newRel, relationshipType: e.target.value})}
                      className={styles.relFormInput}
                      aria-label={t('relTypeLabel')}
                      title={t('relTypeLabel')}
                    >
                      <option value="FUNDING">تمويل (Funding)</option>
                      <option value="SUPPORT">دعم (Support)</option>
                      <option value="OVERSIGHT">إشراف (Oversight)</option>
                    </select>
                    <input 
                      type="number" 
                      placeholder={t('contributionPlaceholder')} 
                      min="0" max="100"
                      value={newRel.contributionPercent}
                      onChange={e => setNewRel({...newRel, contributionPercent: e.target.value})}
                      className={styles.relFormInput}
                    />
                  </div>
                  <div className={styles.relFormButtons}>
                    <button type="submit" className={styles.btnApprove}>{t('sendRequest')}</button>
                    <button type="button" onClick={() => setShowRelForm(false)} className={styles.btnReject}>{t('cancelBtn')}</button>
                  </div>
                </form>
              )}

              {outgoingRels.length === 0 ? (
                <div className={styles.empty}>{t('noOutgoingRels')}</div>
              ) : (
                <div className={styles.relList}>
                  {outgoingRels.map(rel => (
                    <div key={rel.id} className={styles.relItem}>
                      <div className={styles.relHeader}>
                        <strong>{t('targetWallet')} {rel.targetWallet?.name}</strong>
                        <span className={`${styles.badge} ${styles['badge' + rel.approvalStatus]}`}>
                          {rel.approvalStatus}
                        </span>
                      </div>
                      <div className={styles.relDetails}>
                        {t('typeContribution', { type: rel.relationshipType, contribution: rel.contributionPercent ? `${rel.contributionPercent}%` : t('notSpecified') })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.relColumn}>
              <h3 className={styles.relTitle}>{t('incomingRels')}</h3>
              {incomingRels.length === 0 ? (
                <div className={styles.empty}>{t('noIncomingRels')}</div>
              ) : (
                <div className={styles.relList}>
                  {incomingRels.map(rel => (
                    <div key={rel.id} className={styles.relItem}>
                      <div className={styles.relHeader}>
                        <strong>{t('sourceWallet')} {rel.sourceWallet?.name}</strong>
                        <span className={`${styles.badge} ${styles['badge' + rel.approvalStatus]}`}>
                          {rel.approvalStatus}
                        </span>
                      </div>
                      <div className={styles.relDetails}>
                        {t('typeContribution', { type: rel.relationshipType, contribution: rel.contributionPercent ? `${rel.contributionPercent}%` : t('notSpecified') })}
                      </div>
                      {rel.approvalStatus === 'PENDING' && (
                        <div className={styles.relActions}>
                          <button onClick={() => setConfirmAction({ type: 'approve', relId: rel.id })} className={styles.btnApprove}>{t('acceptBtn')}</button>
                          <button onClick={() => setConfirmAction({ type: 'reject', relId: rel.id })} className={styles.btnReject}>{t('rejectBtn')}</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
