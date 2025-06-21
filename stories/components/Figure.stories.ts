import type { Meta, StoryObj } from "@storybook/react-vite";
import { Figure } from "../../src/components/Figure";
// @ts-expect-error: image is a static asset
import image from "../assets/PIA00123~small.jpg";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "components/Figure",
  component: Figure,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // Default args for the component
  args: {
    src: image,
    alt: "Sample image",
  },
} satisfies Meta<typeof Figure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: image,
    alt: "Default figure",
  },
};

export const WithCaption: Story = {
  args: {
    alt: "Figure with caption",
    figcaption: "This is a sample caption for the figure",
  },
};

export const WithLongCaption: Story = {
  args: {
    alt: "Figure with long caption",
    figcaption:
      "This is a much longer caption that demonstrates how the figure component handles multi-line text, never growing larger than the image itself.",
  },
};

// Object Fit variations
export const ObjectFitCover: Story = {
  name: "Object Fit / Cover (Default)",
  args: {
    alt: "Cover object fit",
    imgObjectFit: "cover",
    figcaption: "Object fit: cover",
  },
};

export const ObjectFitContain: Story = {
  name: "Object Fit / Contain",
  args: {
    alt: "Contain object fit",
    imgObjectFit: "contain",
    figcaption: "Object fit: contain",
  },
};

export const ObjectFitFill: Story = {
  name: "Object Fit / Fill",
  args: {
    alt: "Fill object fit",
    imgObjectFit: "fill",
    figcaption: "Object fit: fill",
  },
};

export const ObjectFitNone: Story = {
  name: "Object Fit / None",
  args: {
    alt: "None object fit",
    imgObjectFit: "none",
    figcaption: "Object fit: none",
  },
};

export const ObjectFitScaleDown: Story = {
  name: "Object Fit / Scale Down",
  args: {
    alt: "Scale down object fit",
    imgObjectFit: "scale-down",
    figcaption: "Object fit: scale-down",
  },
};

// Size variations
export const DefaultSize: Story = {
  name: "Size / Default (200x200)",
  args: {
    alt: "Default figure",
    width: 200,
    height: 200,
    figcaption: "Default (200x200)",
  },
};

export const Large: Story = {
  name: "Size / Custom",
  args: {
    alt: "Custom figure",
    width: 400,
    height: 400,
    figcaption: "Custom(400x400)",
  },
};

// Aspect ratio variations
export const Square: Story = {
  name: "Aspect Ratio / Square",
  args: {
    alt: "default figure",
    width: 200,
    height: 200,
    figcaption: "Square (1:1)",
  },
};

export const Landscape: Story = {
  name: "Aspect Ratio / Landscape",
  args: {
    alt: "Landscape figure",
    width: 300,
    height: 200,
    figcaption: "Landscape (3:2)",
  },
};

export const Portrait: Story = {
  name: "Aspect Ratio / Portrait",
  args: {
    alt: "Portrait figure",
    width: 200,
    height: 300,
    figcaption: "Portrait (2:3)",
  },
};

// Edge cases
export const NoImage: Story = {
  name: "Edge Cases / No Image Source",
  args: {
    src: "",
    alt: "No image",
    figcaption: "Figure without image source",
  },
};
