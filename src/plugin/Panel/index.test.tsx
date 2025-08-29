import type { Plugin as CloverIIIF } from "@samvera/clover-iiif";
import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Message } from "@types";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { BaseProvider } from "../base_provider";
import { PluginPanel as Panel } from "./index";

vi.mock("@components", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const original = (await importOriginal()) as Record<string, any>;
  return {
    ...original,
    Textarea: ({
      onChange,
      children,
    }: {
      children: React.ReactNode;
      onChange: (value: string) => void;
    }) => {
      const [value, setValue] = React.useState("");
      return (
        <div>
          <input
            aria-label="What would you like to know?"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onChange(e.target.value);
            }}
          />
          {children}
        </div>
      );
    },
  };
});

const mockClover = {
  useViewerState: () => ({
    vault: {
      get: vi.fn((query) => {
        if (query.type === "Manifest")
          return {
            id: "manifest-1",
            type: "Manifest",
            label: { en: ["Test Manifest"] },
          };
        if (query.type === "Canvas")
          return {
            id: "canvas-1",
            type: "Canvas",
            label: { en: ["Test Canvas"] },
            thumbnail: [
              {
                id: "thumbnail-1",
                type: "Image",
                format: "image/jpeg",
              },
            ],
          };
        if (query.type === "ContentResource")
          return {
            id: "thumbnail-1",
            type: "Image",
            format: "image/jpeg",
          };
        return null;
      }),
    },
    activeManifest: "manifest-1",
    activeCanvas: "canvas-1",
  }),
} as unknown as CloverIIIF;

class MockProvider extends BaseProvider {
  constructor(status: "initializing" | "ready" = "initializing") {
    super();
    this.status = status;
  }

  async generate_response(messages: Message[], _conversationHistory: Message[]): Promise<void> {
    const response: Message = {
      role: "assistant",
      mode: "text",
      content: {
        type: "text",
        content: `You asked: "${messages.find((m) => m.role === "user")?.content.find((c) => c.type === "text")?.content}"`,
      },
    };
    this.add_messages([response]);
  }

  SetupComponent = () => <div>Setup UI</div>;
}

describe("Plugin > Panel", () => {
  it("should render an error if no provider is in state", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render(<Panel {...mockClover} provider={undefined as any} />);
    expect(screen.getByText("Error: No provider instantiated.")).toBeInTheDocument();
  });

  it("should render the setup UI when the provider is initializing", () => {
    const mockProvider = new MockProvider("initializing");
    render(<Panel {...mockClover} provider={mockProvider} />);
    expect(screen.getByText("Setup UI")).toBeInTheDocument();
  });

  it("should render the chat interface when the provider is ready", () => {
    const mockProvider = new MockProvider("ready");
    render(<Panel {...mockClover} provider={mockProvider} />);

    expect(screen.getByRole("heading", { name: /Chat about Test Manifest/i })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "What would you like to know?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit question" })).toBeInTheDocument();
  });

  it("should allow user to ask a question and receive a response", async () => {
    const user = userEvent.setup();
    const mockProvider = new MockProvider("ready");
    render(<Panel {...mockClover} provider={mockProvider} />);

    const textbox = screen.getByRole("textbox", {
      name: "What would you like to know?",
    });
    await user.type(textbox, "What is the name of this work?");
    await user.click(screen.getByRole("button", { name: "Submit question" }));

    await waitFor(() => {
      expect(screen.getByText("What is the name of this work?")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('You asked: "What is the name of this work?"')).toBeInTheDocument();
    });
  });

  describe("Media selection", () => {
    it("should add/remove media to the chat input", async () => {
      const user = userEvent.setup();
      const mockProvider = new MockProvider("ready");
      const { container } = render(<Panel {...mockClover} provider={mockProvider} />);

      // 1. Open the media dialog
      const addMediaButton = screen.getByRole("button", { name: "Add media" });
      await user.click(addMediaButton);

      // 2. Dialog is open
      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Add media" })).toBeInTheDocument();

      // 3. Select an image
      const imageSelect = await screen.findByRole("button", {
        name: /Thumbnail/,
      });
      await user.click(imageSelect);

      // 4. Close the dialog
      const closeButton = screen.getByRole("button", { name: "Close dialog" });
      await user.click(closeButton);

      // 5. Check for preview in ChatInput
      const chatInputForm = container.querySelector("form");
      expect(chatInputForm).not.toBeNull();

      const selectedMediaPreview = within(chatInputForm!).getByRole("figure");
      expect(selectedMediaPreview).toBeInTheDocument();

      const image = within(selectedMediaPreview).getByRole("img");
      expect(image).toHaveAttribute("src", "thumbnail-1");

      // 6. Remove the media
      const removeButton = within(chatInputForm!).getByRole("button", {
        name: "Remove media",
      });
      await user.click(removeButton);

      expect(within(chatInputForm!).queryByRole("figure")).not.toBeInTheDocument();
    });
  });
});
