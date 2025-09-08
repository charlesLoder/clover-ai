import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
export type ConversationState = "idle" | "assistant_responding" | "error";

export type Role = "assistant" | "system" | "user";

export type Media = {
  id: string;
  src: string;
  type: "fragment" | "image";
  caption?: string;
};

export interface TextContent {
  content: string;
  type: "text";
}

export interface MediaContent {
  content: Media;
  type: "media";
}

export interface ToolContent extends TextContent {
  tool_name: string;
}

export interface ToolCall {
  type: "tool-call";
  content: ToolContent;
}

export interface Response {
  type: "response";
  content: TextContent;
}

export type AssistantMessage = {
  role: Extract<Role, "assistant">;
} & (Response | ToolCall);

export interface UserMessage {
  content: (TextContent | MediaContent)[];
  /** Context that can be added to user messages when generating a response */
  context: {
    canvas: CanvasNormalized;
  };
  role: Extract<Role, "user">;
}

export interface SystemMessage {
  content: TextContent;
  role: Extract<Role, "system">;
}

export type Message = AssistantMessage | SystemMessage | UserMessage;
