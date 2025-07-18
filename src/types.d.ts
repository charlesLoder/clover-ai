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

export interface AssistantMessage {
  content: TextContent;
  role: Extract<Role, "assistant">;
}

export interface UserMessage {
  content: (TextContent | MediaContent)[];
  role: Extract<Role, "user">;
}

export interface SystemMessage {
  content: TextContent;
  role: Extract<Role, "system">;
}

export type Message = AssistantMessage | SystemMessage | UserMessage;
