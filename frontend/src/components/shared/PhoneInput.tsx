"use client";

import React from "react";
import styles from "./PhoneInput.module.css";

interface PhoneInputProps {
  value: string;
  onChange: (digits: string) => void;
  disabled?: boolean;
  id?: string;
  required?: boolean;
}

/** يقبل 8 أرقام بعد البادئة 05 ويُرجع +9665XXXXXXXX عبر toE164 */
export function toE164(digits: string): string {
  return `+9665${digits}`;
}

export default function PhoneInput({
  value,
  onChange,
  disabled,
  id,
  required,
}: PhoneInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    onChange(digits);
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.prefix}>05</span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        placeholder="xxxxxxxx"
        maxLength={8}
        className={styles.input}
        aria-label="رقم الجوال بعد 05"
      />
    </div>
  );
}
