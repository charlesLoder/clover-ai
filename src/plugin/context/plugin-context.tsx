import type { Canvas, Manifest } from "@iiif/presentation-3";
import type { ConversationState, Media, Message } from "@types";
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

interface ClearMessagesAction {
  type: "clearMessages";
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
  | ClearMessagesAction
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
    case "setSystemPrompt":
      return {
        ...state,
        systemPrompt: action.systemPrompt,
        messages: [
          { role: "system", content: { type: "text", content: action.systemPrompt } },
          ...state.messages.filter((m) => m.role !== "system"),
        ],
      };
    case "addMessages":
      return { ...state, messages: [...state.messages, ...action.messages] };
    case "clearMessages":
      // Clear all messages except system messages
      return { ...state, messages: [...state.messages.filter((m) => m.role === "system")] };
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
  const [state, dispatch] = useReducer(pluginReducer, defaultPluginContextStore);

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
