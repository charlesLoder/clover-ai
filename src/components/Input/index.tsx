import React from "react";
import styles from "./style.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  customSize?: "small" | "medium" | "large";
  error?: string;
  helperText?: string;
  label?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  customSize = "medium",
  style,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={styles.container} data-error={!!error} data-size={customSize}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        {...props}
        id={inputId}
        style={style}
        aria-describedby={helperText ? inputId + "-helper-text" : undefined}
        aria-invalid={!!error}
        aria-errormessage={error ? inputId + "-error-message" : undefined}
      />
      {helperText && (
        <div className={styles.helperText} id={inputId + "-helper-text"}>
          {helperText}
        </div>
      )}
      {error && (
        <div className={styles.helperText} id={inputId + "-error-message"} aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
};
