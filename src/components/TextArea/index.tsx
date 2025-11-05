import type { FC } from "react";
import React from "react";
import styles from "./style.module.css";

export interface TextareaProps extends React.HTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelDisplay?: "hidden" | "visible";
  error?: string;
  helperText?: string;
  variant?: "default" | "bordered" | "filled";
  size?: "small" | "medium" | "large";
  id?: string;
  children?: React.ReactNode;
}

export const Textarea: FC<TextareaProps> = ({
  label,
  labelDisplay = "visible",
  error,
  helperText,
  variant = "default",
  size = "medium",
  children,
  ...rest
}) => {
  const textareaId = `textarea-contenteditable-container`;
  const labelId = `textarea-label`;
  const helperId = `textarea-helper`;

  return (
    <div className={styles.container}>
      {label && (
        <label
          className={labelDisplay === "hidden" ? styles.visuallyHidden : styles.label}
          data-error={!!error}
          htmlFor={textareaId}
          id={labelId}
        >
          {label}
        </label>
      )}
      <div
        aria-describedby={helperId}
        aria-labelledby={label ? labelId : undefined}
        className={styles.textareaWrapper}
        data-error={!!error}
        data-size={size}
        data-variant={variant}
        id={textareaId}
      >
        <textarea placeholder={labelDisplay === "hidden" ? label : undefined} {...rest}></textarea>
        {children && <div className={styles.childrenContainer}>{children}</div>}
      </div>
      {(error || helperText) && (
        <div className={styles.helperText} data-error={!!error} id={helperId}>
          {error || helperText}
        </div>
      )}
    </div>
  );
};
