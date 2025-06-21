import { Button } from "@components";
import { Close } from "@icons";
import React from "react";
import style from "./style.module.css";

interface DialogProps extends React.HTMLAttributes<HTMLDialogElement> {
  /**
   * The position of the dialog on the screen.
   * - "center": The dialog is centered in the viewport.
   * - "visual_center": The dialog is positioned at the visual center of the screen, about 1/4 of the way down from the top.
   */
  position?: "center" | "visual_center";
  /**
   * The width of the dialog.
   *
   * - "default": The dialog width is determined by the user agent stylesheet (not the auto keyword).
   * - "stretched": The dialog width is set to 60% or 300px, whichever is larger.
   * - "full_screen": The dialog width is set to 100% of the viewport width.
   */
  width?: "default" | "stretched" | "full_screen";
  /**
   * Callback function to be called when the dialog is closed.
   */
  onCloseCallback?: () => void;
}

/**
 * Dialog component that provides a modal dialog interface.
 *
 * It supports different positions and widths, and includes a close button.
 *
 * ### Example
 *
 * ```jsx
 * <Dialog position="visual_center" width="stretched">
 *  <h1>Dialog Title</h1>
 *  <p>This is the dialog content.</p>
 * </Dialog>
 * ```
 */
export const Dialog = React.forwardRef<HTMLDialogElement, DialogProps>(
  ({ width = "default", position = "center", onCloseCallback, ...props }, ref) => {
    function closeDialog(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
      const dialog = e.currentTarget.closest("dialog");
      dialog?.close();
      if (onCloseCallback) onCloseCallback();
    }
    return (
      <dialog
        data-position={position}
        data-width={width}
        ref={ref}
        {...props}
        className={style.dialog}
      >
        <div className={style.contentContainer}>{props.children}</div>
        <Button
          aria-label="Close dialog"
          shape="circle"
          size="small"
          title="Close dialog"
          variant="ghost"
          onClick={closeDialog}
        >
          <Close />
        </Button>
      </dialog>
    );
  },
);

Dialog.displayName = "Dialog";
