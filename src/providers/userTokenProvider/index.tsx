import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, type google } from "@ai-sdk/google";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { Button, Heading, Input } from "@components";
import { Tool } from "@langchain/core/tools";
import type { AssistantMessage, Message } from "@types";
import { streamText, tool } from "ai";
import React from "react";
import { BaseProvider } from "../../plugin/base_provider";
import { ModelSelection } from "./components/ModelSelection";
import { ProviderSelection } from "./components/ProviderSelection";
import styles from "./style.module.css";

export type Provider = "google" | "openai" | "anthropic";

type GoogleModels = Parameters<typeof google>[0];
type OpenAIModels = Parameters<OpenAIProvider>[0];
type AnthropicModels = Parameters<AnthropicProvider>[0];

type UserTokenProviderProps = {
  max_steps?: number;
  tools?: Tool[];
  user_token?: string | null;
};

export class UserTokenProvider extends BaseProvider {
  #selected_model: string | null = null;
  #selected_provider: Provider | null = null;
  #user_token: string | null = null;
  allowed_providers: Provider[] = ["google", "openai", "anthropic"];
  max_steps: number;
  tools: Tool[];

  constructor({ user_token, tools = [], max_steps = 3 }: UserTokenProviderProps = {}) {
    super();
    this.tools = tools;
    this.max_steps = max_steps;
    super.status = user_token ? "ready" : "initializing";
    this.#user_token = user_token || this.#user_token;
  }

  /**
   * Format a Message to the format expected by the AI SDK
   *
   * @param message
   * @returns a formatted message
   */
  #format_message(message: Message) {
    switch (message.role) {
      case "user":
        return {
          role: "user",
          content: message.content.map((c) => {
            if (c.type === "media") {
              return { type: "image", image: c.content.src };
            }
            return { type: "text", text: c.content };
          }),
        };
      case "assistant":
        return { role: "assistant", content: message.content.content };
      case "system":
        return { role: "system", content: message.content.content };
      default:
        // @ts-expect-error - this is a catch-all for unsupported roles
        throw new Error(`Unsupported message role: ${message.role}`);
    }
  }

  #is_valid_model_provider_model(provider: Provider, model: string): boolean {
    return this.models_by_provider[provider].includes(model);
  }

  #reset_model() {
    this.#selected_model = null;
  }

  #reset_provider() {
    this.#selected_provider = null;
  }

  #reset_provider_and_model() {
    this.#reset_provider();
    this.#reset_model();
  }

  /**
   * Transform the tools to the format expected by the AI SDK
   *
   * @returns tools transformed to the format expected by the AI SDK
   */
  #transform_tools() {
    return this.tools.reduce((acc, t) => {
      return {
        ...acc,
        [t.name]: tool({
          description: t.description,
          parameters: t.schema.transform((arg) => {
            // some LLMs (like Gemini) will error if the argument is not an object
            // though the tool only takes a single string argument
            if (typeof arg === "string") {
              return { input: arg };
            }
            return arg;
          }),
          execute: async (input) => {
            return await t.invoke(input);
          },
        }),
      };
    }, {});
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

  get selected_model(): string {
    if (!this.#selected_model) {
      throw new Error("No model selected");
    }
    return this.#selected_model;
  }

  set selected_model(model: string) {
    if (!this.#is_valid_model_provider_model(this.selected_provider, model)) {
      throw new Error(`Invalid model: ${model} for provider: ${this.selected_provider}.`);
    }
    this.#selected_model = model;
  }

  get selected_provider(): Provider {
    if (!this.#selected_provider) {
      throw new Error("No provider selected");
    }
    return this.#selected_provider;
  }

  set selected_provider(provider: Provider) {
    if (!this.allowed_providers.includes(provider)) {
      throw new Error(
        `Invalid provider: ${provider}. Allowed providers are: ${this.allowed_providers.join(", ")}`,
      );
    }

    this.#selected_provider = provider;
  }

  get status() {
    return this.#user_token ? "ready" : "initializing";
  }

  get user_token(): string {
    if (!this.#user_token) {
      throw new Error("No user token set");
    }
    return this.#user_token;
  }

  set user_token(user_token: string) {
    this.#user_token = user_token;
  }

  async generate_response(messages: Message[], conversationHistory: Message[]): Promise<void> {
    const all_messages = [...conversationHistory, ...messages];

    this.set_conversation_state("assistant_responding");

    try {
      const model = this.setup_model(this.selected_provider, this.user_token, this.selected_model);

      const { fullStream } = streamText({
        model,
        tools: this.#transform_tools(),
        maxSteps: this.max_steps,
        // @ts-expect-error - there is a type mismatch here, but it works
        messages: all_messages.map(this.#format_message),
      });

      // Track if we have a current text message being built
      let currentTextMessage: AssistantMessage | null = null;

      for await (const part of fullStream) {
        switch (part.type) {
          // @ts-expect-error - type is valid
          case "tool-call": {
            // Add a new tool message
            const toolMessage: AssistantMessage = {
              role: "assistant",
              type: "tool-call",
              content: {
                type: "text",
                // @ts-expect-error - type is valid
                tool_name: part.toolName,
                // @ts-expect-error - type is valid
                content: `Using tool: ${part.toolName}`,
              },
            };
            this.add_messages([toolMessage]);
            // Reset current text message since we just added a tool message
            currentTextMessage = null;
            break;
          }
          case "text-delta": {
            if (currentTextMessage) {
              // Update existing text message
              currentTextMessage.content.content += part.textDelta;
              this.update_last_message(currentTextMessage);
            } else {
              // Create new text message
              currentTextMessage = {
                role: "assistant",
                type: "response",
                content: { type: "text", content: part.textDelta },
              };
              this.add_messages([currentTextMessage]);
            }
            break;
          }
          default:
            break;
        }
      }

      this.set_conversation_state("idle");
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
      this.set_conversation_state("error");
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
    const [modelProvider, setModelProvider] = React.useState<Provider | null>(null);
    const [selectedModel, setSelectedModel] = React.useState<string | null>(null);
    const [inputValue, setInputValue] = React.useState("");
    /* eslint-enable react-hooks/rules-of-hooks */

    const resetProvider = () => {
      setModelProvider(null);
      setSelectedModel(null);
      this.#reset_provider_and_model();
    };

    const setProvider = (provider: Provider) => {
      setModelProvider(provider);
      this.selected_provider = provider;
    };

    const setModel = (model: string) => {
      setSelectedModel(model);
      this.selected_model = model;
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      this.user_token = inputValue.trim();
      this.update_plugin_provider();
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
          handleBack={resetProvider}
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
