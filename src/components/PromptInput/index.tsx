import type { FC } from "react";
import React from "react";
import styles from "./style.module.css";

export interface PromptInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  placeholder?: string;
  children?: React.ReactNode;
}

export const PromptInput: FC<PromptInputProps> = ({
  error,
  placeholder = "What would you like to know?",
  children,
  ...rest
}) => {
  return (
    <div className={styles.promptInputContainer} data-role="prompt-input">
      {error && <div className={styles.errorMessage}>{error}</div>}
      <div className={styles.promptInput} data-error={!!error}>
        <textarea
          aria-label="Write your prompt to chat with a model"
          placeholder={placeholder}
          {...rest}
        ></textarea>
        {children && <div className={styles.childrenContainer}>{children}</div>}
      </div>
    </div>
  );
};
