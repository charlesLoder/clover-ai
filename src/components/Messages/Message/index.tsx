import type { Message as IMessage } from "@types";
import { forwardRef } from "react";
import { MediaContent } from "../MediaContent";
import { TextContent } from "../TextContent";
import style from "./style.module.css";

export interface MessageProps {
  message: IMessage;
}

/**
 *  Render a single message in a conversation.
 */
export const Message = forwardRef<HTMLDivElement, MessageProps>(({ message }, ref) => {
  return (
    <div className={style.message} data-role={message.role} data-type="message" ref={ref}>
      {message.role === "assistant" && (
        <TextContent role={message.role} textContent={message.content} type={message.type} />
      )}
      {message.role === "user" &&
        message.content.map((content, index) => {
          return content.type === "text" ? (
            <TextContent key={index} role={message.role} textContent={content} type="text" />
          ) : content.type === "media" ? (
            <MediaContent content={content} key={index} role={message.role} />
          ) : null;
        })}
    </div>
  );
});

Message.displayName = "Message";
