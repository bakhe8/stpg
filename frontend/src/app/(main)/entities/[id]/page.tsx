'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  getEntity, getEntityMembers, getEntityRelationships,
  approveEntityRelationship, rejectEntityRelationship,
  Entity, EntityMember, EntityRelationship,
} from '../../../../lib/api/entities';
import { getActiveSessions, SupportSession } from '../../../../lib/api/support';
import PlatformSupportBanner from '../../../../components/platform/PlatformSupportBanner';
import { ENTITY_TYPE_KEYS } from '../../../../lib/enum-labels';
import {
  createWallet,
  getEntityWallets,
  getWalletPaths,
  GovernancePath,
  Wallet,
  WalletBenefitType,
} from '../../../../lib/api/wallets';
import { getFundHealth, FundHealth } from '../../../../lib/api/analytics';
import {
  getSubscriptions, createSubscription, exitSubscription, Subscription,
  getSubscriptionCompatibility, CompatibilityResult,
} from '../../../../lib/api/subscriptions';
import {
  ADMIN_ROLES,
  OVERSIGHT_ROLES,
  hasRole,
} from '../../../../lib/access';
import { createInvitation } from '../../../../lib/api/invitations';
import PlatformStatusBanner from '../../../../components/shared/PlatformStatusBanner';
import styles from './entity-detail.module.css';

const ROLE_MAP: Record<string, string> = {
  FOUNDER: 'roleFounder',
  ADMIN: 'roleAdmin',
  TREASURER: 'roleTreasurer',
  AUDITOR: 'roleAuditor',
  COMMITTEE_MEMBER: 'roleCommitteeMember',
  MEMBER: 'roleMember',
};

function formatCurrency(amount: number, currency = 'SAR') {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency }).format(amount);
}

