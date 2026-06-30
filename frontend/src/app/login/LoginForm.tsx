"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { devLogin, login, sendOtp, verifyOtp, type AuthResponse } from "../../lib/api/auth";
import styles from "./login.module.css";
import Link from "next/link";
import PhoneInput, { toE164 } from "../../components/shared/PhoneInput";

type LoginMode = "phone" | "otp" | "login" | "dev";

const DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true";
const OTP_LENGTH = 6;

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
  const [mode, setMode] = useState<LoginMode>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function resetMessages() {
    setError(null);
  }

  async function requestOtp() {
    setIsLoading(true);
    setError(null);
    try {
      await sendOtp(toE164(phoneNumber));
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setMode("otp");
      setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("otpSendFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleSendOtp(event: React.FormEvent) {
    event.preventDefault();
    void requestOtp();
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== OTP_LENGTH) return;
    setIsLoading(true);
    setError(null);
    try {
      completeLogin(await verifyOtp(toE164(phoneNumber), code));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("otpInvalid"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleOtpDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    resetMessages();
    if (digit && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

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

  function subtitleFor(currentMode: LoginMode) {
    if (currentMode === "dev") return t("subtitle_dev");
    if (currentMode === "login") return t("subtitle_login");
    if (currentMode === "otp") return t("subtitle_otp", { phoneNumber: toE164(phoneNumber) });
    return t("subtitle_phone");
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.shape} ${styles.shape1}`} aria-hidden="true" />
      <div className={`${styles.shape} ${styles.shape2}`} aria-hidden="true" />

      <div className={styles.glassCard}>
        <header className={styles.header}>
          <h1 className={styles.title}>CollectiveTrustOS</h1>
          <p className={styles.subtitle}>{subtitleFor(mode)}</p>
        </header>

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}

        {mode === "phone" ? (
          <form className={styles.form} onSubmit={handleSendOtp}>
            <div className={styles.inputGroup}>
              <label htmlFor="phone-input" className={styles.label}>
                {t("phoneLabel")}
              </label>
              <PhoneInput
                id="phone-input"
                value={phoneNumber}
                onChange={(digits) => { setPhoneNumber(digits); resetMessages(); }}
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || phoneNumber.length < 8}
            >
              {isLoading ? <span className={styles.loader} /> : t("sendCode")}
            </button>

            <div className={styles.joinPrompt}>
              <span>{t("noAccount")}</span>
              <Link href="/join" className={styles.joinLink}>
                {t("joinNow")}
              </Link>
            </div>
          </form>
        ) : null}

        {mode === "otp" ? (
          <form className={styles.form} onSubmit={handleVerifyOtp}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>{t("otpLabel")}</label>
              <div className={styles.otpContainer}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={styles.otpInput}
                    value={digit}
                    onChange={(event) => handleOtpDigitChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    disabled={isLoading}
                    aria-label={`${t("otpLabel")} ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || otpDigits.join("").length !== OTP_LENGTH}
            >
              {isLoading ? <span className={styles.loader} /> : t("confirmLogin")}
            </button>

            <button
              type="button"
              className={styles.resendBtn}
              disabled={isLoading}
              onClick={() => void requestOtp()}
            >
              {t("sendCode")}
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={isLoading}
              onClick={() => { setMode("phone"); resetMessages(); }}
            >
              {t("changePhone")}
            </button>
          </form>
        ) : null}

        {mode === "login" ? (
          <form className={styles.form} onSubmit={handleLoginSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="phone-input-pw" className={styles.label}>
                {t("phoneLabel")}
              </label>
              <PhoneInput
                id="phone-input-pw"
                value={phoneNumber}
                onChange={(digits) => { setPhoneNumber(digits); resetMessages(); }}
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
                  resetMessages();
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
                  resetMessages();
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

        {mode === "phone" || mode === "login" ? (
          <button
            type="button"
            className={styles.modeSwitch}
            onClick={() => {
              setMode(mode === "phone" ? "login" : "phone");
              resetMessages();
            }}
          >
            {mode === "phone" ? t("switchToLogin") : t("switchToPhone")}
          </button>
        ) : null}

        {DEV_LOGIN_ENABLED && (mode === "phone" || mode === "login" || mode === "dev") ? (
          <button
            type="button"
            className={styles.modeSwitch}
            onClick={() => {
              setMode(mode === "dev" ? "phone" : "dev");
              resetMessages();
            }}
          >
            {mode === "dev" ? t("switchToPhone") : t("switchToDev")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
