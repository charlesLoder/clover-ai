import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, type google } from "@ai-sdk/google";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { Button, Heading } from "@components";
import type { Message } from "@types";
import { streamText } from "ai";
import React from "react";
import { BaseProvider } from "../plugin/base_provider";
import { Input } from "./components/Input";
import { ModelSelection } from "./components/ModelSelection";
import { ProviderSelection } from "./components/ProviderSelection";
import styles from "./style.module.css";

export type Provider = "google" | "openai" | "anthropic";

type GoogleModels = Parameters<typeof google>[0];
type OpenAIModels = Parameters<OpenAIProvider>[0];
type AnthropicModels = Parameters<AnthropicProvider>[0];

export class UserTokenProvider extends BaseProvider {
  #selected_model: string | null = null;
  #selected_provider: Provider | null = null;
  #user_token: string | null = null;
  allowed_providers: Provider[] = ["google", "openai", "anthropic"];

  constructor({ user_token }: { user_token?: string | null } = {}) {
    super();
    super.status = user_token ? "ready" : "initializing";
    this.#user_token = user_token || this.#user_token;
  }

  #isValidProviderModel(provider: Provider, model: string): boolean {
    return this.models_by_provider[provider].includes(model);
  }

  get models_by_provider(): Record<Provider, string[]> {
    return {
      google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemma-3-27b-it"] as GoogleModels[],
      openai: ["gpt-4.1", "o3", "o4-mini"] as OpenAIModels[],
      anthropic: [
        "claude-4-opus-20250514",
        "claude-4-sonnet-20250514",
        "claude-3-7-sonnet-20250219",
      ] as AnthropicModels[],
    };
  }

  get selected_model(): string | null {
    return this.#selected_model;
  }

  set selected_model(model: string | null) {
    if (model === null) {
      this.#selected_model = null;
    } else if (
      this.selected_provider &&
      this.#isValidProviderModel(this.selected_provider, model)
    ) {
      this.#selected_model = model;
    } else {
      throw new Error(`Invalid model: ${model} for provider: ${this.selected_provider}.`);
    }
  }

  get selected_provider(): Provider | null {
    return this.#selected_provider;
  }

  set selected_provider(provider: Provider | null) {
    if (provider === null || this.allowed_providers.includes(provider)) {
      this.#selected_provider = provider;
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

    if (!this.selected_model) {
      throw new Error("Model must be selected before sending messages");
    }

    this.set_conversation_state("assistant_responding");

    try {
      const model = this.setup_model(this.selected_provider, this.user_token, this.selected_model);

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

  setup_model(provider: Provider, token: string, modelName: string) {
    switch (provider) {
      case "google": {
        const google = createGoogleGenerativeAI({
          apiKey: token,
        });
        return google(modelName as GoogleModels);
      }
      case "openai": {
        const openai = createOpenAI({
          apiKey: token,
          compatibility: "strict",
        });
        return openai(modelName as OpenAIModels);
      }
      case "anthropic": {
        const anthropic = createAnthropic({
          apiKey: token,
        });
        return anthropic(modelName as AnthropicModels);
      }
      default:
        throw new Error(
          `Unsupported provider: ${provider}. Allowed providers are: ${this.allowed_providers.join(", ")}`,
        );
    }
  }

  SetupComponent() {
    /* eslint-disable react-hooks/rules-of-hooks */
    const [modelProvider, setModelProvider] = React.useState<Provider | null>(
      this.selected_provider,
    );
    const [selectedModel, setSelectedModel] = React.useState<string | null>(this.selected_model);
    const [inputValue, setInputValue] = React.useState("");
    /* eslint-enable react-hooks/rules-of-hooks */

    const setProvider = (provider: Provider | null) => {
      setModelProvider(provider);
      this.selected_provider = provider;
      if (!provider) {
        this.selected_model = null;
        setSelectedModel(null);
      }
    };

    const setModel = (model: string | null) => {
      setSelectedModel(model);
      this.selected_model = model;
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

    if (!selectedModel) {
      return (
        <ModelSelection
          handleBack={() => setProvider(null)}
          handleClick={setModel}
          models={this.models_by_provider[modelProvider]}
        />
      );
    }

    return (
      <form className={styles.form} onSubmit={handleSubmit}>
        <Heading level="h3">Enter API Key</Heading>
        <Input
          autoFocus={true}
          customSize="small"
          label="Please provide an API key"
          placeholder={`Enter your ${modelProvider.charAt(0).toUpperCase() + modelProvider.slice(1)} API Key`}
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div className={styles.buttonGroup}>
          <Button>Submit</Button>
          <Button type="button" variant="ghost" onClick={() => setSelectedModel(null)}>
            Back
          </Button>
        </div>
      </form>
    );
  }
}