export default function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('entities');
  const tEnums = useTranslations('enums');
  const [entity, setEntity] = useState<Entity | null>(null);
  const [members, setMembers] = useState<EntityMember[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [health, setHealth] = useState<FundHealth | null>(null);
  const [showHealthTooltip, setShowHealthTooltip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'members' | 'wallets' | 'relations' | 'compatibility' | 'support'>('overview');
  const [relationships, setRelationships] = useState<{ outgoing: EntityRelationship[]; incoming: EntityRelationship[] }>({ outgoing: [], incoming: [] });
  const [relMsg, setRelMsg] = useState<string | null>(null);
  
  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);

  interface PathCompat {
    walletId: string;
    walletName: string;
    pathId: string;
    pathName: string;
    subscriberCount: number;
    compatibilityList: Array<{ memberId: string; memberName: string; result: CompatibilityResult | null }>;
  }
  const [pathCompatData, setPathCompatData] = useState<PathCompat[]>([]);
  const [compatLoading, setCompatLoading] = useState(false);
  const [transferMemberId, setTransferMemberId] = useState('');
  const [transferFromPathId, setTransferFromPathId] = useState('');
  const [transferToPathId, setTransferToPathId] = useState('');
  const [transferMsg, setTransferMsg] = useState<string | null>(null);
  const [transferPaths, setTransferPaths] = useState<Array<GovernancePath & { walletName: string }>>([]);
  const [transferPathsLoading, setTransferPathsLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [walletCreating, setWalletCreating] = useState(false);
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [walletForm, setWalletForm] = useState<{
    name: string;
    description: string;
    benefitType: WalletBenefitType;
  }>({
    name: '',
    description: '',
    benefitType: 'SEPARABLE',
  });

  async function copyInviteLink() {
    try {
      const { token } = await createInvitation({ entityId: id });
      const url = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    } catch {
      // clipboard may fail on non-HTTPS — fallback ignored
    }
  }

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab === 'wallets') setTab('wallets');
  }, []);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const ent = await getEntity(id);
        const canManageEntity = hasRole(ent, ADMIN_ROLES);
        const canViewHealth = hasRole(ent, OVERSIGHT_ROLES);
        const [mems, wals, rels] = await Promise.all([
          canManageEntity ? getEntityMembers(id) : Promise.resolve([]),
          getEntityWallets(id),
          canManageEntity
            ? getEntityRelationships(id).catch(() => ({
                outgoing: [],
                incoming: [],
              }))
            : Promise.resolve({ outgoing: [], incoming: [] }),
        ]);
        setRelationships(rels);
        setEntity(ent);
        setMembers(mems);
        setWallets(wals as Wallet[]);
        if (canViewHealth) {
          try {
            setHealth(await getFundHealth(id));
          } catch {
            // Health may be unavailable when the entity has no operational data.
          }
        }

        // تحميل جلسات الدعم النشطة عند تحميل الصفحة لإظهار البانر التحذيري
        getActiveSessions(id).then(setSupportSessions).catch(() => {});

        // Ensure RLS takes this entity context
        if (typeof window !== "undefined") {
          localStorage.setItem("currentEntityId", id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t('generalError'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, t]);

  async function loadTransferPaths() {
    setTransferPathsLoading(true);
    try {
      const pathsByWallet = await Promise.all(
        wallets
          .filter((wallet) => wallet.isActive)
          .map(async (wallet) => {
            const paths = await getWalletPaths(wallet.id).catch(() => []);
            return paths
              .filter((path) => path.isActive)
              .map((path) => ({ ...path, walletName: wallet.name }));
          }),
      );
      setTransferPaths(pathsByWallet.flat());
    } finally {
      setTransferPathsLoading(false);
    }
  }

  async function loadCompatibility() {
    if (!id) return;
    setCompatLoading(true);
    try {
      const walletsData = await getEntityWallets(id);
      const allSubs = await getSubscriptions({ entityId: id });
      const walletsWithPaths = await Promise.all(
        walletsData
          .filter((wallet: Wallet) => wallet.isActive)
          .map(async (wallet) => ({
            wallet,
            paths: await getWalletPaths(wallet.id).catch(() => []),
          })),
      );
      const results = await Promise.all(
        walletsWithPaths.flatMap(({ wallet, paths }) =>
          paths
            .filter((path) => path.isActive)
            .map(async (path): Promise<PathCompat> => {
              const pathSubs = allSubs.filter(
                (subscription: Subscription) =>
                  subscription.governancePathId === path.id &&
                  subscription.state === 'ACTIVE',
              );
              const compatibilityList = await Promise.all(
                pathSubs.map(async (subscription: Subscription) => {
                  let result: CompatibilityResult | null = null;
                  try {
                    result = await getSubscriptionCompatibility(subscription.id);
                  } catch {
                    // Keep the remaining members visible if one check fails.
                  }
                  return {
                    memberId: subscription.membershipId,
                    memberName:
                      subscription.membership?.person?.name ??
                      subscription.membershipId.slice(0, 8),
                    result,
                  };
                }),
              );
              return {
                walletId: wallet.id,
                walletName: wallet.name,
                pathId: path.id,
                pathName: path.name,
                subscriberCount: pathSubs.length,
                compatibilityList,
              };
            }),
        ),
      );
      setPathCompatData(results);
    } finally {
      setCompatLoading(false);
    }
  }

  async function handleMemberTransfer() {
    if (!transferMemberId || !transferFromPathId || !transferToPathId) return;
    setTransferMsg(null);
    try {
      const subs = await getSubscriptions({ membershipId: transferMemberId });
      const fromSub = subs.find((s: Subscription) => s.governancePathId === transferFromPathId && s.state === 'ACTIVE');
      if (!fromSub) { setTransferMsg(t('transferNoSub')); return; }
      await exitSubscription(fromSub.id);
      await createSubscription(transferToPathId, { membershipId: transferMemberId });
      setTransferMsg(t('transferSuccess'));
      setTransferMemberId('');
      setTransferFromPathId('');
      setTransferToPathId('');
      await loadTransferPaths();
      if (pathCompatData.length > 0) await loadCompatibility();
    } catch (e) {
      setTransferMsg(e instanceof Error ? e.message : t('transferFailed'));
    }
  }

  async function loadSupport() {
    if (!id) return;
    setSupportLoading(true);
    try {
      setSupportSessions(await getActiveSessions(id));
    } catch (e) {
      console.error(e);
    } finally {
      setSupportLoading(false);
    }
  }

  async function handleCreateWallet(event: React.FormEvent) {
    event.preventDefault();
    if (!walletForm.name.trim()) return;
    setWalletCreating(true);
    setWalletMsg(null);
    try {
      await createWallet(id, {
        name: walletForm.name.trim(),
        description: walletForm.description.trim() || undefined,
        benefitType: walletForm.benefitType,
      });
      setWallets(await getEntityWallets(id));
      setWalletForm({
        name: '',
        description: '',
        benefitType: 'SEPARABLE',
      });
      setShowWalletForm(false);
      setWalletMsg(t('walletCreateSuccess'));
    } catch (e) {
      setWalletMsg(e instanceof Error ? e.message : t('walletCreateFailed'));
    } finally {
      setWalletCreating(false);
    }
  }

  if (loading) return <div className={styles.centered}><div className={styles.spinner} /></div>;
  if (error) return <div className={styles.errorBox}>{error}</div>;
  if (!entity) return null;

  const totalBalance = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);
  const healthPct = health ? Math.round(health.healthScore * 100) : null;
  const canManage = hasRole(entity, ADMIN_ROLES);
  const visibleTabs = [
    'overview',
    'wallets',
    ...(canManage ? ['members', 'relations', 'compatibility', 'support'] : []),
  ] as Array<'overview' | 'members' | 'wallets' | 'relations' | 'compatibility' | 'support'>;

  const isActionDisabled =
    entity.platformStatus === 'SUSPENDED' || entity.platformStatus === 'READ_ONLY';

  return (
    <div className={styles.page}>
      <Link href="/entities" className={styles.back}>{t('backToEntities')}</Link>

      {supportSessions.length > 0 && (
        <PlatformSupportBanner
          operatorName={supportSessions[0].platformAccount?.name ?? t('supportTeam')}
          operatorRole={t('supportRoleLabel')}
        />
      )}

      {entity.platformStatus && entity.platformStatus !== 'ACTIVE' && (
        <PlatformStatusBanner
          entityId={id}
          status={entity.platformStatus}
          reason={entity.suspendedReason}
          suspendedAt={entity.suspendedAt}
        />
      )}

      <div className={styles.entityHeader}>
        <div className={styles.entityIcon}>⬡</div>
        <div className={styles.entityMeta}>
          <h1 className={styles.entityName}>{entity.name}</h1>
          <div className={styles.entityType}>
            {ENTITY_TYPE_KEYS[entity.type]
              ? tEnums(ENTITY_TYPE_KEYS[entity.type] as Parameters<typeof tEnums>[0])
              : entity.type}
          </div>
        </div>
        {healthPct !== null && (
          <div
            className={styles.healthBadgeWrap}
            onClick={() => setShowHealthTooltip((v) => !v)}
            onBlur={() => setShowHealthTooltip(false)}
            tabIndex={0}
            role="button"
            aria-expanded={showHealthTooltip}
          >
            <div
              className={styles.healthBadge}
              style={{
                background: healthPct >= 70 ? 'rgba(34,197,94,0.15)' : healthPct >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                color: healthPct >= 70 ? '#22c55e' : healthPct >= 40 ? '#f59e0b' : '#ef4444',
              }}
            >
              {t('health', { pct: healthPct })}
              <span className={styles.healthInfoIcon}>ⓘ</span>
            </div>
            {health && (
              <div className={`${styles.healthTooltip} ${showHealthTooltip ? styles.healthTooltipOpen : ''}`}>
                <div className={styles.healthTooltipTitle}>مكونات مؤشر الصحة</div>
                <div className={styles.healthTooltipRow}>
                  <span>الالتزام بالمدفوعات</span>
                  <span>{Math.round(health.paymentCompliance * 100)}%</span>
                </div>
                <div className={styles.healthTooltipRow}>
                  <span>صحة الاشتراكات</span>
                  <span>{Math.round(health.subscriptionHealth * 100)}%</span>
                </div>
                <div className={styles.healthTooltipRow}>
                  <span>نسبة الأعضاء النشطين</span>
                  <span>{Math.round(health.activeMemberRate * 100)}%</span>
                </div>
                {healthPct < 70 && (
                  <div className={styles.healthTooltipHint}>
                    {healthPct < 40
                      ? 'الكيان بحاجة إلى اهتمام عاجل — راجع المدفوعات والاشتراكات'
                      : 'يمكن تحسين الصحة بتسوية المدفوعات المعلقة'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {canManage && (
          <div className={styles.manageActions}>
            <Link
              href={`/entities/${entity.id}/members`}
              className={styles.manageLink}
            >
              الأعضاء
            </Link>
            <Link
              href={`/entities/${entity.id}/review`}
              className={`${styles.manageLink} ${styles.manageLinkPrimary}`}
            >
              مركز المراجعات
            </Link>
            {(entity.myRole === 'FOUNDER' || entity.myRole === 'ADMIN') && (
              <Link
                href={`/entities/${entity.id}/settings`}
                className={styles.manageLink}
              >
                ⚙ الإعدادات
              </Link>
            )}
            <button
              onClick={copyInviteLink}
              disabled={isActionDisabled}
              className={`${styles.inviteButton} ${inviteCopied ? styles.inviteButtonCopied : ''}`}
            >
              {inviteCopied ? '✓ تم النسخ' : '🔗 رابط الدعوة'}
            </button>
          </div>
        )}
      </div>

      {health && health.alerts.length > 0 && (
        <div className={styles.alertsBox}>
          {health.alerts.map((a, i) => (
            <div key={i} className={styles.alertItem}>⚠ {a}</div>
          ))}
        </div>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{entity._count?.memberships ?? 0}</div>
          <div className={styles.statLabel}>{t('activeMembers')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{wallets.length}</div>
          <div className={styles.statLabel}>{t('walletsCount')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatCurrency(totalBalance)}</div>
          <div className={styles.statLabel}>{t('totalBalances')}</div>
        </div>
      </div>
      <div className={styles.entityActions}>
        <Link href={`/decisions?entityId=${id}`} className={styles.decisionLink}>
          {t('viewDecisions')}
        </Link>
      </div>

      <div className={styles.tabs}>
        {visibleTabs.map((tabKey) => (
          <button
            key={tabKey}
            className={`${styles.tab} ${tab === tabKey ? styles.tabActive : ''}`}
            onClick={() => {
              setTab(tabKey);
              if (tabKey === 'members' && transferPaths.length === 0) {
                void loadTransferPaths();
              }
              if (tabKey === 'compatibility' && pathCompatData.length === 0) loadCompatibility();
              if (tabKey === 'support' && supportSessions.length === 0) loadSupport();
            }}
          >
            {tabKey === 'overview' ? t('tabOverview')
              : tabKey === 'members' ? t('tabMembers', { count: members.length })
              : tabKey === 'wallets' ? t('tabWallets', { count: wallets.length })
              : tabKey === 'relations' ? t('tabRelations', { count: relationships.outgoing.length + relationships.incoming.length })
              : tabKey === 'compatibility' ? t('tabCompatibility')
              : t('tabSupport')}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className={styles.overviewGrid}>
          <div className={styles.infoCard}>
            <h3 className={styles.cardTitle}>{t('infoCardTitle')}</h3>
            <div className={styles.infoRow}><span>{t('infoStatus')}</span><span>{entity.isActive ? t('active') : t('inactive')}</span></div>
            <div className={styles.infoRow}><span>{t('infoCreatedAt')}</span><span>{new Date(entity.createdAt).toLocaleDateString('ar-SA')}</span></div>
            {health && (
              <>
                <div className={styles.infoRow}><span>{t('infoPaymentCompliance')}</span><span>{Math.round(health.paymentCompliance * 100)}%</span></div>
                <div className={styles.infoRow}><span>{t('infoSubscriptionHealth')}</span><span>{Math.round(health.subscriptionHealth * 100)}%</span></div>
                <div className={styles.infoRow}><span>{t('infoActiveMemberRate')}</span><span>{Math.round(health.activeMemberRate * 100)}%</span></div>
              </>
            )}
            {entity.bankAccountNumber && (
              <div className={styles.infoRow}>
                <span>رقم الحساب</span>
                <span className={styles.bankAccountValue}>
                  {entity.bankAccountNumber}
                  <button
                    className={styles.copyButton}
                    aria-label="نسخ رقم الحساب"
                    title="نسخ رقم الحساب"
                    onClick={() => void navigator.clipboard.writeText(entity.bankAccountNumber!)}
                  >
                    ⎘
                  </button>
                </span>
              </div>
            )}
            {entity.bankName && (
              <div className={styles.infoRow}><span>البنك</span><span>{entity.bankName}</span></div>
            )}
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className={styles.tabStack}>
          <div className={styles.membersList}>
            {members.map((m) => (
              <div key={m.id} className={styles.memberRow}>
                <div className={styles.memberAvatar}>{m.person.name.charAt(0)}</div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{m.person.name}</div>
                  <div className={styles.memberUsername}>@{m.person.username}</div>
                </div>
                <div className={styles.memberRole}>{ROLE_MAP[m.role] ? t(ROLE_MAP[m.role] as Parameters<typeof t>[0]) : m.role}</div>
                <div
                  className={styles.memberStatus}
                  style={{ color: m.isActive ? '#22c55e' : '#ef4444' }}
                >
                  {m.isActive ? t('active') : t('inactive')}
                </div>
              </div>
            ))}
          </div>

          <section className={styles.operationPanel}>
            <div className={styles.operationHeader}>
              <div>
                <h3 className={styles.operationTitle}>{t('transferTitle')}</h3>
                <p className={styles.operationHint}>{t('transferHint')}</p>
              </div>
              <span className={styles.operationTag}>{t('membersOperation')}</span>
            </div>
            {transferMsg && (
              <div className={transferMsg.startsWith('✓') ? styles.successMessage : styles.errorMessage}>
                {transferMsg}
              </div>
            )}
            {transferPathsLoading ? (
              <div className={styles.inlineLoading}>{t('transferLoadingPaths')}</div>
            ) : transferPaths.length < 2 ? (
              <div className={styles.inlineEmpty}>{t('transferNeedsPaths')}</div>
            ) : (
              <div className={styles.transferGrid}>
                <div className={styles.formField}>
                  <label htmlFor="transfer-member">{t('transferMember')}</label>
                  <select
                    id="transfer-member"
                    value={transferMemberId}
                    onChange={(e) => setTransferMemberId(e.target.value)}
                  >
                    <option value="">{t('transferChooseMember')}</option>
                    {members.filter((m) => m.isActive).map((m) => (
                      <option key={m.id} value={m.id}>{m.person.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label htmlFor="transfer-from">{t('transferFrom')}</label>
                  <select
                    id="transfer-from"
                    value={transferFromPathId}
                    onChange={(e) => setTransferFromPathId(e.target.value)}
                  >
                    <option value="">{t('transferChoosePath')}</option>
                    {transferPaths.map((path) => (
                      <option key={path.id} value={path.id}>{path.walletName} / {path.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label htmlFor="transfer-to">{t('transferTo')}</label>
                  <select
                    id="transfer-to"
                    value={transferToPathId}
                    onChange={(e) => setTransferToPathId(e.target.value)}
                  >
                    <option value="">{t('transferChoosePath')}</option>
                    {transferPaths
                      .filter((path) => path.id !== transferFromPathId)
                      .map((path) => (
                        <option key={path.id} value={path.id}>{path.walletName} / {path.name}</option>
                      ))}
                  </select>
                </div>
                <button
                  className={styles.primaryAction}
                  disabled={!transferMemberId || !transferFromPathId || !transferToPathId}
                  onClick={handleMemberTransfer}
                >
                  {t('transferBtn')}
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'wallets' && (
        <div className={styles.tabStack}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{t('walletSectionTitle')}</h2>
              <p className={styles.sectionHint}>{t('walletSectionHint')}</p>
            </div>
            {canManage && !isActionDisabled && (
              <button
                className={styles.addAction}
                onClick={() => {
                  setShowWalletForm((shown) => !shown);
                  setWalletMsg(null);
                }}
              >
                {showWalletForm ? t('walletCancelCreate') : t('walletNew')}
              </button>
            )}
          </div>

          {walletMsg && (
            <div className={walletMsg.startsWith('✓') ? styles.successMessage : styles.errorMessage}>
              {walletMsg}
            </div>
          )}

          {showWalletForm && canManage && (
            <form className={styles.walletForm} onSubmit={handleCreateWallet}>
              <div className={styles.formField}>
                <label htmlFor="wallet-name">{t('walletNameLabel')}</label>
                <input
                  id="wallet-name"
                  value={walletForm.name}
                  onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })}
                  placeholder={t('walletNamePlaceholder')}
                  minLength={2}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.formField}>
                <label htmlFor="wallet-benefit">{t('walletBenefitLabel')}</label>
                <select
                  id="wallet-benefit"
                  value={walletForm.benefitType}
                  onChange={(e) => setWalletForm({
                    ...walletForm,
                    benefitType: e.target.value as WalletBenefitType,
                  })}
                >
                  <option value="SEPARABLE">{t('walletBenefitSeparable')}</option>
                  <option value="SHARED">{t('walletBenefitShared')}</option>
                </select>
              </div>
              <div className={`${styles.formField} ${styles.formFieldWide}`}>
                <label htmlFor="wallet-description">{t('walletDescriptionLabel')}</label>
                <textarea
                  id="wallet-description"
                  value={walletForm.description}
                  onChange={(e) => setWalletForm({ ...walletForm, description: e.target.value })}
                  placeholder={t('walletDescriptionPlaceholder')}
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div className={styles.walletFormActions}>
                <button
                  type="submit"
                  className={styles.primaryAction}
                  disabled={walletCreating || walletForm.name.trim().length < 2}
                >
                  {walletCreating ? t('walletCreating') : t('walletCreateBtn')}
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => setShowWalletForm(false)}
                >
                  {t('walletCancel')}
                </button>
              </div>
            </form>
          )}

          <div className={styles.walletsList}>
            {wallets.map((w) => (
              <Link key={w.id} href={`/wallets/${w.id}`} className={styles.walletRow}>
                <div className={styles.walletIcon}>⬡</div>
                <div className={styles.walletInfo}>
                  <div className={styles.walletName}>{w.name}</div>
                  <div className={styles.walletCurrency}>{w.currency}</div>
                </div>
                <div className={styles.walletBalance}>{formatCurrency(w.balance ?? 0, w.currency || 'SAR')}</div>
                <div className={styles.walletArrow}>›</div>
              </Link>
            ))}
            {wallets.length === 0 && (
              <div className={styles.empty}>{t('noWallets')}</div>
            )}
          </div>
        </div>
      )}

      {tab === 'relations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {relMsg && (
            <div style={{ padding: '0.7rem 1rem', borderRadius: '8px', background: relMsg.startsWith('✓') ? '#ecfdf5' : '#fef2f2', color: relMsg.startsWith('✓') ? '#065f46' : '#991b1b', border: `1px solid ${relMsg.startsWith('✓') ? '#a7f3d0' : '#fca5a5'}`, fontSize: '0.9rem' }}>{relMsg}</div>
          )}

          {relationships.incoming.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{t('incomingRelations', { count: relationships.incoming.length })}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {relationships.incoming.map((r) => (
                  <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', background: r.approvalStatus === 'PENDING' ? 'var(--warning-bg)' : 'var(--surface-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600 }}>{r.sourceEntity?.name ?? r.sourceEntityId}</span>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: r.approvalStatus === 'PENDING' ? '#fef3c7' : r.approvalStatus === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: r.approvalStatus === 'PENDING' ? '#92400e' : r.approvalStatus === 'ACTIVE' ? '#166534' : '#991b1b' }}>
                        {r.approvalStatus === 'PENDING' ? t('approvalPending') : r.approvalStatus === 'ACTIVE' ? t('approvalActive') : t('approvalRejected')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('relationType')} {r.type} · {t('relationSince')} {new Date(r.startedAt).toLocaleDateString('ar-SA')}</div>
                    {r.approvalStatus === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          style={{ padding: '0.4rem 0.9rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                          onClick={async () => {
                            try {
                              await approveEntityRelationship(r.id);
                              setRelMsg(t('approveSuccess'));
                              const rels = await getEntityRelationships(id);
                              setRelationships(rels);
                            } catch (e) { setRelMsg(e instanceof Error ? e.message : t('relFailed')); }
                          }}
                        >{t('approveRelation')}</button>
                        <button
                          style={{ padding: '0.4rem 0.9rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                          onClick={async () => {
                            try {
                              await rejectEntityRelationship(r.id);
                              setRelMsg(t('rejectSuccess'));
                              const rels = await getEntityRelationships(id);
                              setRelationships(rels);
                            } catch (e) { setRelMsg(e instanceof Error ? e.message : t('relFailed')); }
                          }}
                        >{t('rejectRelation')}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {relationships.outgoing.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{t('outgoingRelations', { count: relationships.outgoing.length })}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {relationships.outgoing.map((r) => (
                  <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', background: 'var(--surface-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{r.targetEntity?.name ?? r.targetEntityId}</span>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: r.approvalStatus === 'PENDING' ? '#fef3c7' : r.approvalStatus === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: r.approvalStatus === 'PENDING' ? '#92400e' : r.approvalStatus === 'ACTIVE' ? '#166534' : '#991b1b' }}>
                        {r.approvalStatus === 'PENDING' ? t('outgoingPending') : r.approvalStatus === 'ACTIVE' ? t('approvalActive') : t('approvalRejected')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{t('relationType')} {r.type} · {t('relationSince')} {new Date(r.startedAt).toLocaleDateString('ar-SA')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relationships.outgoing.length === 0 && relationships.incoming.length === 0 && (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0', fontSize: '0.9rem' }}>{t('noRelations')}</div>
          )}
        </div>
      )}

      {tab === 'compatibility' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {compatLoading ? (
            <div className={styles.centered}><div className={styles.spinner} /></div>
          ) : (
            <>
              {pathCompatData.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem', background: 'var(--surface-muted)', borderRadius: '12px', border: '1px dashed var(--border-strong)' }}>
                  {t('compatNoActive')}
                </div>
              )}
              {pathCompatData.map((pc) => (
                <div key={pc.pathId} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{pc.walletName}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', background: 'var(--accent-soft)', padding: '2px 10px', borderRadius: '20px' }}>{pc.pathName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: 'auto' }}>{t('compatSubscribers', { count: pc.subscriberCount })}</span>
                  </div>
                  {pc.compatibilityList.length === 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('compatNoSubs')}</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pc.compatibilityList.map((item) => {
                      const score = item.result?.score ?? 0;
                      const scoreColor = score >= 0.7 ? '#22c55e' : score >= 0.4 ? '#f59e0b' : '#ef4444';
                      return (
                        <div key={item.memberId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--surface-muted)', borderRadius: '8px' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-strong)', flexShrink: 0 }}>
                            {item.memberName.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', flex: 1 }}>{item.memberName}</span>
                          {item.result ? (
                            <>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: scoreColor }}>{Math.round(score * 100)}%</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.result.recommendedState}</span>
                              {item.result.conflicts.length > 0 && (
                                <span title={item.result.conflicts.map((c) => c.description).join(' | ')} style={{ fontSize: '0.75rem', color: '#ef4444', cursor: 'help' }}>
                                  {t('compatConflicts', { count: item.result.conflicts.length })}
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('compatUnavailable')}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            </>
          )}
        </div>
      )}
      {tab === 'support' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{t('supportTitle')}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('supportDesc')}</p>
            </div>
          </div>

          {supportLoading ? (
            <div className={styles.centered}><div className={styles.spinner} /></div>
          ) : supportSessions.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem', background: 'var(--surface-muted)', borderRadius: '12px', border: '1px dashed var(--border-strong)' }}>
              {t('noSupportSessions')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {supportSessions.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {s.platformAccount?.name ?? s.platformAccountId}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {t('sessionExpiresAt', { date: new Date(s.expiresAt).toLocaleString('ar-SA') })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
