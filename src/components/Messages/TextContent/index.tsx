import { Gear } from "@icons";
import { TextContent as ITextContent, Role } from "@types";
import type { FC } from "react";
import Markdown from "react-markdown";
import style from "./style.module.css";

export interface TextContentProps<T extends Role> extends React.HTMLAttributes<HTMLDivElement> {
  role: T;
  mode: T extends "assistant" ? "text" | "tool" : "text";
  textContent: ITextContent;
}

/**
 * A component that displays text content with a specific role used in rendering the content of a message.
 */
export const TextContent: FC<TextContentProps<Role>> = ({ textContent, role, mode, ...props }) => {
  return (
    <div
      className={style.textContent}
      data-mode={mode}
      data-role={role}
      data-type="text-content"
      {...props}
    >
      {mode === "tool" && <Gear />}
      <Markdown>{textContent.content}</Markdown>
    </div>
  );
};
