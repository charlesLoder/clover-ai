import type { Vault } from "@iiif/helpers";
import type { CanvasNormalized, ManifestNormalized } from "@iiif/presentation-3-normalized";
import type { Plugin as CloverIIIF } from "@samvera/clover-iiif";
import type { ConversationState, Media, Message } from "@types";
import { loadMessagesFromStorage, setMessagesToStorage } from "@utils";
import type { Viewer } from "openseadragon";
import type { Dispatch } from "react";
import { createContext, useContext, useReducer } from "react";
import type { BaseProvider } from "../base_provider";

export interface PluginContextStore {
  activeCanvas: CanvasNormalized;
  conversationState: ConversationState;
  manifest: ManifestNormalized;
  mediaDialogState: "closed" | "open";
  messages: Message[];
  openSeaDragonViewer: Viewer | undefined;
  provider: BaseProvider | undefined;
  selectedMedia: Media[];
  systemPrompt: string;
  vault: Vault;
}

interface AddMessageAction {
  messages: Message[];
  type: "addMessages";
}

interface ClearConversation {
  /** Clear the conversation but not the system prompt */
  type: "clearConversation";
}

interface SetActiveCanvasAction {
  activeCanvas: CanvasNormalized;
  type: "setActiveCanvas";
}

interface SetConversationState {
  conversationState: ConversationState;
  type: "setConversationState";
}

interface SetManifestAction {
  manifest: ManifestNormalized;
  type: "setManifest";
}

interface SetMediaDialogStateAction {
  state: "open" | "closed";
  type: "setMediaDialogState";
}

interface SetOSDViewerAction {
  openSeaDragonViewer: Viewer | undefined;
  type: "setOpenSeaDragonViewer";
}

interface SetSelectedMediaAction {
  selectedMedia: Media[];
  type: "setSelectedMedia";
}

interface SetVaultAction {
  vault: Vault;
  type: "setVault";
}

interface SetSystemPromptAction {
  systemPrompt: string;
  type: "setSystemPrompt";
}

interface UpdateProviderAction {
  provider: BaseProvider;
  type: "updateProvider";
}

interface UpdateLastMessageAction {
  message: Message;
  type: "updateLastMessage";
}

export type PluginContextActions =
  | AddMessageAction
  | ClearConversation
  | SetActiveCanvasAction
  | SetConversationState
  | SetManifestAction
  | SetMediaDialogStateAction
  | SetOSDViewerAction
  | SetSelectedMediaAction
  | SetSystemPromptAction
  | SetVaultAction
  | UpdateProviderAction
  | UpdateLastMessageAction;

/** Default values not inherited from the Clover Viewer */
type InitPluginContextStore = Omit<PluginContextStore, "vault" | "activeCanvas" | "manifest">;

const defaultPluginContextStore: InitPluginContextStore = {
  conversationState: "idle",
  mediaDialogState: "closed",
  messages: [],
  openSeaDragonViewer: undefined,
  provider: undefined,
  selectedMedia: [],
  systemPrompt: "",
};

const PluginStateContext = createContext<PluginContextStore | null>(null);
const PluginDispatchContext = createContext<Dispatch<PluginContextActions> | null>(null);

export function pluginReducer(
  state: PluginContextStore,
  action: PluginContextActions,
): PluginContextStore {
  switch (action.type) {
    case "setSystemPrompt": {
      const systemMessage: Message = {
        role: "system",
        content: { type: "text", content: action.systemPrompt },
      };
      const newMessages = [systemMessage, ...state.messages.filter((m) => m.role !== "system")];
      setMessagesToStorage(newMessages);
      return {
        ...state,
        systemPrompt: action.systemPrompt,
        messages: newMessages,
      };
    }
    case "addMessages": {
      const newMessages = [...state.messages, ...action.messages];
      setMessagesToStorage(newMessages);
      return { ...state, messages: newMessages };
    }
    case "updateLastMessage": {
      const newMessages = [...state.messages];
      newMessages[newMessages.length - 1] = action.message;
      setMessagesToStorage(newMessages);
      return { ...state, messages: newMessages };
    }
    case "clearConversation": {
      // Clear all messages except system messages
      const newMessages = [...state.messages.filter((m) => m.role === "system")];
      setMessagesToStorage(newMessages);
      return { ...state, messages: newMessages };
    }
    case "updateProvider":
      if (!action.provider) {
        throw new Error("Provider cannot be undefined in updateProvider action");
      }
      return { ...state, provider: action.provider };
    case "setManifest":
      return { ...state, manifest: action.manifest };
    case "setActiveCanvas":
      return { ...state, activeCanvas: action.activeCanvas };
    case "setConversationState":
      return { ...state, conversationState: action.conversationState };
    case "setMediaDialogState":
      return { ...state, mediaDialogState: action.state };
    case "setSelectedMedia":
      return { ...state, selectedMedia: action.selectedMedia };
    case "setOpenSeaDragonViewer":
      return { ...state, openSeaDragonViewer: action.openSeaDragonViewer };
    case "setVault":
      return { ...state, vault: action.vault };
    default:
      //@ts-expect-error - this is a catch-all for unknown action types
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

export const PluginContextProvider = ({
  children,
  clover,
}: {
  children: React.ReactNode;
  clover: CloverIIIF;
}) => {
  const { useViewerState } = clover;
  const viewerState = useViewerState();
  // Initialize state with messages from session storage if available
  const getInitialState = (): PluginContextStore => {
    const storedMessages = loadMessagesFromStorage();
    return {
      ...defaultPluginContextStore,
      manifest: viewerState.vault.get({ type: "Manifest", id: viewerState.activeManifest }),
      activeCanvas: viewerState.vault.get({ type: "Canvas", id: viewerState.activeCanvas }),
      messages: storedMessages,
      vault: viewerState.vault,
    };
  };

  const [state, dispatch] = useReducer(pluginReducer, getInitialState());

  return (
    <PluginStateContext.Provider value={state}>
      <PluginDispatchContext.Provider value={dispatch}>{children}</PluginDispatchContext.Provider>
    </PluginStateContext.Provider>
  );
};

export function usePluginState() {
  const context = useContext(PluginStateContext);
  if (!context) {
    throw new Error("usePluginState must be used within a PluginProvider");
  }
  return context;
}

export function usePluginDispatch() {
  const context = useContext(PluginDispatchContext);
  if (!context) {
    throw new Error("usePluginContext must be used within a PluginProvider");
  }
  return context;
}

export function usePlugin() {
  return {
    state: usePluginState(),
    dispatch: usePluginDispatch(),
  };
}
