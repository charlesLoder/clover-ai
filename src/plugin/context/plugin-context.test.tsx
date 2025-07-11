import type { Plugin as CloverIIIF } from "@samvera/clover-iiif";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Message } from "@types";
import { loadMessagesFromStorage } from "@utils";
import { describe, expect, it, type Mock, vi } from "vitest";
import {
  type PluginContextActions,
  PluginContextProvider,
  type PluginContextStore,
  pluginReducer,
  usePlugin,
  usePluginDispatch,
  usePluginState,
} from "./plugin-context";

// Mock utility functions
vi.mock("@utils", () => ({
  loadMessagesFromStorage: vi.fn(),
  setMessagesToStorage: vi.fn(),
}));

const mockInitialState: PluginContextStore = {
  activeCanvas: {} as any,
  conversationState: "idle",
  manifest: {} as any,
  mediaDialogState: "closed",
  messages: [],
  openSeaDragonViewer: undefined,
  provider: undefined,
  selectedMedia: [],
  systemPrompt: "",
  vault: {} as any,
};

describe("pluginReducer", () => {
  it("should handle setSystemPrompt", () => {
    const systemPrompt = "You are a helpful assistant.";
    const action: PluginContextActions = { type: "setSystemPrompt", systemPrompt };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.systemPrompt).toBe(systemPrompt);
    expect(newState.messages).toEqual([
      {
        role: "system",
        content: { type: "text", content: systemPrompt },
      },
    ]);
  });

  it("should update system prompt message if it already exists", () => {
    const initialSystemPrompt = "Initial prompt";
    const stateWithSystemPrompt: PluginContextStore = {
      ...mockInitialState,
      systemPrompt: initialSystemPrompt,
      messages: [
        {
          role: "system",
          content: { type: "text", content: initialSystemPrompt },
        },
      ],
    };

    const newSystemPrompt = "You are a super helpful assistant.";
    const action: PluginContextActions = { type: "setSystemPrompt", systemPrompt: newSystemPrompt };
    const newState = pluginReducer(stateWithSystemPrompt, action);

    expect(newState.systemPrompt).toBe(newSystemPrompt);
    expect(newState.messages.filter((m) => m.role === "system").length).toBe(1);
    expect(newState.messages).toContainEqual({
      role: "system",
      content: { type: "text", content: newSystemPrompt },
    });
  });

  it("should handle addMessages", () => {
    const newMessages: Message[] = [
      { role: "user", content: [{ type: "text", content: "Hello" }] },
    ];
    const action: PluginContextActions = { type: "addMessages", messages: newMessages };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.messages).toEqual(newMessages);
  });

  it("should handle clearConversation", () => {
    const stateWithMessages: PluginContextStore = {
      ...mockInitialState,
      messages: [
        { role: "system", content: { type: "text", content: "System prompt" } },
        { role: "user", content: [{ type: "text", content: "Hello" }] },
      ],
    };
    const action: PluginContextActions = { type: "clearConversation" };
    const newState = pluginReducer(stateWithMessages, action);

    expect(newState.messages).toEqual([
      { role: "system", content: { type: "text", content: "System prompt" } },
    ]);
  });

  it("should handle updateProvider", () => {
    const provider = { name: "TestProvider" } as any;
    const action: PluginContextActions = { type: "updateProvider", provider };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.provider).toEqual(provider);
  });

  it("should throw error if provider is undefined in updateProvider", () => {
    const action: PluginContextActions = { type: "updateProvider", provider: undefined as any };
    expect(() => pluginReducer(mockInitialState, action)).toThrow(
      "Provider cannot be undefined in updateProvider action",
    );
  });

  it("should handle setManifest", () => {
    const manifest = { id: "manifest-1" } as any;
    const action: PluginContextActions = { type: "setManifest", manifest };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.manifest).toEqual(manifest);
  });

  it("should handle setActiveCanvas", () => {
    const activeCanvas = { id: "canvas-1" } as any;
    const action: PluginContextActions = { type: "setActiveCanvas", activeCanvas };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.activeCanvas).toEqual(activeCanvas);
  });

  it("should handle setConversationState", () => {
    const conversationState = "assistant_responding";
    const action: PluginContextActions = { type: "setConversationState", conversationState };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.conversationState).toBe(conversationState);
  });

  it("should handle setMediaDialogState", () => {
    const state = "open";
    const action: PluginContextActions = { type: "setMediaDialogState", state };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.mediaDialogState).toBe(state);
  });

  it("should handle setSelectedMedia", () => {
    const selectedMedia = [{ type: "image", url: "http://example.com/img.png" }] as any;
    const action: PluginContextActions = { type: "setSelectedMedia", selectedMedia };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.selectedMedia).toEqual(selectedMedia);
  });

  it("should handle setOpenSeaDragonViewer", () => {
    const openSeaDragonViewer = { id: "osd-viewer" } as any;
    const action: PluginContextActions = { type: "setOpenSeaDragonViewer", openSeaDragonViewer };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.openSeaDragonViewer).toEqual(openSeaDragonViewer);
  });

  it("should handle setVault", () => {
    const vault = { id: "vault-1" } as any;
    const action: PluginContextActions = { type: "setVault", vault };
    const newState = pluginReducer(mockInitialState, action);

    expect(newState.vault).toEqual(vault);
  });

  it("should throw an error for an unknown action type", () => {
    const action: PluginContextActions = { type: "UNKNOWN_ACTION" } as any;
    expect(() => pluginReducer(mockInitialState, action)).toThrow(
      "Unknown action type: UNKNOWN_ACTION",
    );
  });
});

