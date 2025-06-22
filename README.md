# Clover AI

Add AI capabilities to Clover-IIIF using any LLM provider.

## 🚀 Quick start

Visit the [docs site](https://charlesloder.github.io/clover-ai/?path=/docs/welcome--docs) to learn more about Clover AI and get started.

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
