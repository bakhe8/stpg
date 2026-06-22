"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { register, type AuthResponse } from "../../lib/api/auth";
import styles from "../login/login.module.css";
import Link from "next/link";

function completeLogin(response: AuthResponse) {
  localStorage.setItem("accessToken", response.accessToken);
  localStorage.setItem("refreshToken", response.refreshToken);
  localStorage.setItem("personId", response.person.id);
  localStorage.setItem("personName", response.person.name);
  document.cookie = `accessToken=${response.accessToken}; path=/; max-age=900; samesite=lax`;
  window.location.replace("/dashboard");
}

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    entityId: "",
    branchOrFamily: "",
    recommenderName: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("كلمة المرور غير متطابقة");
      return;
    }
    if (!formData.entityId.trim()) {
      setError("يرجى إدخال رمز الكيان");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await register({
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password,
        entityId: formData.entityId.trim(),
        branchOrFamily: formData.branchOrFamily.trim(),
        recommenderName: formData.recommenderName.trim(),
        notes: formData.notes.trim(),
      });
      // Registration successful, person is Pending Applicant but got token
      completeLogin(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فشل إنشاء الحساب");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.shape} ${styles.shape1}`} aria-hidden="true" />
      <div className={`${styles.shape} ${styles.shape2}`} aria-hidden="true" />

      <div className={`${styles.glassCard} ${styles.joinCard}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>طلب انضمام</h1>
          <p className={styles.subtitle}>
            أنشئ حسابك وقدم طلب عضوية في الكيان
          </p>
        </header>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleRegisterSubmit}>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>الاسم الرباعي</label>
            <input
              className={styles.input}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              disabled={isLoading}
              placeholder="مثال: محمد أحمد عبدالله"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>رقم الجوال</label>
            <input
              className={styles.input}
              type="tel"
              dir="ltr"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              required
              disabled={isLoading}
              placeholder="+9665xxxxxxxx"
            />
          </div>

          <div className={styles.joinFlexRow}>
            <div className={`${styles.inputGroup} ${styles.joinFlexItem}`}>
              <label className={styles.label}>كلمة المرور</label>
              <input
                className={styles.input}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                disabled={isLoading}
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <div className={`${styles.inputGroup} ${styles.joinFlexItem}`}>
              <label className={styles.label}>تأكيد كلمة المرور</label>
              <input
                className={styles.input}
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
                disabled={isLoading}
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </div>

          <hr className={styles.joinDivider} />

          <div className={styles.inputGroup}>
            <label className={styles.label}>معرف الكيان (Entity ID)</label>
            <input
              className={styles.input}
              type="text"
              dir="ltr"
              value={formData.entityId}
              onChange={(e) => setFormData({...formData, entityId: e.target.value})}
              required
              disabled={isLoading}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>الفرع / الأسرة / الفخذ (اختياري)</label>
            <input
              className={styles.input}
              type="text"
              value={formData.branchOrFamily}
              onChange={(e) => setFormData({...formData, branchOrFamily: e.target.value})}
              disabled={isLoading}
              placeholder="إلى أي أسرة أو فخذ تنتمي؟"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>شخص مزكّي (اختياري)</label>
            <input
              className={styles.input}
              type="text"
              value={formData.recommenderName}
              onChange={(e) => setFormData({...formData, recommenderName: e.target.value})}
              disabled={isLoading}
              placeholder="اسم عضو موجود يزكيك (إن وجد)"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>ملاحظات (اختياري)</label>
            <textarea
              className={`${styles.input} ${styles.joinTextarea}`}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              disabled={isLoading}
              placeholder="أي ملاحظات إضافية ترغب بتقديمها لمشرف العضويات..."
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || !formData.name || !formData.phoneNumber || !formData.password || !formData.entityId}
          >
            {isLoading ? <span className={styles.loader} /> : "إنشاء حساب وتقديم الطلب"}
          </button>

          <div className={styles.joinPrompt}>
            <span>لديك حساب بالفعل؟</span>
            <Link href="/login" className={styles.joinLink}>
              تسجيل الدخول
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
