import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Button } from "../../src/components/Button";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Button",
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    children: "Click me",
  },
};

export const Primary: Story = {
  name: "Variant / Primary",
  args: {
    variant: "primary",
    children: "Click me",
  },
};

export const Secondary: Story = {
  name: "Variant / Secondary",
  args: {
    variant: "secondary",
    children: "Click me",
  },
};

export const Ghost: Story = {
  name: "Variant / Ghost",
  args: {
    variant: "ghost",
    children: "Click me",
  },
};

export const Danger: Story = {
  name: "Variant / Danger",
  args: {
    variant: "danger",
    children: "Click me",
  },
};

export const Idle: Story = {
  name: "State / Idle (Default)",
  args: {
    state: "idle",
    children: "Click me",
  },
};

export const Loading: Story = {
  name: "State / Loading",
  args: {
    state: "loading",
    children: "Click me",
  },
};

export const Error: Story = {
  name: "State / Error",
  args: {
    state: "error",
    children: "Click me",
  },
};

export const Small: Story = {
  name: "Size / Small",
  args: {
    size: "small",
    children: "Click me",
  },
};
export const Medium: Story = {
  name: "Size / Medium (Default)",
  args: {
    size: "medium",
    children: "Click me",
  },
};
export const Large: Story = {
  name: "Size / Large",
  args: {
    size: "large",
    children: "Click me",
  },
};
export const Pill: Story = {
  name: "Shape / Pill (Default)",
  args: {
    shape: "pill",
    children: "Click me",
  },
};
export const Circle: Story = {
  name: "Shape / Circle",
  args: {
    shape: "circle",
    children: "×",
  },
};
