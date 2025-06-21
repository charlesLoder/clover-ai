import type { FC } from "react";
import styles from "./style.module.css";

/**
 * Wrap content that should be displayed in the Clover-IIIF panel.
 *
 * @remarks
 * This is a top level comoinents that wraps all the content in a panel.
 * It provides CSS for overriding Clover-IIIF's default styles.
 */
export const PanelWrapper: FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  return (
    <div className={styles.panelWrapper} {...props}>
      {children}
    </div>
  );
};
