import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { Button } from "@components";
import type { Message } from "@types";
import { streamText } from "ai";
import React from "react";
import { BaseProvider } from "../plugin/base_provider";
import { Input } from "./components/Input";
import { ProviderSelection } from "./components/ProviderSelection";

export type Provider = "google" | "openai" | "anthropic";
export class UserTokenProvider extends BaseProvider {
  #selected_provider: Provider | null = null;
  #user_token: string | null = null;
  allowed_providers: Provider[] = ["google", "openai", "anthropic"];

  constructor({ user_token }: { user_token?: string | null } = {}) {
    super();
    super.status = user_token ? "ready" : "initializing";
    this.#user_token = user_token || this.#user_token;
  }

  get selected_provider(): Provider | null {
    return this.#selected_provider;
  }

  set selected_provider(provider: Provider | null) {
    if (this.allowed_providers.includes(provider as Provider)) {
      this.#selected_provider = provider as Provider;
    } else {
      throw new Error(
        `Invalid provider: ${provider}. Allowed providers are: ${this.allowed_providers.join(", ")}`,
      );
    }
  }

  get status() {
    return this.user_token ? "ready" : "initializing";
  }

  get user_token(): string | null {
    return this.#user_token;
  }

  set user_token(user_token: string | null) {
    this.#user_token = user_token;
  }

  async send_messages(messages: Message[], conversationHistory: Message[]): Promise<void> {
    if (!this.user_token) {
      throw new Error("User token is required to send messages");
    }

    if (!this.selected_provider) {
      throw new Error("Provider must be selected before sending messages");
    }

    this.set_conversation_state("assistant_responding");

    try {
      const model = this.setup_model(this.selected_provider, this.user_token);

      const allMessages = [...conversationHistory, ...messages].map((mssg) => {
        switch (mssg.role) {
          case "user":
            return {
              role: "user",
              content: mssg.content.map((c) => {
                if (c.type === "media") {
                  return { type: "image", image: c.content.src };
                }
                return { type: "text", text: c.content };
              }),
            };
          case "assistant":
            return { role: "assistant", content: mssg.content.content };
          case "system":
            return { role: "system", content: mssg.content.content };
          default:
            // @ts-expect-error - this is a catch-all for unsupported roles
            throw new Error(`Unsupported message role: ${mssg.role}`);
        }
      });

      const { textStream } = await streamText({
        model,
        // @ts-expect-error - there is a type mismatch here, but it works
        messages: allMessages,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: { type: "text", content: "" },
      };

      this.add_messages([assistantMessage]);

      for await (const textPart of textStream) {
        assistantMessage.content.content += textPart;
        this.update_last_message(assistantMessage);
      }
    } finally {
      this.set_conversation_state("idle");
    }
  }

  setup_model(provider: Provider, token: string) {
    switch (provider) {
      case "google": {
        const google = createGoogleGenerativeAI({
          apiKey: token,
        });
        return google("gemini-2.0-flash");
      }
      case "openai": {
        const openai = createOpenAI({
          apiKey: token,
          compatibility: "strict",
        });
        return openai("gpt-4o");
      }
      case "anthropic": {
        const anthropic = createAnthropic({
          apiKey: token,
        });
        return anthropic("claude-3-5-sonnet-latest");
      }
      default:
        throw new Error(
          `Unsupported provider: ${provider}. Allowed providers are: ${this.allowed_providers.join(", ")}`,
        );
    }
  }

  SetupComponent() {
    /* eslint-disable react-hooks/rules-of-hooks */
    const [modelProvider, setModelProvider] = React.useState<Provider | null>(null);
    const [inputValue, setInputValue] = React.useState("");
    /* eslint-enable react-hooks/rules-of-hooks */

    const setProvider = (provider: Provider | null) => {
      setModelProvider(provider);
      if (provider) {
        this.selected_provider = provider;
      }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      this.user_token = inputValue.trim() || null;
      this.update_plugin_provider(this);
    };

    if (!modelProvider) {
      return (
        <ProviderSelection
          allowed_providers={this.allowed_providers.sort()}
          handleClick={setProvider}
        />
      );
    }

    return (
      <form
        style={{ display: "flex", flexDirection: "column", gap: "var(--clover-ai-sizes-2)" }}
        onSubmit={handleSubmit}
      >
        <Input
          autoFocus={true}
          customSize="small"
          label="Please provide a user token to use this feature."
          placeholder={`Enter your ${modelProvider.charAt(0).toUpperCase() + modelProvider.slice(1)} API Key`}
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div style={{ display: "flex", gap: "var(--clover-ai-sizes-2)" }}>
          <Button>Submit</Button>
          <Button type="button" variant="ghost" onClick={() => setProvider(null)}>
            Reset
          </Button>
        </div>
      </form>
    );
  }
}
