import type { Message as IMessage } from "@types";
import type { FC } from "react";
import { MediaContent } from "../MediaContent";
import { TextContent } from "../TextContent";

export interface MessageProps {
  message: IMessage;
}

/**
 *  Render a single message in a conversation.
 */
export const Message: FC<MessageProps> = ({ message }) => {
  return (
    <>
      {message.role === "assistant" && (
        <TextContent role={message.role} textContent={message.content} />
      )}
      {message.role === "user" &&
        message.content.map((content, index) => {
          return content.type === "text" ? (
            <TextContent key={index} role={message.role} textContent={content} />
          ) : content.type === "media" ? (
            <MediaContent content={content} key={index} role={message.role} />
          ) : null;
        })}
    </>
  );
};
