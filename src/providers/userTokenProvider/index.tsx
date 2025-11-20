import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, type google } from "@ai-sdk/google";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { Button, Dialog, Heading, Input, MessagesContainer, PromptInput } from "@components";
import { usePlugin } from "@context";
import { BulletList } from "@icons";
import { serializeConfigPresentation3, Traverse } from "@iiif/parser";
import type { Canvas, ContentResource } from "@iiif/presentation-3";
import type { Tool } from "@langchain/core/tools";
import { ConversationState, type AssistantMessage, type Message } from "@types";
import { getLabelByUserLanguage } from "@utils";
import { generateText, ModelMessage, stepCountIs, streamText, tool } from "ai";
import dedent from "dedent";
import { useEffect, useRef, useState } from "react";
import { BaseProvider } from "../../plugin/base_provider";
import { ModelSelection } from "./components/ModelSelection";
import { ProviderSelection } from "./components/ProviderSelection";
import styles from "./style.module.css";

export type Provider = "google" | "openai" | "anthropic";

type GoogleModels = Parameters<typeof google>[0];
type OpenAIModels = Parameters<OpenAIProvider>[0];
type AnthropicModels = Parameters<AnthropicProvider>[0];

type UserTokenProviderProps = {
  /**
   * Maximum number of tool use steps before stopping the response generation
   */
  max_steps?: number;
  /**
   * Tools to enable for the AI model
   */
  tools?: Tool[];
  /**
   * User token (API key) for the selected AI provider
   */
  user_token?: string | null;
  /**
   * Define a callback function at the `<App />` level to receive IIIF content updates
   *
   * @param iiif_resource a IIIF URL or base64 encoded Content State Annotation
   *
   * @example
   * ```tsx
   * function App() {
   *   const [iiifContent, setIiifContent] = useState<string>(<IIIF_URL>);
   *
   *   const tokenProvider = new UserTokenProvider({
   *     viewer_iiif_content_callback: (iiif_resource) => {
   *       setIiifContent(iiif_resource);
   *     },
   *   });
   *
   *   return (
   *    <Viewer
   *     iiifContent={iiifContent}
   *    ...
   *   />
   * }
   *```
   */
  viewer_iiif_content_callback?: (iiif_resource: string) => void;
};

export class UserTokenProvider extends BaseProvider {
  #selected_model: string | null = null;
  #selected_provider: Provider | null = null;
  #user_token: string | null = null;
  allowed_providers: Provider[] = ["google", "openai", "anthropic"];
  max_steps: number;
  tools: Tool[];
  viewer_iiif_content_callback?: (iiif_resource: string) => void;
  constructor({
    user_token,
    tools = [],
    max_steps = 3,
    viewer_iiif_content_callback,
  }: UserTokenProviderProps = {}) {
    super();
    this.#user_token = user_token || this.#user_token;
    this.viewer_iiif_content_callback = viewer_iiif_content_callback;
    this.tools = tools;
    this.max_steps = max_steps;
    super.status = user_token ? "ready" : "initializing";
  }

