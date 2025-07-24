import { Message } from "@components";
import { ConversationState, Message as IMessage } from "@types";
import { type FC, useCallback, useLayoutEffect, useRef, useState } from "react";
import style from "./style.module.css";

export interface MessagesContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: IMessage[];
  conversationState: ConversationState;
}

/**
 * Render an array of messages
 */
export const MessagesContainer: FC<MessagesContainerProps> = ({
  messages,
  conversationState,
  ...props
}) => {
  // fillerHeight is used to set the height of the filler element
  // allowing the latest user message to scroll to the top of the container
  // and ensuring there is no layout shift after the next assistant message is added.
  const [fillerHeight, setFillerHeight] = useState(0);
  const fillerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // When the component mounts, scroll to the bottom of the container
    // but set the filler height to 0
    // meaning there is no white space at the bottom of the container
    // though the last user message won't be at the top of the container.
    if (fillerRef.current) {
      setFillerHeight(0);
      fillerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  useLayoutEffect(() => {
    // When a new user message is added,
    // the user message should be forced to the top of the container
    if (fillerHeight && fillerRef.current && messages[messages.length - 1]?.role !== "assistant") {
      fillerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [fillerHeight, messages]);

  const messageRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || messages.length === 0) {
        return;
      }

      const currentMessage = messages[messages.length - 1];
      const currentMessageHeight = node.clientHeight;
      const containerHeight = node.parentElement?.clientHeight || 0;

      switch (currentMessage.role) {
        case "assistant": {
          // If the last message is from the assistant, we want to ensure that the filler height
          // is set to the height of the container minus the height of the current message and the height of the previous user message.
          // ensuring that if the assistant message does not fill the container,
          // then there will be white space at the bottom of the container ensuring no layout shift.
          const previousMssgHeight = node.previousElementSibling?.clientHeight || 0;
          setFillerHeight(containerHeight - currentMessageHeight - previousMssgHeight);
          break;
        }

        default:
          // If the last message is from the user, we want to ensure that the filler height
          // is set to the height of the container minus the height of the current message
          // allowing the latest user message to scroll to the top.
          setFillerHeight(containerHeight - currentMessageHeight);
          break;
      }
    },
    [messages],
  );

  return (
    <div className={style.messagesContainer} data-state={conversationState} {...props}>
      {messages.map((mssg, i) => (
        <Message
          key={`message-${i}`}
          message={mssg}
          ref={i === messages.length - 1 ? messageRef : undefined}
        />
      ))}
      <div
        data-role="filler"
        ref={fillerRef}
        style={{
          // the --gap variable is used to ensure the filler height takes into account the gap between messages
          // the variable is set in the style.module.css file
          height: `calc(${fillerHeight}px - (var(--gap) * ${
            messages.length > 0 && messages[messages.length - 1].role === "assistant" ? 2 : 1
          }))`,
        }}
      />
    </div>
  );
};
