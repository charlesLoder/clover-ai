import type { Meta, StoryObj } from "@storybook/react-vite";
import { MediaContent } from "../../src/components/Messages/MediaContent";
import type { MediaContent as IMediaContent } from "../../src/types";
// @ts-expect-error: image is a static asset
import image from "../assets/PIA00123~small.jpg";

// Sample media content data
const sampleMediaContent: IMediaContent = {
  content: {
    id: "media1",
    src: image,
    type: "image",
    caption: "Sample image content",
  },
  type: "media",
};

const mediaContentWithoutCaption: IMediaContent = {
  content: {
    id: "media2",
    src: image,
    type: "image",
  },
  type: "media",
};

const mediaContentWithLongCaption: IMediaContent = {
  content: {
    id: "media3",
    src: image,
    type: "image",
    caption:
      "This is a longer caption that demonstrates how the MediaContent component handles extended text descriptions for media items.",
  },
  type: "media",
};

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Messages/MediaContent",
  component: MediaContent,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // Default args for the component
  args: {
    role: "user",
    content: sampleMediaContent,
  },
} satisfies Meta<typeof MediaContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: "user",
    content: sampleMediaContent,
  },
};

export const WithoutCaption: Story = {
  args: {
    role: "user",
    content: mediaContentWithoutCaption,
  },
};

export const WithLongCaption: Story = {
  args: {
    role: "user",
    content: mediaContentWithLongCaption,
  },
};
