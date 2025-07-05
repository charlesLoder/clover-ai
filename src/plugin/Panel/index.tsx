import { Heading, Message, MessagesContainer } from "@components";
import { PluginContextProvider, usePlugin } from "@context";
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
    const manifest = state.vault.get({ type: "Manifest", id: viewerState.activeManifest });
    dispatch({
      type: "setManifest",
      manifest,
    });
  }, [viewerState.activeManifest, state.vault, dispatch]);

  useEffect(() => {
    const canvas = state.vault.get({ type: "Canvas", id: viewerState.activeCanvas });
    dispatch({
      type: "setActiveCanvas",
      activeCanvas: canvas,
    });
  }, [viewerState.activeCanvas, state.vault, dispatch]);

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
    <PluginContextProvider clover={props}>
      <PluginPanelComponent {...props} />
    </PluginContextProvider>
  );
}
