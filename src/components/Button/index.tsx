import type { FC } from "react";
import styles from "./style.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  shape?: "pill" | "circle";
  size?: "small" | "medium" | "large";
  state?: "idle" | "loading" | "error";
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

/**
 * A button component with customizable shape, size, state, and variant.
 */
export const Button: FC<ButtonProps> = ({
  variant = "primary",
  size = "medium",
  shape = "pill",
  state = "idle",
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      {...props}
      className={styles.button}
      data-shape={shape}
      data-size={size}
      data-state={state}
      data-variant={variant}
      disabled={state === "loading" || disabled}
    >
      {children}
    </button>
  );
};
