import type { Button } from "@components";
import type { PluginContextActions, PluginContextStore } from "@context";
import type { ManifestNormalized } from "@iiif/presentation-3-normalized";
import type { ConversationState, Message } from "@types";
import { getLabelByUserLanguage } from "@utils";
import dedent from "dedent";
import type { Dispatch } from "react";

type ProviderStatus = "initializing" | "ready" | "error";

/**
 * A Provider class that handles interfacing with the Plugin.
 */
export abstract class BaseProvider {
  #plugin_dispatch: Dispatch<PluginContextActions> | undefined;
  #plugin_state: PluginContextStore | undefined;
  #status: ProviderStatus;

  constructor() {
    this.#status = "ready";
  }

  /**
   * Get the dispatch function to allow the Provider to update Plugin state
   */
  private get plugin_dispatch(): Dispatch<PluginContextActions> {
    if (!this.#plugin_dispatch) {
      throw new Error("Provider dispatch not initialized.");
    }
    return this.#plugin_dispatch;
  }

  /**
   * Sets the dispatch function to allow the Provider to update Plugin state
   */
  private set plugin_dispatch(dispatch: Dispatch<PluginContextActions>) {
    this.#plugin_dispatch = dispatch;
  }

  /**
   * Get the current Plugin state
   */
  protected get plugin_state(): PluginContextStore {
    if (!this.#plugin_state) {
      throw new Error("Provider plugin_state not initialized.");
    }
    return this.#plugin_state;
  }

  /**
   * Sets the current Plugin state
   */
  protected set plugin_state(state: PluginContextStore) {
    this.#plugin_state = state;
  }

  /**
   * Add messages to the Plugin state
   */
  protected add_messages(messages: Message[]) {
    this.plugin_dispatch({
      type: "addMessages",
      messages,
    });
  }

  /**
   * Generate a system prompt based on the provided manifest
   *
   * @param manifest the IIIF manifest
   * @returns a system prompt string based on the manifest data
   */
  protected generate_system_prompt(manifest: ManifestNormalized) {
    const title = getLabelByUserLanguage(manifest.label ?? undefined)?.[0] ?? "N/A";
    const summary = getLabelByUserLanguage(manifest.summary ?? undefined)?.[0] ?? "N/A";
    return dedent`
      You are a helpful assistant that can answer questions about the item in the image viewer. 
      
      Here is the manifest data for the item:

      ## Title: ${title}
      ## Summary: ${summary}
      ## Raw Metadata: ${JSON.stringify(manifest.metadata)}
      `;
  }

  /**
   * Update the Plugin's conversation state.
   */
  protected set_conversation_state(state: ConversationState) {
    this.plugin_dispatch({
      type: "setConversationState",
      conversationState: state,
    });
  }

  /**
   * Update the last message in the Plugin state.
   */
  protected update_last_message(message: Message) {
    this.plugin_dispatch({
      type: "updateLastMessage",
      message,
    });
  }

  /**
   *  Update the Plugin state with the current Provider.
   */
  protected update_plugin_provider() {
    this.plugin_dispatch({
      type: "updateProvider",
      provider: this,
    });
  }

  /**
   * Abstract method that providers must implement to handle chat messages
   */
  abstract generate_response(messages: Message[], conversationHistory: Message[]): Promise<void>;

  /**
   * Get the current status of the Provider
   */
  get status(): ProviderStatus {
    return this.#status;
  }

  /**
   * Set the current status of the Provider
   */
  set status(value: ProviderStatus) {
    this.#status = value;
  }

  /**
   * A component that providers can implement to add buttons to the Prompt Input area, extending functionality.
   */
  PromptInputButtons(): JSX.Element & { props: { children: (typeof Button)[] } } {
    return <></>;
  }

  /**
   * Set the system prompt in the Plugin state based on the current manifest.
   */
  set_system_prompt() {
    const systemPrompt = this.generate_system_prompt(this.plugin_state.manifest);

    this.plugin_dispatch({
      type: "setSystemPrompt",
      systemPrompt,
    });
  }

  /**
   * A component that a Provider can implement before users can chat.
   *
   * @remarks This is useful for setting up authentication or other pre-requisites.
   */
  SetupComponent(): JSX.Element {
    return <></>;
  }

  /**
   * Update the reference to the Plugin's dispatch function
   */
  update_plugin_dispatch(dispatch: Dispatch<PluginContextActions>) {
    this.plugin_dispatch = dispatch;
  }

  /**
   * Update the reference to the Plugin's state
   */
  update_plugin_state(context: PluginContextStore) {
    this.plugin_state = context;
  }
}
