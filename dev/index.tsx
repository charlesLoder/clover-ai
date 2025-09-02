/// <reference types="vite/client" />
import { Calculator } from "@langchain/community/tools/calculator";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import Viewer from "@samvera/clover-iiif/viewer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PluginControl, PluginPanel } from "../src/plugin";
import { UserTokenProvider } from "../src/providers";

const wiki_tool = new WikipediaQueryRun({
  topKResults: 3,
  maxDocContentLength: 4000,
});

const calc_tool = new Calculator();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Viewer
      iiifContent={
        import.meta.env.VITE_IIIF_URL ||
        "https://api.dc.library.northwestern.edu/api/v2/works/8a833741-74a8-40dc-bd1d-c416a3b1bb38?as=iiif"
      }
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
              provider: new UserTokenProvider({ tools: [wiki_tool, calc_tool] }),
            },
          },
        },
      ]}
    />
  </StrictMode>,
);
