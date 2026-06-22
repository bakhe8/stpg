'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getMe, updateMe, type CurrentPerson } from '../../../lib/api/auth';
import styles from './profile.module.css';

type EditField = 'none' | 'name' | 'username' | 'email';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const [person, setPerson] = useState<CurrentPerson | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit name / email
  const [editField, setEditField] = useState<EditField>('none');
  const [editValue, setEditValue] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editFailed, setEditFailed] = useState(false);

  useEffect(() => {
    getMe()
      .then(setPerson)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function startEdit(field: EditField) {
    setEditField(field);
    setEditValue(
      field === 'name'
        ? (person?.name ?? '')
        : field === 'username'
          ? (person?.username ?? '')
          : (person?.email ?? ''),
    );
    setEditMsg(null);
    setEditFailed(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editValue.trim()) return;
    setEditLoading(true);
    setEditMsg(null);
    setEditFailed(false);
    try {
      const value = editValue.trim();
      const updated = await updateMe(
        editField === 'name'
          ? { name: value }
          : editField === 'username'
            ? { username: value }
            : { email: value },
      );
      setPerson((prev) => prev ? { ...prev, ...updated } : prev);
      localStorage.setItem('personName', updated.name);
      setEditMsg(t('saveSuccess'));
      setEditField('none');
    } catch (e) {
      setEditMsg(e instanceof Error ? e.message : t('generalError'));
      setEditFailed(true);
    } finally {
      setEditLoading(false);
    }
  }

  if (loading) {
    return <div className={styles.centered}><div className={styles.spinner} /></div>;
  }

  if (!person) {
    return <div className={styles.centered}><p>{t('loadError')}</p></div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{t('pageTitle')}</h1>

      {!person.isVerified && (
        <div className={styles.activationBanner}>
          <div className={styles.bannerIcon}>⚠</div>
          <div className={styles.bannerBody}>
            <strong>{t('activationBannerTitle')}</strong>
            <p>حسابك ما زال بانتظار تفعيل العضوية من قبل إدارة الكيان.</p>
          </div>
        </div>
      )}
      {person.isVerified && (
        <div className={styles.verifiedBanner}>
          <span>{t('verifiedStatus')}</span>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>{t('accountDataTitle')}</h2>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t('nameLabel')}</span>
          {editField === 'name' ? (
            <form className={styles.inlineForm} onSubmit={saveEdit}>
              <input
                className={styles.inlineInput}
                value={editValue}
                title={t('nameLabel')}
                placeholder={t('nameLabel')}
                onChange={(e) => setEditValue(e.target.value)}
                minLength={2}
                maxLength={80}
                required
                autoFocus
              />
              <button type="submit" className={styles.saveBtn} disabled={editLoading}>
                {editLoading ? '...' : t('saveBtn')}
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditField('none')}>
                {t('cancelBtn')}
              </button>
            </form>
          ) : (
            <span className={styles.fieldValue}>
              {person.name}
              <button className={styles.editBtn} onClick={() => startEdit('name')}>{t('editBtn')}</button>
            </span>
          )}
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t('usernameLabel')}</span>
          {editField === 'username' ? (
            <form className={styles.inlineForm} onSubmit={saveEdit}>
              <input
                className={styles.inlineInput}
                value={editValue}
                placeholder={t('usernameLabel')}
                onChange={(e) => setEditValue(e.target.value)}
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z][A-Za-z0-9_]{2,31}"
                title={t('usernameHint')}
                dir="ltr"
                required
                autoFocus
              />
              <button type="submit" className={styles.saveBtn} disabled={editLoading}>
                {editLoading ? '...' : t('saveBtn')}
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditField('none')}>
                {t('cancelBtn')}
              </button>
            </form>
          ) : (
            <span className={styles.fieldValue}>
              <span dir="ltr">@{person.username}</span>
              <button className={styles.editBtn} onClick={() => startEdit('username')}>{t('editBtn')}</button>
            </span>
          )}
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t('phoneLabel')}</span>
          <span className={styles.fieldStack}>
            <span className={styles.fieldValue} dir="ltr">
              {person.phoneNumber ?? '—'}
              {person.phoneNumber && !person.isVerified && (
                <span className={styles.unverifiedTag}>{t('unverifiedTag')}</span>
              )}
            </span>
            <span className={styles.fieldHint}>{t('phoneLockedHint')}</span>
          </span>
        </div>

        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>{t('emailLabel')}</span>
          {editField === 'email' ? (
            <form className={styles.inlineForm} onSubmit={saveEdit}>
              <input
                className={styles.inlineInput}
                type="email"
                value={editValue}
                title={t('emailLabel')}
                placeholder={t('emailLabel')}
                onChange={(e) => setEditValue(e.target.value)}
                required
                autoFocus
                dir="ltr"
              />
              <button type="submit" className={styles.saveBtn} disabled={editLoading}>
                {editLoading ? '...' : t('saveBtn')}
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditField('none')}>
                {t('cancelBtn')}
              </button>
            </form>
          ) : (
            <span className={styles.fieldValue}>
              {person.email ?? '—'}
              <button className={styles.editBtn} onClick={() => startEdit('email')}>
                {person.email ? t('editBtn') : t('addBtn')}
              </button>
            </span>
          )}
        </div>

        {editMsg && (
          <p className={editFailed ? styles.editError : styles.editMsg}>
            {editMsg}
          </p>
        )}
      </div>
    </div>
  );
}
