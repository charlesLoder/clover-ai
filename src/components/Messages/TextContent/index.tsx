import { TextContent as ITextContent, Role } from "@types";
import type { FC } from "react";
import Markdown from "react-markdown";
import style from "./style.module.css";

export interface TextContentProps extends React.HTMLAttributes<HTMLDivElement> {
  role: Role;
  textContent: ITextContent;
}

/**
 * A component that displays text content with a specific role used in rendering the content of a message.
 */
export const TextContent: FC<TextContentProps> = ({ textContent, role, ...props }) => {
  return (
    <div className={style.textContent} data-role={role} {...props}>
      <Markdown>{textContent.content}</Markdown>
    </div>
  );
};
