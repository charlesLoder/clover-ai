import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PromptInput } from "../../src/components/PromptInput";

// Updated story to reflect the new PromptInput component, replacing legacy Textarea.
const meta = {
  title: "components/PromptInput",
  component: PromptInput,
  tags: ["autodocs"],
  args: { onChange: fn(), placeholder: "What would you like to know?" },
} satisfies Meta<typeof PromptInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic default state.
export const Default: Story = {
  args: {},
};

// Custom placeholder text.
export const CustomPlaceholder: Story = {
  name: "Placeholder / Custom",
  args: {
    placeholder: "Ask me anything...",
  },
};

// Pre-filled (uncontrolled) content using defaultValue.
export const PreFilled: Story = {
  name: "State / Pre-filled",
  args: {
    defaultValue: "Hello model, explain quantum entanglement simply.",
  },
};

// Error state rendering the error message.
export const WithError: Story = {
  name: "State / With Error",
  args: {
    error: "This field is required",
  },
};

// Shows children slot (e.g., an action button area).
export const WithChildren: Story = {
  name: "Slot / With Children",
  args: {
    children: "👍 Send",
  },
};
