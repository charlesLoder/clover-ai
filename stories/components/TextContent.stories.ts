import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextContent } from "../../src/components/Messages/TextContent";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Messages/TextContent",
  component: TextContent,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
} satisfies Meta<typeof TextContent>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Assistant: Story = {
  args: {
    role: "assistant",
    textContent: {
      content: "Hello! I'm an AI assistant. How can I help you today?",
      type: "text",
    },
  },
};

export const User: Story = {
  args: {
    role: "user",
    textContent: {
      content: "Can you help me with a coding question?",
      type: "text",
    },
  },
};
