import { Figure, type FigureProps } from "@components";
import React, { useState } from "react";
import styles from "./style.module.css";

export interface ImageSelectProps extends FigureProps {
  initialState: "selected" | "unselected" | "disabled";
  onSelectionChange?: (selected: boolean) => void;
}

/**
 * A wrapper around the `<Figure>` component that allows for selection of images.
 */
export const ImageSelect: React.FC<ImageSelectProps> = ({
  initialState = "unselected",
  onSelectionChange,
  ...figureProps
}) => {
  const [internalState, setInternalState] = useState(initialState);

  const handleClick = () => {
    switch (internalState) {
      case "disabled":
        break;
      case "selected":
        setInternalState("unselected");
        onSelectionChange?.(false);
        break;
      case "unselected":
        setInternalState("selected");
        onSelectionChange?.(true);
        break;
      default:
        break;
    }
  };

  return (
    <button className={styles.container} data-state={internalState} onClick={handleClick}>
      <Figure {...figureProps} />
      <div className={styles.overlay} data-state={internalState} />
      <div className={styles.checkmark} data-state={internalState}>
        ✓
      </div>
    </button>
  );
};
