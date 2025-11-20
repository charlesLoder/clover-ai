/// <reference types="vite/client" />
import Viewer from "@samvera/clover-iiif/viewer";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { PluginControl, PluginPanel } from "../src/plugin";
import { UserTokenProvider } from "../src/providers";
import { WikipediaQueryRun } from "./tools/wikipedia-query-run";

const wiki_tool = new WikipediaQueryRun({
  topKResults: 3,
  maxDocContentLength: 4000,
});

function App() {
  const [iiifContent, setIiifContent] = useState<string>(
    import.meta.env.VITE_IIIF_URL ||
      "https://api.dc.library.northwestern.edu/api/v2/works/8a833741-74a8-40dc-bd1d-c416a3b1bb38?as=iiif",
  );

  const tokenProvider = new UserTokenProvider({
    tools: [wiki_tool],
    viewer_iiif_content_callback: (iiif_resource) => {
      setIiifContent(iiif_resource);
    },
  });
  return (
    <Viewer
      iiifContent={iiifContent}
      plugins={[
        {
          id: "clover-ai",
          imageViewer: {
            controls: {
              component: PluginControl,
            },
          },
          informationPanel: {
            component: PluginPanel,
            label: {
              en: ["AI Chat"],
            },
            componentProps: {
              provider: tokenProvider,
            },
          },
        },
      ]}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
