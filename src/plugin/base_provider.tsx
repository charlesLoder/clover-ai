import type { PluginContextActions, PluginContextStore } from "@context";
import { ManifestNormalized } from "@iiif/presentation-3-normalized";
import type { ConversationState, Message } from "@types";
import { getLabelByUserLanguage } from "@utils";
import dedent from "dedent";
import type { Dispatch } from "react";

type ProviderStatus = "initializing" | "ready" | "error";

/**
 * A Provider class that handles interfacing with the Plugin.
 *
 */
export abstract class BaseProvider {
  #plugin_dispatch: Dispatch<PluginContextActions> | undefined;
  #plugin_state: PluginContextStore | undefined;
  #status: ProviderStatus;

  constructor() {
    this.#status = "ready";
  }

  private get plugin_dispatch(): Dispatch<PluginContextActions> {
    if (!this.#plugin_dispatch) {
      throw new Error("Provider dispatch not initialized.");
    }
    return this.#plugin_dispatch;
  }

  /**
   * Sets the dispatch function to allow the provider to update Plugin state
   */
  private set plugin_dispatch(dispatch: Dispatch<PluginContextActions>) {
    this.#plugin_dispatch = dispatch;
  }

  protected get plugin_state(): PluginContextStore {
    if (!this.#plugin_state) {
      throw new Error("Provider plugin_state not initialized.");
    }
    return this.#plugin_state;
  }

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
   *  Update the Plugin state with the current provider.
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

  get status(): ProviderStatus {
    return this.#status;
  }

  set status(value: ProviderStatus) {
    this.#status = value;
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
   * A component that providers can implement to set up their UI.
   */
  SetupComponent(): JSX.Element {
    return <></>;
  }

  update_dispatch(dispatch: Dispatch<PluginContextActions>) {
    this.plugin_dispatch = dispatch;
  }

  update_plugin_state(context: PluginContextStore) {
    this.plugin_state = context;
  }
}
