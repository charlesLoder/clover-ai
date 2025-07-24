import * as context from "@context";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatInput } from "./index";

vi.mock("@components", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const original = (await importOriginal()) as Record<string, any>;
  return {
    ...original,
    Textarea: ({
      onChange,
      children,
      error,
    }: {
      children: React.ReactNode;
      onChange: (value: string) => void;
      error?: string;
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
          {error && <div>{error}</div>}
          {children}
        </div>
      );
    },
  };
});

describe("ChatInput", () => {
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("shows an error on empty submission and clears it on valid input", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    const provider = {
      send_messages: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(context, "usePlugin").mockImplementation(() => ({
      dispatch,
      state: {
        selectedMedia: [],
        messages: [],
        provider,
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any,
    }));

    render(<ChatInput />);

    const submitButton = screen.getByLabelText("Submit question");
    const textarea = screen.getByRole("textbox");

    // 1. Submit with empty input
    await user.click(submitButton);

    // 2. Check for error message
    let errorMessage = await screen.findByText("Please enter a message.");
    expect(errorMessage).toBeInTheDocument();

    // 3. Type only whitespace
    await user.clear(textarea);
    await user.type(textarea, "   ");
    errorMessage = await screen.findByText("Please enter a message.");
    expect(errorMessage).toBeInTheDocument();

    // 4. Type valid input
    await user.clear(textarea);
    await user.type(textarea, "hello");

    // 5. Error message should disappear
    expect(screen.queryByText("Please enter a message.")).not.toBeInTheDocument();
  });
});
