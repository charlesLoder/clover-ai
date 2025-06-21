import React from "react";
import styles from "./style.module.css";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  customSize?: "small" | "medium" | "large";
  error?: string;
  helperText?: string;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: "default" | "bordered" | "filled";
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  variant = "default",
  customSize = "medium",
  leftIcon,
  rightIcon,
  className,
  style,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={styles.container}>
      {label && (
        <label className={styles.label} data-error={!!error} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {leftIcon && <div className={`${styles.icon} ${styles.leftIcon}`}>{leftIcon}</div>}
        <input
          {...props}
          className={`${styles.input} ${className || ""}`}
          data-error={!!error}
          data-left-icon={!!leftIcon}
          data-right-icon={!!rightIcon}
          data-size={customSize}
          data-variant={variant}
          id={inputId}
          style={style}
        />
        {rightIcon && <div className={`${styles.icon} ${styles.rightIcon}`}>{rightIcon}</div>}
      </div>
      {(error || helperText) && (
        <div className={styles.helperText} data-error={!!error}>
          {error || helperText}
        </div>
      )}
    </div>
  );
};
