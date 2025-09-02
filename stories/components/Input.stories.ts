import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Input } from "../../src/components/Input";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Input",
  component: Input,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // Use `fn` to spy on the onChange arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { onChange: fn(), onFocus: fn(), onBlur: fn() },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    placeholder: "Enter text...",
  },
};

export const WithLabel: Story = {
  args: {
    label: "Username",
    placeholder: "Enter your username",
  },
};

export const WithHelperText: Story = {
  args: {
    label: "Email",
    placeholder: "Enter your email",
    helperText: "We'll never share your email with anyone else.",
  },
};

export const WithError: Story = {
  args: {
    label: "Password",
    placeholder: "Enter your password",
    error: "Password must be at least 8 characters long.",
  },
};

export const DefaultVariant: Story = {
  name: "Variant / Default",
  args: {
    label: "Default Input",
    placeholder: "Default variant",
  },
};

export const Small: Story = {
  name: "Size / Small",
  args: {
    customSize: "small",
    label: "Small Input",
    placeholder: "Small size",
  },
};

export const Medium: Story = {
  name: "Size / Medium (Default)",
  args: {
    customSize: "medium",
    label: "Medium Input",
    placeholder: "Medium size",
  },
};

export const Large: Story = {
  name: "Size / Large",
  args: {
    customSize: "large",
    label: "Large Input",
    placeholder: "Large size",
  },
};

export const Disabled: Story = {
  name: "State / Disabled",
  args: {
    label: "Disabled Input",
    placeholder: "This input is disabled",
    disabled: true,
  },
};

export const ReadOnly: Story = {
  name: "State / Read Only",
  args: {
    label: "Read Only Input",
    value: "This is read only",
    readOnly: true,
  },
};

export const Required: Story = {
  name: "State / Required",
  args: {
    label: "Required Input",
    placeholder: "This field is required",
    required: true,
  },
};

export const TypeEmail: Story = {
  name: "Type / Email",
  args: {
    type: "email",
    label: "Email Address",
    placeholder: "user@example.com",
  },
};

export const TypePassword: Story = {
  name: "Type / Password",
  args: {
    type: "password",
    label: "Password",
    placeholder: "Enter your password",
  },
};

export const TypeNumber: Story = {
  name: "Type / Number",
  args: {
    type: "number",
    label: "Age",
    min: 0,
    max: 120,
  },
};

export const TypeSearch: Story = {
  name: "Type / Search",
  args: {
    type: "search",
    label: "Search",
    placeholder: "Search for something...",
  },
};

export const TypeTel: Story = {
  name: "Type / Tel",
  args: {
    type: "tel",
    label: "Phone Number",
    placeholder: "+1 (555) 123-4567",
  },
};

export const TypeUrl: Story = {
  name: "Type / URL",
  args: {
    type: "url",
    label: "Website",
    placeholder: "https://example.com",
  },
};
