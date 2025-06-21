import type { PluginContextActions } from "@context";
import type { ConversationState, Message } from "@types";
import type { Dispatch } from "react";

type ProviderStatus = "initializing" | "ready" | "error";

/**
 * A Provider class that handles interfacing with the Plugin.
 *
 */
export abstract class BaseProvider {
  #dispatch: Dispatch<PluginContextActions> | undefined;
  #status: ProviderStatus;

  constructor() {
    this.#status = "ready";
  }

  private get dispatch(): Dispatch<PluginContextActions> {
    if (!this.#dispatch) {
      throw new Error("Provider dispatch not initialized.");
    }
    return this.#dispatch;
  }

  /**
   * Sets the dispatch function to allow the provider to update Plugin state
   */
  private set dispatch(dispatch: Dispatch<PluginContextActions>) {
    this.#dispatch = dispatch;
  }

  /**
   * Add messages to the Plugin state
   */
  protected add_messages(messages: Message[]) {
    this.dispatch({
      type: "addMessages",
      messages,
    });
  }

  /**
   * Update the Plugin's conversation state.
   */
  protected set_conversation_state(state: ConversationState) {
    this.dispatch({
      type: "setConversationState",
      conversationState: state,
    });
  }

  /**
   *  Update the Plugin state with the current provider.
   */
  protected update_plugin_provider(provider: BaseProvider) {
    this.dispatch({
      type: "updateProvider",
      provider,
    });
  }

  /**
   * Abstract method that providers must implement to handle chat messages
   */
  abstract send_messages(messages: Message[], conversationHistory: Message[]): Promise<void>;

  get status(): ProviderStatus {
    return this.#status;
  }

  set status(value: ProviderStatus) {
    this.#status = value;
  }

  /**
   * A component that providers can implement to set up their UI.
   */
  SetupComponent(): JSX.Element {
    return <></>;
  }

  update_dispatch(dispatch: Dispatch<PluginContextActions>) {
    this.dispatch = dispatch;
  }
}
