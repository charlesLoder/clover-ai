# Clover AI

Add AI capabilities to Clover-IIIF using any LLM provider.

## 🚀 Quick start

To get started, you can use the included provider which prompts users for their Anthropic, Google, or OpenAI API key.

> [!TIP]
> To implement your own provider, see the [docs](https://charlesloder.github.io/clover-ai/?path=/docs/creating-a-provider--docs)

Install [Clover-IIIF](https://samvera-labs.github.io/clover-iiif/) and the plugin:

```bash
npm install @samvera/clover-iiif clover-ai
```

Add the plugin to the `Viewer` component:

```tsx
import Viewer from "@samvera/clover-iiif/viewer";
import { PluginControl, PluginPanel } from "clover-ai";
import { UserTokenProvider } from "clover-ai/provider";

<Viewer
  iiifContent={
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
          provider: new UserTokenProvider(),
        },
      },
    },
  ]}
/>;
```

## 🛠️ Develop

To get started locally, ensure your running the correct version of node in the [.nvmrc](./.nvmrc)

```bash
node -v
```

Then:

```bash
git clone https://github.com/charlesLoder/clover-ai
cd clover-ai
npm i
npm run dev
```

This will spin up a Vite server at http://localhost:3000/

To change which manifest is used, add the following to your session:

```bash
export VITE_IIIF_URL="<MANIFEST_URL>"
```

## Docs

Read the [docs](https://charlesloder.github.io/clover-ai/?path=/docs/welcome--docs)
