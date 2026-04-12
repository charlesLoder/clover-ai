import { Button, PromptInput } from "@components";
import { usePlugin } from "@context";
import { Add, ArrowUp, Clear, Export } from "@icons";
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

  async function handleSubmit(e?: React.FormEvent<HTMLFormElement>) {
    if (e) e.preventDefault();
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

  function exportConversation() {
    const title = state.manifest.label?.en?.[0] ?? state.manifest.id;
    const exportDate = new Date().toISOString();

    let markdown = `# ${title}\n\n`;
    markdown += `- **Name**: ${state.manifest.label?.en?.[0] ?? "N/A"}\n`;
    markdown += `- **Manifest URI**: ${state.manifest.id}\n`;
    markdown += `- **Exported at**: ${exportDate}\n\n`;

    for (const message of state.messages) {
      switch (message.role) {
        case "user": {
          markdown += `## User Message\n\n`;
          for (const content of message.content) {
            switch (content.type) {
              case "text":
                markdown += `${content.content}\n\n`;
                break;
              case "annotation":
                markdown += `### Annotation\n\n${content.content.content}\n\n`;
                break;
              case "media":
                markdown += `### Media\n\n[${content.content?.caption ?? "IIIF Image"}](${content.content.src})\n\n`;
                break;
            }
          }
          break;
        }
        case "assistant": {
          markdown += `## Assistant Message\n\n`;
          switch (message.type) {
            case "tool-call":
              markdown += `### Tool Calls\n\n`;
              markdown += `**${message.content.tool_name}**: ${message.content.content}\n\n`;
              break;
            case "response":
              markdown += `### Response\n\n${message.content.content}\n\n`;
              break;
          }
          break;
        }
        default:
          break;
      }
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const PromptInputButtons = state?.provider?.PromptInputButtons?.bind(state.provider) ?? null; // bind `this`;
  return (
    <form
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        }
      }}
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
          {PromptInputButtons && (
            <PromptInputButtons disabled={state.conversationState === "assistant_responding"} />
          )}
          <Button
            aria-label="Clear conversation"
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Clear conversation"
            variant="ghost"
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
            variant="ghost"
            onClick={openDialog}
          >
            <Add />
          </Button>
          <Button
            aria-label="Export conversation"
            disabled={state.messages.filter((m) => m.role !== "system").length === 0}
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Export conversation"
            variant="ghost"
            onClick={exportConversation}
          >
            <Export />
          </Button>
          <Button
            aria-label="Submit question"
            disabled={!textareaValue.trim()}
            shape="circle"
            size="small"
            state={formState !== "success" ? formState : undefined}
            title="Submit question"
            type="submit"
            variant="accent"
          >
            <ArrowUp />
          </Button>
        </div>
      </PromptInput>
    </form>
  );
};