  /**
   * Format a Message to the format expected by the AI SDK
   *
   * @param message
   * @returns a formatted message
   *
   * @privateRemarks
   *
   * Use an arrow function so `this` references the `UserTokenProvider` class
   */
  #format_message = (message: Message, index: number, messages: Message[]): ModelMessage => {
    switch (message.role) {
      case "user":
        return {
          role: "user",
          content: message.content.map((c) => {
            if (c.type === "media") {
              return { type: "image", image: c.content.src };
            }

            const prevMessages = messages.slice(0, index);
            const lastUserMessage = prevMessages.findLast((m) => m.role === "user");
            let context = "";

            // only add new context to the messages when it changes to save on tokens
            if (
              !lastUserMessage ||
              lastUserMessage.context.canvas.id !== message.context.canvas.id
            ) {
              const canvas = this.plugin_state.vault.serialize<Canvas>(
                {
                  type: "Canvas",
                  id: message.context.canvas.id,
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

              // prettier-ignore
              context = dedent.withOptions({ alignValues: true })`
              ## Context
              The following context is about the latest Canvas in the image viewer.
              Use this information if possible to inform your answer.
              
              ### Canvas${canvas.label ? `
              - Label: ${getLabelByUserLanguage(canvas.label)[0]}` : ""}${annotationTexts.length ? `
              - Annotations: ${annotationTexts.join(", ")}` : ""}
              `;
            }

            return { type: "text", text: c.content + `${context ? "\n" + context : ""}` };
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
  };

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
   * Generate a response from the model for a given set of messages used within tasks
   *
   * @param messages
   * @returns the model's response
   */
  async #task_generate_response(messages: ModelMessage[]) {
    const model = this.setup_model(this.selected_provider, this.user_token, this.selected_model);

    const { text } = await generateText({
      model,
      messages,
    });

    return text;
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
          inputSchema: t.schema.transform((arg) => {
            // some LLMs (like Gemini) will error if the argument is not an object
            // though the tool only takes a single string argument
            if (typeof arg === "string") {
              return { input: arg };
            }
            return arg;
          }),
          execute: async (input) => await t.invoke(input),
        }),
      };
    }, {});
  }

  get models_by_provider(): Record<Provider, string[]> {
    return {
      google: ["gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] as GoogleModels[],
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
        stopWhen: stepCountIs(this.max_steps),
        messages: all_messages.map(this.#format_message),
      });

      // Track if we have a current text message being built
      let currentTextMessage: AssistantMessage | null = null;

      for await (const part of fullStream) {
        switch (part.type) {
          case "tool-call": {
            // Add a new tool message
            const toolMessage: AssistantMessage = {
              role: "assistant",
              type: "tool-call",
              content: {
                type: "text",
                tool_name: part.toolName,
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
              currentTextMessage.content.content += part.text;
              this.update_last_message(currentTextMessage);
            } else {
              // Create new text message
              currentTextMessage = {
                role: "assistant",
                type: "response",
                content: { type: "text", content: part.text },
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

  PromptInputButtons() {
    /* eslint-disable react-hooks/rules-of-hooks */
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [SelectedTaskComponent, setSelectedTaskComponent] = useState<React.ComponentType | null>(
      null,
    );

    useEffect(() => {
      if (isOpen && dialogRef.current) {
        dialogRef.current.showModal();
      }
    }, [isOpen]);

    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const handleClose = () => {
        closeDialog();
      };

      dialog.addEventListener("close", handleClose);
      return () => {
        dialog.removeEventListener("close", handleClose);
      };
    }, []);
    /* eslint-enable react-hooks/rules-of-hooks */

    function openDialog() {
      setIsOpen(true);
    }

    function closeDialog() {
      setIsOpen(false);
      setSelectedTaskComponent(null);
    }

    const tasks: { component: React.ComponentType; name: string }[] = [
      {
        name: "Transcribe text",
        component: this.TaskTranscribeCanvas.bind(this),
      },
      {
        name: "Create annotation",
        component: this.TaskCreateAnnotation.bind(this),
      },
    ];

    return (
      <>
        <Dialog
          aria-modal="true"
          position="visual_center"
          ref={dialogRef}
          width="stretched"
          onCloseCallback={closeDialog}
        >
          <Heading level="h3">Tasks</Heading>
          <p>Predefined workflows for common tasks</p>
          <div className={styles.tasksContainer}>
            <div className={styles.tasksList}>
              {tasks.map((task) => (
                <Button
                  className={styles.taskButton}
                  key={task.name}
                  size="small"
                  variant="primary"
                  onClick={() => setSelectedTaskComponent(() => task.component)}
                >
                  {task.name}
                </Button>
              ))}
            </div>
            <div className={styles.taskDetails}>
              {!SelectedTaskComponent ? (
                <div className={styles.taskPlaceholder}>Choose a task to see more details</div>
              ) : (
                <SelectedTaskComponent />
              )}
            </div>
          </div>
        </Dialog>
        <Button
          aria-label="Tasks"
          shape="circle"
          size="small"
          title="Tasks"
          type="button"
          onClick={openDialog}
        >
          <BulletList />
        </Button>
      </>
    );
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
    const [modelProvider, setModelProvider] = useState<Provider | null>(null);
    const [selectedModel, setSelectedModel] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState("");
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
          <Button type="submit">Submit</Button>
          <Button variant="ghost" onClick={() => setSelectedModel(null)}>
            Back
          </Button>
        </div>
      </form>
    );
  }

  TaskCreateAnnotation() {
    /* eslint-disable react-hooks/rules-of-hooks */
    const { state: pluginState } = usePlugin();
    const [state, setState] = useState<"info" | "processing" | "error">("info");
    const [conversationState, setConversationState] = useState<ConversationState>("idle");
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);
    const [updateViewerButton, setUpdateViewerButton] = useState<"hidden" | "visible">("hidden");
    const [encodedContentState, setEncodedContentState] = useState("");
    const [errorText, setErrorText] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    /* eslint-enable react-hooks/rules-of-hooks */

    function encodeContentState(plainContentState: string): string {
      const uriEncoded = encodeURIComponent(plainContentState); // using built in function
      const base64 = btoa(uriEncoded); // using built in function
      const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_");
      const base64urlNoPadding = base64url.replace(/=/g, "");
      return base64urlNoPadding;
    }

    const startTask = async () => {
      try {
        setState("processing");
        setConversationState("assistant_responding");

        const first_tool_message: Message = {
          role: "assistant",
          type: "tool-call",
          content: {
            type: "text",
            tool_name: "CreateAnnotation",
            content: "Getting current canvas content for transcription.",
          },
        };
        setMessages([first_tool_message]);

        // step 1: get the current canvas from the plugin state
        const canvas: Canvas = pluginState.vault.serialize(
          {
            type: "Canvas",
            id: pluginState.activeCanvas.id,
          },
          serializeConfigPresentation3,
        );

        // step 2: get the first painting from the canvas
        const paintings: ContentResource[] = [];
        const traverse = new Traverse({
          contentResource: [
            (resource) => {
              if (resource.type === "Image") {
                paintings.push(resource);
              }
            },
          ],
        });
        traverse.traverseCanvasItems(canvas);

        const painting = paintings[0].id;

        if (!painting) {
          throw new Error("No painting found on canvas");
        }

        const width = canvas.width || 0;
        const height = canvas.height || 0;

        const second_tool_message: Message = {
          role: "assistant",
          type: "tool-call",
          content: {
            type: "text",
            tool_name: "CreateAnnotation",
            content: "Sending canvas to model.",
          },
        };
        setMessages((prevMessages) => [...prevMessages, second_tool_message]);

        // step 3: set up the messages to send to the model
        const systemMessage: ModelMessage = {
          role: "system",
          content: dedent`
            You are an AI assistant that helps with creating IIIF annotations.
          `,
        };

        const userMessageText = dedent`
          ## Context
          You will be generating a IIIF annotation for an image based on user input.

          ## Details
          Here are some important details to consider when generating the annotation:
          
          - The "text" field should contain HTML formatted text that will be displayed in the annotation.
          - The "language" field should specify the language of the text using a standard language code (e.g., "en" for English).
          - The "region" defines the area on the canvas for the annotation so be VERY precise with the coordinates and size.
            - The image has a width of ${width} pixels and a height of ${height} pixels.
            - Ensure that the x and y coordinates, as well as the width and height of the region, fit within the dimensions of the image.
            - The region should be relevant to the user input provided.
          
          ## Task
          Here is the user input for the annotation:
          <user_instructions>${inputValue}</user_instructions>
          Generate text and the region to be used in an annotation for the provided image.

          ## Thinking
          Think about the user instructions and the image details carefully before you respond.
          
          ## Output Format
          Provide the response in JSON format as follows:
          
          {
            "text": "<p>The text for the annotation.</p>",
            "language": string (the language code you are providing the text in, e.g., "en"),
            "region": {
              "x": number (0 to ${width}),
              "y": number (0 to ${height}),
              "width": number (0 to ${width}),
              "height": number (0 to ${height})
            }
          }

          - Do NOT include any extra text outside the JSON object
          - Only respond with the JSON object
        `;

        const userMessage: ModelMessage = {
          role: "user",
          content: [
            {
              type: "image",
              image: painting,
            },
            {
              type: "text",
              text: userMessageText,
            },
          ],
        };

        // step 4: call a custom function to generate the response
        const result = (await this.#task_generate_response([systemMessage, userMessage]))
          .replace("```json", "")
          .replace("```", "")
          .trim();

        // step 5: update the messages to show user model call is done
        const modelResponseMessage: Message = {
          role: "assistant",
          type: "tool-call",
          content: {
            type: "text",
            tool_name: "CreateAnnotation",
            content: "Parsing model response",
          },
        };
        setMessages((prevMessages) => [...prevMessages, modelResponseMessage]);

        // step 6: parse the response
        const parsed = JSON.parse(result);

        if (
          !parsed.text ||
          !parsed.region ||
          typeof parsed.region.x !== "number" ||
          typeof parsed.region.y !== "number" ||
          typeof parsed.region.width !== "number" ||
          typeof parsed.region.height !== "number"
        ) {
          throw new Error("Invalid response format from model");
        }

        // step 7: create the annotation for the canvas and encode it
        const annotation = {
          "@context": "http://iiif.io/api/presentation/3/context.json",
          id: "https://example.org/import/1",
          type: "Annotation",
          motivation: ["contentState"],
          target: {
            id: `${canvas.id}#xywh=${parsed.region.x},${parsed.region.y},${parsed.region.width},${parsed.region.height}`,
            type: "Canvas",
            partOf: [
              {
                id: pluginState.manifest.id,
                type: "Manifest",
              },
            ],
          },
          body: {
            type: "TextualBody",
            value: parsed.text,
            format: "text/html",
            language: [parsed.language || "en"],
          },
        };

        const contentState = encodeContentState(JSON.stringify(annotation));

        setEncodedContentState(contentState);

        const contentStateResponse: Message = {
          role: "assistant",
          type: "response",
          content: {
            type: "text",
            content: this.viewer_iiif_content_callback
              ? "Annotation created successfully. Click the button below to update the viewer."
              : `Annotation created successfully. Here is the encoded Content State annotation:\n${contentState}`,
          },
        };
        setMessages((prevMessages) => [...prevMessages, contentStateResponse]);
        setConversationState("idle");
        setUpdateViewerButton("visible");
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
        setErrorText(error instanceof Error ? error.message : "An unknown error occurred.");
        setState("error");
      }
    };

    if (state === "info") {
      return (
        <>
          <div>
            <Heading level="h4">Create Annotation</Heading>
            <p className={styles.taskDescription}>
              This task will create a IIIF annotation for the cuurent canvas based on the provided
              user input.
            </p>
          </div>
          <PromptInput
            aria-label="Provide additional context for the task"
            placeholder="Highlight an interesting background object"
            required={true}
            onChange={({ currentTarget }) => {
              setInputValue(currentTarget.value.trim());
              if (currentTarget.value.trim()) {
                setIsButtonDisabled(false);
              } else {
                setIsButtonDisabled(true);
              }
            }}
          />
          <Button disabled={isButtonDisabled} onClick={startTask}>
            {isButtonDisabled ? "Provide context to enable" : "Create Annotation"}
          </Button>
        </>
      );
    }

    if (state === "error") {
      return (
        <>
          <div>
            <Heading level="h4">Error</Heading>
            <p>There was an error processing the transcription task:</p>
          </div>
          <div>{errorText}</div>
          <Button onClick={startTask}>Retry</Button>
        </>
      );
    }

    return (
      <>
        <MessagesContainer conversationState="idle" messages={messages} />
        {conversationState === "assistant_responding" ? (
          <div className={styles.loadingIndicator}>Processing...</div>
        ) : null}
        {updateViewerButton === "visible" && this.viewer_iiif_content_callback ? (
          <Button
            onClick={() => {
              this.viewer_iiif_content_callback!(encodedContentState);
            }}
          >
            Update Viewer with Annotation
          </Button>
        ) : null}
      </>
    );
  }

  TaskTranscribeCanvas() {
    /* eslint-disable react-hooks/rules-of-hooks */
    const { state: pluginState } = usePlugin();
    const [state, setState] = useState<"info" | "processing" | "error">("info");
    const [errorText, setErrorText] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    /* eslint-enable react-hooks/rules-of-hooks */

    const startTask = async () => {
      try {
        setState("processing");

        const first_tool_message: Message = {
          role: "assistant",
          type: "tool-call",
          content: {
            type: "text",
            tool_name: "TranscribeCanvas",
            content: "Getting current canvas content for transcription.",
          },
        };
        setMessages([first_tool_message]);

        // step 1: get the current canvas from the plugin state
        const canvas: Canvas = pluginState.vault.serialize(
          {
            type: "Canvas",
            id: pluginState.activeCanvas.id,
          },
          serializeConfigPresentation3,
        );

        // step 2: get the first painting from the canvas
        const paintings: ContentResource[] = [];
        const traverse = new Traverse({
          contentResource: [
            (resource) => {
              if (resource.type === "Image") {
                paintings.push(resource);
              }
            },
          ],
        });
        traverse.traverseCanvasItems(canvas);

        const painting = paintings[0].id;

        if (!painting) {
          throw new Error("No painting found on canvas");
        }

        const second_tool_message: Message = {
          role: "assistant",
          type: "tool-call",
          content: {
            type: "text",
            tool_name: "TranscribeCanvas",
            content: "Sending painting for transcription.",
          },
        };
        setMessages((prevMessages) => [...prevMessages, second_tool_message]);

        // step 3: set up the messages to send to the model
        const systemMessage: ModelMessage = {
          role: "system",
          content: dedent`
            You are an AI assistant that transcribes text from images, providing detailed and accurate transcriptions.
          `,
        };

        const userMessageText = dedent`
          Please transcribe any text you can find in the provided image. 
          Provide the transcription in a clear and structured format.
          ${inputValue ? `Here is some additional context to consider: ${inputValue}` : ""}
        `;
        const userMessage: ModelMessage = {
          role: "user",
          content: [
            {
              type: "image",
              image: painting,
            },
            {
              type: "text",
              text: userMessageText,
            },
          ],
        };

        // step 4: call a custom function to generate the response
        const result = await this.#task_generate_response([systemMessage, userMessage]);

        // step 5: show the response in the messages container
        const assistantMessage: Message = {
          role: "assistant",
          type: "response",
          content: {
            type: "text",
            content: result,
          },
        };
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
        setErrorText(error instanceof Error ? error.message : "An unknown error occurred.");
        setState("error");
      }
    };

    if (state === "info") {
      return (
        <>
          <div>
            <Heading level="h4">Transcribe Text from Canvas</Heading>
            <p className={styles.taskDescription}>
              This task will analyze the current canvas and attempt to transcribe any text it finds
              within the image.
            </p>
          </div>
          <PromptInput
            aria-label="Provide additional context for the task"
            placeholder="Provide additional context for the task"
            onChange={({ currentTarget }) => {
              setInputValue(currentTarget.value.trim());
            }}
          />
          <Button onClick={startTask}>Start Transcription</Button>
        </>
      );
    }

    if (state === "error") {
      return (
        <>
          <div>
            <Heading level="h4">Error</Heading>
            <p>There was an error processing the transcription task:</p>
          </div>
          <div>{errorText}</div>
        </>
      );
    }

    return <MessagesContainer conversationState="idle" messages={messages} />;
  }
}
