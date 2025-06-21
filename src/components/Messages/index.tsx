import { Message } from "@components";
import { Message as IMessage } from "@types";
import type { FC } from "react";
import style from "./style.module.css";

export interface MessagesContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: IMessage[];
}

/**
 * Render an array of messages
 */
export const MessagesContainer: FC<MessagesContainerProps> = ({ messages, ...props }) => {
  return (
    <div className={style.messagesContainer} {...props}>
      {messages
        .filter((m) => m.role !== "system")
        .map((mssg, i) => (
          <Message key={`message-${i}`} message={mssg} />
        ))}
    </div>
  );
};
