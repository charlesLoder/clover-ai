import type { Meta, StoryObj } from "@storybook/react-vite";
import { MessagesContainer } from "../../src/components/Messages";
import { MediaContent } from "../../src/components/Messages/MediaContent";
import { Message } from "../../src/components/Messages/Message";
import { TextContent } from "../../src/components/Messages/TextContent";
import type { Message as IMessage } from "../../src/types";
// @ts-expect-error: image is a static asset
import image from "../assets/PIA00123~small.jpg";

// Sample messages for stories
const sampleMessages: IMessage[] = [
  {
    role: "assistant",
    content: {
      content: "Hello! I'm an AI assistant. How can I help you today?",
      type: "text",
    },
  },
  {
    role: "user",
    content: [
      {
        content: "Can you analyze this image for me?",
        type: "text",
      },
      {
        content: {
          id: "img1",
          src: image,
          type: "image",
          caption: "Sample image for analysis",
        },
        type: "media",
      },
    ],
  },
  {
    role: "assistant",
    content: {
      content:
        "I can see this is an image from space. It appears to be a planetary surface with various geological features. The image shows what looks like a cratered terrain, possibly from a moon or planet. The lighting and shadows suggest the photograph was taken from an orbital perspective.",
      type: "text",
    },
  },
  {
    role: "user",
    content: [
      {
        content:
          "That's correct! Can you tell me more about the geological features you can observe?",
        type: "text",
      },
    ],
  },
];

const conversationMessages: IMessage[] = [
  {
    role: "assistant",
    content: {
      content: "Welcome! I'm here to help you with any questions you might have.",
      type: "text",
    },
  },
  {
    role: "user",
    content: [
      {
        content: "Hi there! I'm working on a project and need some guidance.",
        type: "text",
      },
    ],
  },
  {
    role: "assistant",
    content: {
      content:
        "I'd be happy to help with your project! Could you tell me more about what you're working on and what specific guidance you need?",
      type: "text",
    },
  },
  {
    role: "user",
    content: [
      {
        content:
          "I'm building a React component library and want to make sure I'm following best practices.",
        type: "text",
      },
    ],
  },
  {
    role: "assistant",
    content: {
      content:
        "That's a great project! Here are some key best practices for React component libraries:\n\n1. **TypeScript Support**: Use TypeScript for better type safety and developer experience\n2. **Consistent API Design**: Keep props and component interfaces consistent across components\n3. **Accessibility**: Ensure all components meet WCAG guidelines\n4. **Documentation**: Use tools like Storybook for component documentation\n5. **Testing**: Write comprehensive unit and integration tests\n\nWould you like me to elaborate on any of these points?",
      type: "text",
    },
  },
];

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Messages/Messages",
  component: MessagesContainer,
  subcomponents: {
    Message,
    TextContent,
    MediaContent,
  },
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: "400px", padding: "1rem", overflow: "clip", display: "flex" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MessagesContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    messages: sampleMessages,
  },
};

export const WithMarkdown: Story = {
  args: {
    messages: conversationMessages,
  },
};

export const MultipleMediaItems: Story = {
  args: {
    messages: [
      {
        role: "user",
        content: [
          {
            content: "Here are two images I'd like you to compare:",
            type: "text",
          },
          {
            content: {
              id: "img1",
              src: image,
              type: "image",
              caption: "First image",
            },
            type: "media",
          },
          {
            content: {
              id: "img2",
              src: image,
              type: "image",
              caption: "Second image for comparison",
            },
            type: "media",
          },
        ],
      },
    ],
  },
};
