"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { platformLogin } from "../../../lib/api/platform";
import styles from "./login.module.css";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await platformLogin(email, password);
      void router.push("/platform");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>دخول فريق المنصة</h1>
        <p className={styles.subtitle}>
          CollectiveTrustOS — Platform Operators
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className={styles.form}>
          <label className={styles.label} htmlFor="platform-email">
            البريد الإلكتروني
          </label>
          <input
            id="platform-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@platform.com"
            required
            autoComplete="email"
          />

          <label className={styles.label} htmlFor="platform-password">
            كلمة المرور
          </label>
          <input
            id="platform-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="current-password"
          />

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
