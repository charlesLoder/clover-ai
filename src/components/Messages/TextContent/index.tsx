import { Gear } from "@icons";
import { TextContent as ITextContent, Role } from "@types";
import type { FC } from "react";
import Markdown from "react-markdown";
import style from "./style.module.css";

export interface TextContentProps<T extends Role> extends React.HTMLAttributes<HTMLDivElement> {
  role: T;
  type: T extends "assistant" ? "response" | "tool-call" : "text";
  textContent: ITextContent;
}

/**
 * A component that displays text content with a specific role used in rendering the content of a message.
 */
export const TextContent: FC<TextContentProps<Role>> = ({ textContent, role, type, ...props }) => {
  return (
    <div
      className={style.textContent}
      data-role={role}
      data-role-type={type}
      data-type="text-content"
      {...props}
    >
      {type === "tool-call" && <Gear />}
      <Markdown>{textContent.content}</Markdown>
    </div>
  );
};
