"use client";

import React, { useState } from "react";
import { register, type AuthResponse } from "../../lib/api/auth";
import styles from "../login/login.module.css";
import Link from "next/link";
import PhoneInput, { toE164 } from "../../components/shared/PhoneInput";

function completeLogin(response: AuthResponse) {
  localStorage.setItem("accessToken", response.accessToken);
  localStorage.setItem("refreshToken", response.refreshToken);
  localStorage.setItem("personId", response.person.id);
  localStorage.setItem("personName", response.person.name);
  document.cookie = `accessToken=${response.accessToken}; path=/; max-age=900; samesite=lax`;
  window.location.replace("/dashboard");
}

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("كلمة المرور غير متطابقة");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      completeLogin(
        await register({
          name: name.trim(),
          phoneNumber: toE164(phone),
          password,
        })
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "فشل إنشاء الحساب");
    } finally {
      setIsLoading(false);
    }
  }

  const canSubmit = name.trim() && phone.length === 8 && password.length >= 6 && confirmPassword;

  return (
    <div className={styles.container}>
      <div className={`${styles.shape} ${styles.shape1}`} aria-hidden="true" />
      <div className={`${styles.shape} ${styles.shape2}`} aria-hidden="true" />

      <div className={`${styles.glassCard} ${styles.joinCard}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>إنشاء حساب</h1>
          <p className={styles.subtitle}>
            سجّل حسابك ثم انضم لصندوقك عبر رابط الدعوة
          </p>
        </header>

        {error && (
          <div className={styles.error} role="alert">{error}</div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>

          <div className={styles.inputGroup}>
            <label className={styles.label}>الاسم الكامل</label>
            <input
              className={`${styles.input} ${styles.nameInput}`}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              required
              disabled={isLoading}
              placeholder="محمد أحمد عبدالله"
              minLength={3}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>رقم الجوال</label>
            <PhoneInput
              value={phone}
              onChange={(d) => { setPhone(d); setError(null); }}
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.joinFlexRow}>
            <div className={`${styles.inputGroup} ${styles.joinFlexItem}`}>
              <label className={styles.label}>كلمة المرور</label>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                required
                disabled={isLoading}
                minLength={6}
                placeholder="٦ أحرف على الأقل"
              />
            </div>
            <div className={`${styles.inputGroup} ${styles.joinFlexItem}`}>
              <label className={styles.label}>تأكيد كلمة المرور</label>
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                required
                disabled={isLoading}
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? <span className={styles.loader} /> : "إنشاء الحساب"}
          </button>

          <div className={styles.joinPrompt}>
            <span>لديك حساب بالفعل؟</span>
            <Link href="/login" className={styles.joinLink}>تسجيل الدخول</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
