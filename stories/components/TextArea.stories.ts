import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Textarea } from "../../src/components/TextArea";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Textarea",
  component: Textarea,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // Use `fn` to spy on the onChange arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { onChange: fn(), label: "A label" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {},
};

export const DefaultVariant: Story = {
  name: "Variant / Default",
  args: {
    variant: "default",
  },
};

export const BorderedVariant: Story = {
  name: "Variant / Bordered",
  args: {
    variant: "bordered",
  },
};

export const FilledVariant: Story = {
  name: "Variant / Filled",
  args: {
    variant: "filled",
  },
};

export const Small: Story = {
  name: "Size / Small",
  args: {
    size: "small",
  },
};

export const Medium: Story = {
  name: "Size / Medium (Default)",
  args: {
    size: "medium",
  },
};

export const Large: Story = {
  name: "Size / Large",
  args: {
    size: "large",
  },
};

export const VisibleLabel: Story = {
  name: "Label Display / Visible (Default)",
  args: {
    labelDisplay: "visible",
  },
};

export const HiddenLabel: Story = {
  name: "Label Display / Hidden",
  args: {
    labelDisplay: "hidden",
    label: "When label is hidden, the placeholder is used",
  },
};

export const WithHelperText: Story = {
  name: "State / With Helper Text",
  args: {
    helperText: "This is helpful information about the field",
  },
};

export const WithError: Story = {
  name: "State / With Error",
  args: {
    error: "This field is required",
  },
};

export const WithChildren: Story = {
  args: {
    children: "👍 Send",
  },
};
