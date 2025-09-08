import { Button, Textarea } from "@components";
import { usePlugin } from "@context";
import { Add, ArrowUp, Clear } from "@icons";
import { Traverse, serializeConfigPresentation3 } from "@iiif/parser";
import { Canvas } from "@iiif/presentation-3";
import { MediaContent, UserMessage } from "@types";
import { getLabelByUserLanguage } from "@utils";
import type { FC } from "react";
import { useState } from "react";
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
    setFormState("loading");

    const canvas = state.vault.serialize<Canvas>(
      {
        type: "Canvas",
        id: state.activeCanvas.id,
      },
      serializeConfigPresentation3,
    );

    const annotationTexts: string[] = [];
    const traverse = new Traverse({
      annotation: [
        (a) => {
          if (
            a.body &&
            typeof a.body === "object" &&
            "type" in a.body &&
            a.body.type === "TextualBody" &&
            a.body.value
          ) {
            annotationTexts.push(a.body.value);
          }
        },
      ],
    });

    traverse.traverseCanvas(canvas);

    const userMessage: UserMessage = {
      role: "user",
      content: [
        {
          type: "text",
          content: input,
        },
      ],
      context: {
        canvas: {
          annotations: annotationTexts,
          id: state.activeCanvas.id,
          label: getLabelByUserLanguage(state.activeCanvas.label ?? undefined)[0],
        },
      },
    };

    if (state.selectedMedia.length) {
      const mediaContent: MediaContent[] = state.selectedMedia.map((media) => ({
        type: "media",
        content: media,
      }));
      userMessage.content.push(...mediaContent);
      dispatch({ type: "setSelectedMedia", selectedMedia: [] }); // Clear selected media after sending
    }

    // Add user message immediately
    dispatch({
      type: "addMessages",
      messages: [userMessage],
    });

    try {
      await state?.provider?.generate_response([userMessage], state.messages);
      setTextareaValue("");
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

  return (
    <form
      onSubmit={async (e) => {
        handleSubmit(e);
      }}
    >
      <Textarea
        error={textareaError}
        id="chat-input"
        label="What would you like to know?"
        labelDisplay="hidden"
        size="small"
        updatedContent={formState !== "idle" ? "" : undefined}
        onChange={(input) => {
          setTextareaValue(input);
          if (input?.trim() && textareaError) {
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
        </div>
        <div className="controls">
          <Button
            aria-label="Clear conversation"
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Clear conversation"
            type="button"
            onClick={clearConversation}
          >
            <Clear />
          </Button>
          <Button
            aria-label="Add media"
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Add media"
            type="button"
            onClick={openDialog}
          >
            <Add />
          </Button>
          <Button
            aria-label="Submit question"
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Submit question"
          >
            <ArrowUp />
          </Button>
        </div>
      </Textarea>
    </form>
  );
};
