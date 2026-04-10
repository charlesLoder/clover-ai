import { Button, PromptInput } from "@components";
import { usePlugin } from "@context";
import { Add, ArrowUp, Clear } from "@icons";
import { UserMessage } from "@types";
import type { FC } from "react";
import { useState } from "react";
import { SelectedAnnotation } from "./SelectedAnnotation";
import { SelectedMedia } from "./SelectedMedia";

export const ChatInput: FC = () => {
  const { dispatch, state } = usePlugin();
  const [textareaValue, setTextareaValue] = useState("");
  const [textareaError, setTextareaError] = useState("");
  const [formState, setFormState] = useState<"idle" | "loading" | "error" | "success">("idle");

  function clearConversation() {
    dispatch({ type: "clearConversation" });
    dispatch({ type: "setConversationState", conversationState: "idle" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = textareaValue.trim();

    if (!input) {
      setTextareaError("Please enter a message.");
      return;
    }

    setTextareaError("");
    setTextareaValue("");
    setFormState("loading");

    const userMessage: UserMessage = {
      role: "user",
      content: [
        {
          type: "text",
          content: input,
        },
      ],
      context: {
        canvas: state.activeCanvas,
      },
    };

    if (state.selectedContent.length) {
      userMessage.content.push(...state.selectedContent);
      dispatch({ type: "setSelectedContent", selectedContent: [] });
    }

    // Add user message immediately
    dispatch({
      type: "addMessages",
      messages: [userMessage],
    });

    try {
      await state?.provider?.generate_response([userMessage], state.messages);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error sending message:", error);
      dispatch({
        type: "addMessages",
        messages: [
          {
            role: "assistant",
            type: "response",
            content: {
              type: "text",
              content: "Sorry, I encountered an error while processing your message.",
            },
          },
        ],
      });
    }
    setFormState("idle");
  }

  function openDialog() {
    dispatch({ type: "setMediaDialogState", state: "open" });
  }

  const PromptInputButtons = state?.provider?.PromptInputButtons?.bind(state.provider) ?? null; // bind `this`;
  return (
    <form
      onSubmit={async (e) => {
        handleSubmit(e);
      }}
    >
      <PromptInput
        error={textareaError}
        value={textareaValue}
        onChange={({ currentTarget }) => {
          setTextareaValue(currentTarget.value);
          if (currentTarget.value?.trim() && textareaError) {
            setTextareaError("");
          }
        }}
      >
        <div className="selected-content">
          {state.selectedContent.map((item, index) => {
            switch (item.type) {
              case "media":
                return <SelectedMedia key={index} media={item.content} />;
              case "annotation":
                return <SelectedAnnotation annotation={item.content} key={index} />;
              default:
                return <></>;
            }
          })}
        </div>
        <div className="controls">
          {PromptInputButtons && <PromptInputButtons />}
          <Button
            aria-label="Clear conversation"
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Clear conversation"
            onClick={clearConversation}
          >
            <Clear />
          </Button>
          <Button
            aria-label="Add content"
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Add content"
            onClick={openDialog}
          >
            <Add />
          </Button>
          <Button
            aria-label="Submit question"
            disabled={!textareaValue.trim()}
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Submit question"
            type="submit"
          >
            <ArrowUp />
          </Button>
        </div>
      </PromptInput>
    </form>
  );
};
