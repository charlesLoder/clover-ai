import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading } from "../../src/components/Heading";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Heading",
  component: Heading,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const H1: Story = {
  name: "Level / H1",
  args: {
    level: "h1",
    children: "This is a heading",
  },
};

export const H2: Story = {
  name: "Level / H2",
  args: {
    level: "h2",
    children: "This is a heading",
  },
};

export const H3: Story = {
  name: "Level / H3 (Default)",
  args: {
    level: "h3",
    children: "This is a heading",
  },
};

export const H4: Story = {
  name: "Level / H4",
  args: {
    level: "h4",
    children: "This is a heading",
  },
};

export const H5: Story = {
  name: "Level / H5",
  args: {
    level: "h5",
    children: "This is a heading",
  },
};

export const H6: Story = {
  name: "Level / H6",
  args: {
    level: "h6",
    children: "This is a heading",
  },
};
