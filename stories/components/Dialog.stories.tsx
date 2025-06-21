import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog } from "../../src/components/Dialog";
import { Heading } from "../../src/components/Heading";

function children(body: string) {
  return (
    <>
      <Heading level={"h2"}>Lorem ipsum</Heading>
      <p>{body}</p>
    </>
  );
}

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Dialog",
  component: Dialog,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    // @ts-expect-error: open is a native prop of Dialog
    open: true,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Default: Story = {
  args: {
    children: children(
      "A default dialog. The heading and body are children so that something is visible, only the close button is included by default. The children are just JSX elements.",
    ),
  },
};

export const CenterDefault: Story = {
  name: "Position / Center (Default)",
  args: {
    children: children("Centered in the viewport. This is the default position for dialogs."),
  },
};

export const VisualCenter: Story = {
  name: "Position / Visual Center",
  args: {
    position: "visual_center",
    children: children(
      "Positioned at the visual center (1/4 down from top). This is useful for dialogs that need to be visually centered.",
    ),
  },
};

export const WidthDefault: Story = {
  name: "Width / Default",
  args: {
    width: "default",
    children: children(
      "This dialog uses the default width from the user agent stylesheet. It will be narrower than stretched dialogs.",
    ),
  },
};

export const WidthStretched: Story = {
  name: "Width / Stretched",
  args: {
    width: "stretched",
    children: children(
      "This dialog is stretched to 60% of viewport width or 300px minimum. It provides a wider view for content.",
    ),
  },
};

export const WidthFullScreen: Story = {
  name: "Width / Full Screen",
  args: {
    width: "full_screen",
    children: children(
      "This dialog takes up 100% of the viewport width. It is useful for full-screen content or forms.",
    ),
  },
};
