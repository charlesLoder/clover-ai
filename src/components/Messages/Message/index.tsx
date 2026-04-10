import type { Message as IMessage } from "@types";
import { forwardRef } from "react";
import { AnnotationContent } from "../AnnotationContent";
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
          switch (content.type) {
            case "text":
              return (
                <TextContent key={index} role={message.role} textContent={content} type="text" />
              );
            case "media":
              return <MediaContent content={content} key={index} role={message.role} />;
            case "annotation":
              return <AnnotationContent content={content} key={index} role={message.role} />;
            default:
              return null;
          }
        })}
    </div>
  );
});

Message.displayName = "Message";
