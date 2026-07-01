'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEntities, Entity } from '../../../lib/api/entities';
import { getEntityWallets, getWalletPaths, Wallet, GovernancePath } from '../../../lib/api/wallets';
import { isOperationalEntity } from '../../../lib/access';
import styles from './wallets.module.css';

interface WalletWithPaths extends Wallet {
  entityName: string;
  paths: GovernancePath[];
}

function formatCurrency(n: number, currency = 'SAR') {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}

function walletBenefitCopy(benefitType: Wallet['benefitType']) {
  if (benefitType === 'SHARED') {
    return {
      label: 'خدمة مشتركة',
      short: 'تفيد الجميع حتى غير الدافعين، لذلك راقب التغطية والعجز.',
      example: 'مثل الحارس، المصعد، الصيانة المشتركة.',
    };
  }

  return {
    label: 'مصلحة فردية',
    short: 'الاستفادة تخص المشتركين أو المستحقين ويمكن فصلها عند عدم المشاركة.',
    example: 'مثل العلاج، الزواج، أو دعم حالة محددة.',
  };
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<WalletWithPaths[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const entityList = await getEntities();
        const walletEntities = entityList.filter(isOperationalEntity);
        setEntities(walletEntities);

        const walletsWithPaths = (
          await Promise.all(
            walletEntities.map(async (entity) => {
              const ew = await getEntityWallets(entity.id).catch(() => [] as Wallet[]);
              return Promise.all(
                ew.map(async (w) => ({
                  ...w,
                  entityName: entity.name,
                  paths: await getWalletPaths(w.id).catch(() => [] as GovernancePath[]),
                })),
              );
            }),
          )
        ).flat();

        setWallets(walletsWithPaths);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'حدث خطأ في التحميل');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = selectedEntity
    ? wallets.filter((w) => w.entityId === selectedEntity)
    : wallets;

  const totalBalance = filtered.reduce((sum, w) => sum + w.balance, 0);
  const activeCount = filtered.filter((w) => w.isActive).length;
  const sharedCount = filtered.filter((w) => w.benefitType === 'SHARED').length;
  const separableCount = filtered.filter((w) => w.benefitType === 'SEPARABLE').length;

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>⚠ {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>المحافظ</h1>
          <p className={styles.pageSubtitle}>
            {activeCount} محفظة نشطة · {separableCount} مصلحة فردية · {sharedCount} خدمة مشتركة · إجمالي {formatCurrency(totalBalance)}
          </p>
        </div>
        <select
          className={styles.entityFilter}
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
        >
          <option value="">جميع الصناديق</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.benefitGuide} aria-label="شرح أنواع المحافظ">
        <div className={styles.benefitGuideItem}>
          <span className={`${styles.benefitBadge} ${styles.benefitSeparable}`}>
            مصلحة فردية
          </span>
          <p>حق أو منفعة يمكن ربطها بالمشترك أو المستفيد المحدد. عند التأخر أو عدم الأهلية، يمكن فصل الأثر غالباً.</p>
        </div>
        <div className={styles.benefitGuideItem}>
          <span className={`${styles.benefitBadge} ${styles.benefitShared}`}>
            خدمة مشتركة
          </span>
          <p>خدمة يستفيد منها الجميع مثل الحارس أو المصعد. هنا المهم إظهار نسبة التغطية والعجز، لا التعامل معها كحالة فردية.</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>لا توجد محافظ بعد. أنشئ صندوقاً ثم أضف محفظة من صفحة الصندوق.</p>
          <Link href="/entities" className={styles.emptyLink}>تصفح الصناديق ←</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((wallet) => {
            const benefit = walletBenefitCopy(wallet.benefitType);
            return (
              <Link key={wallet.id} href={`/wallets/${wallet.id}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon}>⬡</div>
                  <div className={styles.cardMeta}>
                    <div className={styles.cardName}>{wallet.name}</div>
                    <div className={styles.cardEntity}>{wallet.entityName}</div>
                  </div>
                  <div
                    className={styles.statusDot}
                    style={{ background: wallet.isActive ? '#22c55e' : '#ef4444' }}
                    title={wallet.isActive ? 'نشطة' : 'مغلقة'}
                  />
                </div>

                <div className={styles.benefitSummary}>
                  <span
                    className={`${styles.benefitBadge} ${
                      wallet.benefitType === 'SHARED'
                        ? styles.benefitShared
                        : styles.benefitSeparable
                    }`}
                  >
                    {benefit.label}
                  </span>
                  <p>{benefit.short}</p>
                  <span>{benefit.example}</span>
                </div>

                <div className={styles.balanceRow}>
                  <span className={styles.balanceLabel}>الرصيد</span>
                  <span className={styles.balanceValue}>
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </span>
                </div>

                {wallet.paths.length > 0 && (
                  <div className={styles.pathsList}>
                    {wallet.paths.slice(0, 3).map((path) => (
                      <div key={path.id} className={styles.pathRow}>
                        <span className={styles.pathDot}>◦</span>
                        <span className={styles.pathName}>{path.name}</span>
                        <span className={styles.pathBalance}>
                          {formatCurrency(path.balance, path.currency)}
                        </span>
                      </div>
                    ))}
                    {wallet.paths.length > 3 && (
                      <div className={styles.pathRow} style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        +{wallet.paths.length - 3} مسارات أخرى
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.cardArrow}>←</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
