import { Heading, Message, MessagesContainer } from "@components";
import { PluginContextProvider, usePlugin } from "@context";
import { upgrade } from "@iiif/parser/upgrader";
import type { Plugin as CloverPlugin } from "@samvera/clover-iiif";
import { getLabelByUserLanguage } from "@utils";
import { useEffect, useState } from "react";
import { BaseProvider } from "../base_provider";
import "../style.css";
import { ChatInput } from "./ChatInput";
import { MediaDialog } from "./MediaDialog";
import { PanelWrapper } from "./PanelWrapper";

interface PluginProps {
  provider: BaseProvider;
}

export function PluginPanelComponent(props: CloverPlugin & PluginProps) {
  const { useViewerState, provider } = props;
  const viewerState = useViewerState();
  const { dispatch, state } = usePlugin();
  const [itemTitle, setItemTitle] = useState("");

  useEffect(() => {
    if (provider) {
      provider.update_dispatch(dispatch);
      dispatch({ type: "updateProvider", provider });
    }

    if (!state.systemPrompt) {
      dispatch({
        type: "setSystemPrompt",
        systemPrompt: `You are a helpful assistant that can answer questions about the item in the viewer`,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(viewerState.activeManifest);
        const json = await response.json();
        const manifest = upgrade(json);
        if (manifest.type === "Manifest") {
          dispatch({
            type: "setManifest",
            manifest: manifest,
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching manifest:", error);
      }
    })();
  }, [viewerState.activeManifest, dispatch]);

  useEffect(() => {
    if (state.manifest) {
      const activeCanvas = state.manifest.items.find(
        (canvas) => canvas.id === viewerState.activeCanvas,
      );
      dispatch({
        type: "setActiveCanvas",
        activeCanvas: activeCanvas || undefined,
      });
    }
  }, [viewerState.activeCanvas, state.manifest, dispatch]);

  useEffect(() => {
    if (state.manifest) {
      // Update system prompt with manifest metadata
      dispatch({
        type: "setSystemPrompt",
        systemPrompt: `You are a helpful assistant that can answer questions about the item in the viewer. Here is the manifest data for the item:\n\n${JSON.stringify(state.manifest["metadata"], null, 2)}`,
      });
      const label = state.manifest.label;
      const title = getLabelByUserLanguage(label);
      setItemTitle(title.length > 0 ? title[0] : "this item");
    }
  }, [state.manifest, dispatch]);

  useEffect(() => {
    dispatch({
      type: "setOpenSeaDragonViewer",
      openSeaDragonViewer: viewerState.openSeadragonViewer ?? undefined,
    });
  }, [viewerState.openSeadragonViewer, dispatch]);

  if (!state.provider) {
    return <div style={{ padding: "0px 1.618rem 2rem" }}>Error: No provider instantiated.</div>;
  }

  const SetupUI = state.provider.SetupComponent.bind(state.provider); // bind `this`;
  if (state.provider.status === "initializing") {
    return (
      <PanelWrapper>
        <SetupUI />
      </PanelWrapper>
    );
  }

  return (
    <PanelWrapper>
      <Heading level="h4">Chat about {itemTitle}</Heading>
      <MessagesContainer messages={state.messages} />
      {state.conversationState === "assistant_responding" && (
        <Message
          key={`message-loading`}
          message={{
            role: "assistant",
            content: { type: "text", content: "Thinking..." },
          }}
        />
      )}
      <MediaDialog />
      <ChatInput />
    </PanelWrapper>
  );
}

export function PluginPanel(props: CloverPlugin & PluginProps) {
  return (
    <PluginContextProvider>
      <PluginPanelComponent {...props} />
    </PluginContextProvider>
  );
}
