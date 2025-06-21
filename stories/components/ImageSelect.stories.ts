import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ImageSelect, type ImageSelectProps } from "../../src/components/ImageSelect";
// @ts-expect-error: image is a static asset
import Image from "../assets/PIA00123~small.jpg";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/ImageSelect",
  component: ImageSelect,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // Use `fn` to spy on the onSelectionChange arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: {
    // @ts-expect-error: src is an img attribute
    src: Image,
    alt: "The Pacific Ocean as seen from space",
    figcaption: "Image Select Example",
    onSelectionChange: fn(),
  },
} satisfies Meta<ImageSelectProps>;

export default meta;
type Story = StoryObj<ImageSelectProps>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {},
};

export const Unselected: Story = {
  name: "State / Unselected (Default)",
  args: {
    initialState: "unselected",
  },
};

export const Selected: Story = {
  name: "State / Selected",
  args: {
    initialState: "selected",
  },
};

export const Disabled: Story = {
  name: "State / Disabled",
  args: {
    initialState: "disabled",
  },
};
