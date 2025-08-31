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
    if (fillerHeight && fillerRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) {
        return;
      }
      // When a new message is added,
      // if it is a user message, it should be forced to the top of the container
      if (lastMessage.role !== "assistant") {
        fillerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }

      // if the last message is a tool call, we just want it to scroll into view to the nearest edge
      if (lastMessage.role == "assistant" && lastMessage.mode === "tool") {
        fillerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
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
          const previousMssgHeight = node.previousElementSibling?.clientHeight || 0;
          switch (currentMessage.mode) {
            // If the last message is the response from the assistant, adjust the filler height
            // to the height of the container, minus the height of the previous message, and minus the height of the current message,
            // ensuring that if the assistant message does not fill the container,
            // then there will be white space at the bottom of the container ensuring no layout shift.
            case "text":
              setFillerHeight(containerHeight - previousMssgHeight - currentMessageHeight);
              break;

            // If the last message is a tool call from the assistant, adjust the filler height
            // to the height of the container, minus the height of the previous message,
            // ensuring that the tool call message does not overlap with the content in the ::after pseudo element
            // which displays "Thinking..." when the assistant is responding.
            case "tool":
              setFillerHeight(containerHeight - previousMssgHeight);
              break;
          }

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

  const lastMessage = messages[messages.length - 1];
  const isLastMessageFromAssistantResponding =
    lastMessage?.role === "assistant" && lastMessage?.mode !== "tool";
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
          // The --gap variable is used to ensure the filler height takes into account the gap between messages.
          // If the last message is from the assistant and it is responding (i.e not a tool call),
          // then we need to subtract an additional gap assuming that there are two gaps
          // (i.e. one between the user message and assistant message, and another gap between the assistant message and this filler).
          // The --gap variable is set in the style.module.css file
          height: `calc(${fillerHeight}px - (var(--gap) * ${
            isLastMessageFromAssistantResponding ? 2 : 1
          }))`,
        }}
      />
    </div>
  );
};
