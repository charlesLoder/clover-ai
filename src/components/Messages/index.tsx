import { Message } from "@components";
import { Message as IMessage } from "@types";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import style from "./style.module.css";

export interface MessagesContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: IMessage[];
}

/**
 * Render an array of messages
 */
export const MessagesContainer: FC<MessagesContainerProps> = ({ messages, ...props }) => {
  // fillerHeight is used to set the height of the filler element
  // allowing the latest user message to scroll to the top of the container
  // and ensuring there is no layout shift after that.
  const [fillerHeight, setFillerHeight] = useState(0);
  const fillerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scroll to the latest user message
    if (!messages?.length) {
      return;
    }
    if (fillerRef.current) {
      fillerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [fillerHeight]);

  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || messages.length === 0) {
        setFillerHeight(0);
        return;
      }

      // Set the ref to the last message element to scroll into view
      const currentMessage = messages[messages.length - 1];
      const currentMssgHeight = node.clientHeight;
      const containerHeight = node.parentElement?.clientHeight || 0;

      switch (currentMessage.role) {
        case "assistant":
          // If the last message is from the assistant, we want to ensure that the filler height
          // is set to the height of the container minus the height of the current message and the height of the previous user message.
          // ensuring that if the assistant message does not fill the container,
          // then there will be white space at the bottom of the container ensuring no layout shift.
          const previousMssgHeight = node.previousElementSibling?.clientHeight || 0;
          setFillerHeight(containerHeight - currentMssgHeight - previousMssgHeight);
          break;

        default:
          // If the last message is from the user, we want to ensure that the filler height
          // is set to the height of the container minus the height of the current message
          // allowing the latest user message to scroll to the top.
          setFillerHeight(containerHeight - currentMssgHeight);
          break;
      }
    },
    [messages],
  );

  return (
    <div className={style.messagesContainer} {...props}>
      {messages.map((mssg, i) => (
        <Message
          key={`message-${i}`}
          message={mssg}
          ref={i === messages.length - 1 ? scrollRef : undefined}
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
