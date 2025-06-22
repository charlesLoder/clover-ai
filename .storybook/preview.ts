import type { Preview } from "@storybook/react-vite";
import "../src/plugin/style.css";

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: ["Welcome", "components"],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
