"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { devLogin, login, type AuthResponse } from "../../lib/api/auth";
import styles from "./login.module.css";
import Link from "next/link";
import PhoneInput, { toE164 } from "../../components/shared/PhoneInput";

type LoginMode = "login" | "dev";

const DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";

function completeLogin(response: AuthResponse) {
  if (
    !response?.accessToken ||
    !response.refreshToken ||
    !response.person?.id
  ) {
    throw new Error("تعذر تسجيل الدخول. الرجاء التحقق من البيانات والمحاولة مرة أخرى.");
  }

  localStorage.setItem("accessToken", response.accessToken);
  localStorage.setItem("refreshToken", response.refreshToken);
  localStorage.setItem("personId", response.person.id);
  localStorage.setItem("personName", response.person.name);
  document.cookie = `accessToken=${response.accessToken}; path=/; max-age=900; samesite=lax`;
  window.location.replace("/dashboard");
}

export default function LoginForm() {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<LoginMode>("login");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoginSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      completeLogin(await login(toE164(phoneNumber), password));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDevSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      completeLogin(await devLogin(username.trim()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("devLoginFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.shape} ${styles.shape1}`} aria-hidden="true" />
      <div className={`${styles.shape} ${styles.shape2}`} aria-hidden="true" />

      <div className={styles.glassCard}>
        <header className={styles.header}>
          <h1 className={styles.title}>CollectiveTrustOS</h1>
          <p className={styles.subtitle}>
            {mode === "dev" ? t("subtitle_dev") : t("subtitle_login")}
          </p>
        </header>

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {mode === "login" ? (
          <form className={styles.form} onSubmit={handleLoginSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="phone-input" className={styles.label}>
                {t("phoneLabel")}
              </label>
              <PhoneInput
                id="phone-input"
                value={phoneNumber}
                onChange={(digits) => { setPhoneNumber(digits); setError(null); }}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor="password-input" className={styles.label}>
                {t("passwordLabel")}
              </label>
              <input
                id="password-input"
                type="password"
                placeholder="••••••••"
                className={styles.input}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || phoneNumber.length < 8 || !password.trim()}
            >
              {isLoading ? <span className={styles.loader} /> : t("loginBtn")}
            </button>

            <div className={styles.joinPrompt}>
              <span>{t("noAccount")}</span>
              <Link href="/join" className={styles.joinLink}>
                {t("joinNow")}
              </Link>
            </div>
          </form>
        ) : null}

        {mode === "dev" ? (
          <form className={styles.form} onSubmit={handleDevSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="username-input" className={styles.label}>
                {t("devUsernameLabel")}
              </label>
              <input
                id="username-input"
                className={styles.input}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setError(null);
                }}
                disabled={isLoading}
                required
              />
            </div>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? <span className={styles.loader} /> : t("devLogin")}
            </button>
          </form>
        ) : null}

        {DEV_LOGIN_ENABLED && (
          <button
            type="button"
            className={styles.modeSwitch}
            onClick={() => {
              setMode(mode === "dev" ? "login" : "dev");
              setError(null);
            }}
          >
            {mode === "dev" ? t("switchToLogin") : t("switchToDev")}
          </button>
        )}
      </div>
    </div>
  );
}
