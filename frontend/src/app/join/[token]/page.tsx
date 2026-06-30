'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  getInvitationPreview,
  joinViaInvitation,
  joinMeViaInvitation,
  InvitationPreview,
} from '../../../lib/api/invitations';
import { getEntityPolicy, EntityPolicy } from '../../../lib/api/entities';
import { getToken } from '../../../lib/api';
import styles from './join.module.css';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  FAMILY: 'عائلة',
  TRIBE: 'قبيلة',
  BUILDING: 'عمارة',
  NEIGHBORHOOD: 'حي',
  COMMUNITY: 'جماعة',
  CAMPAIGN: 'حملة',
};

// ── مكوّن: معاينة الكيان ──────────────────────────────────────────────
function EntityPreview({ preview }: { preview: InvitationPreview }) {
  return (
    <div className={styles.entityCard}>
      {preview.logoUrl && (
        <Image
          src={preview.logoUrl}
          alt=""
          width={72}
          height={72}
          unoptimized
          className={styles.logo}
        />
      )}
      <div className={styles.typeBadge}>
        {ENTITY_TYPE_LABELS[preview.entityType] ?? preview.entityType}
      </div>
      <h1 className={styles.title}>{preview.entityName}</h1>
      {preview.description && (
        <p className={styles.description}>{preview.description}</p>
      )}
      <p className={styles.memberCount}>{preview.memberCount} عضو</p>
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────
export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [policy, setPolicy] = useState<EntityPolicy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [relationshipDescription, setRelationshipDescription] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedEntityId, setJoinedEntityId] = useState<string | null>(null);
  const [joinedEntityName, setJoinedEntityName] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const isLoggedIn = typeof window !== 'undefined' && !!getToken();

  useEffect(() => {
    if (!token) return;
    getInvitationPreview(token)
      .then((p) => {
        setPreview(p);
        getEntityPolicy(p.entityId).then(setPolicy).catch(() => {});
      })
      .catch(() => setLoadError('رابط الدعوة غير صالح أو منتهي الصلاحية'));
  }, [token]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const context = {
        relationshipDescription: relationshipDescription.trim() || undefined,
        sponsorName: sponsorName.trim() || undefined,
        note: note.trim() || undefined,
      };
      if (isLoggedIn) {
        const res = await joinMeViaInvitation(token, context);
        setJoinedEntityId(res.entityId);
        setJoinedEntityName(preview?.entityName ?? null);
      } else {
        if (!name.trim()) {
          setError('الاسم مطلوب');
          setSubmitting(false);
          return;
        }
        const res = await joinViaInvitation(token, {
          name: name.trim(),
          ...context,
        });
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('personId', res.person.id);
        localStorage.setItem('personName', res.person.name);
        document.cookie = `accessToken=${res.accessToken}; path=/; max-age=900; samesite=lax`;
        setIsUnverified(!res.person.isVerified);
        setJoinedEntityId(preview?.entityId ?? null);
        setJoinedEntityName(preview?.entityName ?? null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  }

  // ── حالات خطأ وتحميل ────────────────────────────────────────────────
  if (loadError) {
    return (
      <main className={styles.page}>
        <div className={`${styles.panel} ${styles.centeredPanel}`}>
          <div className={styles.stateIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>رابط غير صالح</h2>
          <p className={styles.muted}>{loadError}</p>
        </div>
      </main>
    );
  }

  if (!preview) {
    return (
      <main className={styles.page}>
        <p className={styles.muted}>جاري التحميل...</p>
      </main>
    );
  }

  // ── حالة: تم الانضمام أو إرسال الطلب ────────────────────────────────
  if (joinedEntityId) {
    return (
      <main className={styles.page}>
        <div className={`${styles.panel} ${styles.successPanel}`}>
          <div className={styles.successIcon}>⏳</div>
          <h2 className={styles.title}>تم إرسال طلب انضمامك لـ {joinedEntityName}</h2>
          <p className={styles.muted}>طلبك الآن بانتظار مراجعة الإدارة والموافقة عليه بناءً على قواعد الكيان.</p>

          {isUnverified && (
            <div className={styles.warning}>
              <strong>حسابك غير مفعّل</strong> — لتسريع قبولك ولتتمكن من التفاعل بالكامل، نرجو تفعيل حسابك من ملفك الشخصي.
            </div>
          )}

          <div className={styles.actions}>
            <button
              onClick={() => router.push('/dashboard')}
              className={styles.primaryButton}
            >
              متابعة حالة الطلب ←
            </button>
            {isUnverified && (
              <button
                onClick={() => router.push('/profile')}
                className={styles.secondaryButton}
              >
                فعّل حسابك
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── حالة: نموذج الانضمام ────────────────────────────────────────────
  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <EntityPreview preview={preview} />

        
        <div className={styles.preJoinFlow}>
          <div className={styles.preJoinSteps}>
            <div className={styles.preJoinStep}>
              <span className={styles.preJoinBubble}>1</span>
              <span className={styles.preJoinLabel}>تقديم طلب الانضمام</span>
            </div>
            <div className={styles.preJoinArrow}>←</div>
            <div className={styles.preJoinStep}>
              <span className={`${styles.preJoinBubble} ${styles.preJoinBubbleDim}`}>2</span>
              <span className={`${styles.preJoinLabel} ${styles.preJoinLabelDim}`}>مراجعة الإدارة</span>
            </div>
            <div className={`${styles.preJoinArrow} ${styles.preJoinArrowDim}`}>←</div>
            <div className={styles.preJoinStep}>
              <span className={`${styles.preJoinBubble} ${styles.preJoinBubbleDim}`}>3</span>
              <span className={`${styles.preJoinLabel} ${styles.preJoinLabelDim}`}>تفعيل العضوية</span>
            </div>
          </div>
          <p className={styles.preJoinNote}>
            إرسال الطلب هو الخطوة الأولى. بناءً على قواعد الكيان، قد يتطلب طلبك موافقة المشرفين لتفعيل عضويتك.
          </p>
        </div>

        {policy && (
          <div className={styles.policyTermsBox}>
            <div className={styles.policyTermsTitle}>شروط الانضمام</div>
            <ul className={styles.policyTermsList}>
              <li>
                {policy.requiresMemberApproval
                  ? "✓ يتطلب موافقة الإدارة — طلبك سيُراجَع قبل التفعيل"
                  : "✓ قبول فوري — عضويتك تُفعَّل فور إرسال الطلب"}
              </li>
              <li>
                {policy.allowOpenMembership
                  ? "✓ العضوية مفتوحة لمن يملك رابط الدعوة"
                  : "✓ العضوية بدعوة شخصية فقط"}
              </li>
              {policy.allowAppeals && (
                <li>
                  ✓ يمكنك الاعتراض على قرار رفض الطلب خلال {policy.appealTimeoutDays} يوم
                </li>
              )}
            </ul>
          </div>
        )}

        <hr className={styles.divider} />

        <h2 className={styles.sectionTitle}>
          {isLoggedIn ? 'تقديم طلب انضمام' : 'أنشئ حسابك وقدم الطلب'}
        </h2>

        <form onSubmit={handleJoin}>
          {!isLoggedIn && (
            <div className={styles.field}>
              <label className={styles.label}>
                الاسم الكامل <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك الكامل"
                required
                minLength={2}
                className={styles.input}
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>ما علاقتك بالكيان؟</label>
            <input
              type="text"
              value={relationshipDescription}
              onChange={(e) => setRelationshipDescription(e.target.value)}
              placeholder="مثال: أحد أفراد العائلة أو موظف في الجهة"
              maxLength={240}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>اسم المعرّف أو الداعي</label>
            <input
              type="text"
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              placeholder="اختياري"
              maxLength={120}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>ملاحظة للإدارة</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أي معلومات تساعد الإدارة على مراجعة الطلب"
              maxLength={500}
              rows={4}
              className={styles.input}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className={styles.primaryButton}
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </form>

        {!isLoggedIn && (
          <p className={styles.finePrint}>
            بإرسال الطلب تُنشئ حساباً بدون تفعيل.
            يمكنك تفعيله لاحقاً من ملفك الشخصي.
          </p>
        )}
      </div>
    </main>
  );
}
