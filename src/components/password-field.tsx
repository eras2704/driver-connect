"use client";

import { useId, useState, type ComponentPropsWithoutRef } from "react";

type PasswordFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & { label: string };

export function PasswordField({ label, id, disabled, className = "", ...props }: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  const revealed = visible && !disabled;
  const action = `${revealed ? "Ocultar" : "Mostrar"} ${label.toLocaleLowerCase("es")}`;
  return <div className="password-field">
    <label htmlFor={inputId}>{label}</label>
    <div className="password-control">
      <input {...props} id={inputId} disabled={disabled} className={className} type={revealed ? "text" : "password"} autoCapitalize="none" spellCheck={false} />
      <button type="button" className="password-toggle" aria-label={action} title={action} aria-controls={inputId} disabled={disabled} onClick={() => setVisible(value => !value)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {revealed && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  </div>;
}
