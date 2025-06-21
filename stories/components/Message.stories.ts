import type { Meta, StoryObj } from "@storybook/react-vite";
import { Message } from "../../src/components/Messages/Message";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Messages/Message",
  component: Message,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const AssistantMessage: Story = {
  args: {
    message: {
      role: "assistant",
      content: {
        content: "Hello! I'm an AI assistant. How can I help you today?",
        type: "text",
      },
    },
  },
};

export const UserTextMessage: Story = {
  args: {
    message: {
      role: "user",
      content: [
        {
          content: "Can you help me with a coding question?",
          type: "text",
        },
      ],
    },
  },
};

export const UserMediaMessage: Story = {
  args: {
    message: {
      role: "user",
      content: [
        {
          content: {
            id: "1",
            src: "/stories/assets/PIA00123~small.jpg",
            type: "image",
            caption: "Sample image from NASA",
          },
          type: "media",
        },
      ],
    },
  },
};
