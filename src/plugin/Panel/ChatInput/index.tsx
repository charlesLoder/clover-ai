import { Button, PromptInput } from "@components";
import { usePlugin } from "@context";
import { Add, ArrowUp, Clear } from "@icons";
import { AnnotationContent, MediaContent, UserMessage } from "@types";
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

    if (state.selectedMedia.length) {
      const mediaContent: MediaContent[] = state.selectedMedia.map((media) => ({
        type: "media",
        content: media,
      }));
      userMessage.content.push(...mediaContent);
      dispatch({ type: "setSelectedMedia", selectedMedia: [] });
    }

    if (state.selectedAnnotations.length) {
      const annotationContent: AnnotationContent[] = state.selectedAnnotations.map(
        (annotation) => ({
          type: "annotation",
          content: annotation,
        }),
      );
      userMessage.content.push(...annotationContent);
      dispatch({ type: "setSelectedAnnotations", selectedAnnotations: [] });
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
        <div className="selected-media">
          {state.selectedMedia.length ? (
            state.selectedMedia.map((media, index) => <SelectedMedia key={index} media={media} />)
          ) : (
            <></>
          )}
          {state.selectedAnnotations.length ? (
            state.selectedAnnotations.map((annotation, index) => (
              <SelectedAnnotation annotation={annotation} key={index} />
            ))
          ) : (
            <></>
          )}
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