describe("PluginContextProvider", () => {
  const TestStateHookComponent = () => {
    usePluginState();
    return null;
  };

  it("should throw error if usePluginState is used outside of provider", () => {
    const spy = vi.spyOn(console, "error");
    spy.mockImplementation(() => {});

    expect(() => render(<TestStateHookComponent />)).toThrow(
      "usePluginState must be used within a PluginProvider",
    );
    spy.mockRestore();
  });

  const TestDispatchHookComponent = () => {
    usePluginDispatch();
    return null;
  };

  it("should throw error if usePluginDispatch is used outside of provider", () => {
    const spy = vi.spyOn(console, "error");
    spy.mockImplementation(() => {});

    expect(() => render(<TestDispatchHookComponent />)).toThrow(
      "usePluginContext must be used within a PluginProvider",
    );
    spy.mockRestore();
  });

  const mockClover = {
    useViewerState: () => ({
      vault: {
        get: vi.fn((query) => {
          if (query.type === "Manifest") return { id: "manifest-1", type: "Manifest" };
          if (query.type === "Canvas") return { id: "canvas-1", type: "Canvas" };
          return null;
        }),
      },
      activeManifest: "manifest-1",
      activeCanvas: "canvas-1",
    }),
  } as unknown as CloverIIIF;

  const TestComponent = () => {
    const { state, dispatch } = usePlugin();
    return (
      <div>
        <div data-testid="conversation-state">{state.conversationState}</div>
        <div data-testid="manifest-id">{state.manifest?.id}</div>
        <button
          onClick={() =>
            dispatch({
              type: "setConversationState",
              conversationState: "assistant_responding",
            })
          }
        >
          Update State
        </button>
      </div>
    );
  };

  it("should provide initial state from clover", () => {
    render(
      <PluginContextProvider clover={mockClover}>
        <TestComponent />
      </PluginContextProvider>,
    );

    expect(screen.getByTestId("conversation-state").textContent).toBe("idle");
    expect(screen.getByTestId("manifest-id").textContent).toBe("manifest-1");
  });

  it("should update state when an action is dispatched", () => {
    render(
      <PluginContextProvider clover={mockClover}>
        <TestComponent />
      </PluginContextProvider>,
    );

    expect(screen.getByTestId("conversation-state").textContent).toBe("idle");

    fireEvent.click(screen.getByText("Update State"));

    expect(screen.getByTestId("conversation-state").textContent).toBe("assistant_responding");
  });

  it("should initialize with messages from storage", () => {
    const storedMessages = [{ role: "user", content: [{ type: "text", content: "from storage" }] }];
    (loadMessagesFromStorage as Mock).mockReturnValue(storedMessages);

    const TestMessagesComponent = () => {
      const { state } = usePlugin();
      return (
        <div data-testid="message-content">
          {
            state.messages.find((m) => m.role === "user")?.content.find((c) => c.type === "text")
              ?.content
          }
        </div>
      );
    };

    render(
      <PluginContextProvider clover={mockClover}>
        <TestMessagesComponent />
      </PluginContextProvider>,
    );

    expect(screen.getByTestId("message-content").textContent).toBe("from storage");
    (loadMessagesFromStorage as Mock).mockClear();
  });
});
