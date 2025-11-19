import { Heading, MessagesContainer } from "@components";
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
      provider.update_plugin_dispatch(dispatch);
      provider.update_plugin_state(state);
      provider.set_system_prompt();
      dispatch({ type: "updateProvider", provider });
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
      const label = state.manifest?.label ?? undefined;
      const title = getLabelByUserLanguage(label);
      setItemTitle(title.length > 0 ? title[0] : "this item");
    }
  }, [state.manifest]);

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
      <MessagesContainer
        conversationState={state.conversationState}
        messages={state.messages.filter((m) => m.role !== "system")}
      />
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
