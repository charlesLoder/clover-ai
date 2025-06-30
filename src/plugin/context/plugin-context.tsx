import type { Canvas, Manifest } from "@iiif/presentation-3";
import type { ConversationState, Media, Message } from "@types";
import { loadMessagesFromStorage, setMessagesToStorage } from "@utils";
import type { Viewer } from "openseadragon";
import type { Dispatch } from "react";
import { createContext, useContext, useReducer } from "react";
import type { BaseProvider } from "../base_provider";

export interface PluginContextStore {
  activeCanvas: Canvas | undefined;
  conversationState: ConversationState;
  manifest: Manifest | undefined;
  mediaDialogState: "closed" | "open";
  messages: Message[];
  openSeaDragonViewer: Viewer | undefined;
  provider: BaseProvider | undefined;
  selectedMedia: Media[];
  systemPrompt: string;
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
  activeCanvas: Canvas | undefined;
  type: "setActiveCanvas";
}

interface SetConversationState {
  conversationState: ConversationState;
  type: "setConversationState";
}

interface SetManifestAction {
  manifest: Manifest | undefined;
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

interface SystemPromptAction {
  systemPrompt: string;
  type: "setSystemPrompt";
}

interface UpdateProviderAction {
  provider: BaseProvider;
  type: "updateProvider";
}

export type PluginContextActions =
  | SystemPromptAction
  | AddMessageAction
  | ClearConversation
  | UpdateProviderAction
  | SetConversationState
  | SetManifestAction
  | SetActiveCanvasAction
  | SetMediaDialogStateAction
  | SetSelectedMediaAction
  | SetOSDViewerAction;

const defaultPluginContextStore: PluginContextStore = {
  systemPrompt: "",
  messages: [],
  provider: undefined,
  conversationState: "idle",
  mediaDialogState: "closed",
  selectedMedia: [],
  manifest: undefined,
  activeCanvas: undefined,
  openSeaDragonViewer: undefined,
};

const PluginStateContext = createContext<PluginContextStore>(defaultPluginContextStore);
const PluginDispatchContext = createContext<Dispatch<PluginContextActions> | null>(null);

function pluginReducer(
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
    default:
      //@ts-expect-error - this is a catch-all for unknown action types
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

export const PluginContextProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize state with messages from session storage if available
  const getInitialState = (): PluginContextStore => {
    const storedMessages = loadMessagesFromStorage();
    return {
      ...defaultPluginContextStore,
      messages: storedMessages,
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
