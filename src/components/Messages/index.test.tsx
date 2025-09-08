import "@testing-library/jest-dom/vitest";
import { cleanup, configure, render, screen } from "@testing-library/react";
import type { Message as IMessage } from "@types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessagesContainer } from "./index";
import style from "./style.module.css";

describe("MessagesContainer", () => {
  configure({ testIdAttribute: "data-type" });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  const messages: IMessage[] = [
    { role: "user", content: [{ type: "text", content: "Hello" }], context: { canvas: {} as any } },
    { role: "assistant", type: "response", content: { type: "text", content: "Hi there!" } },
  ];

  it("does not crash with empty messages array", () => {
    expect(() =>
      render(<MessagesContainer conversationState="idle" messages={[]} />),
    ).not.toThrow();
  });

  it("renders an empty filler when messages are empty", () => {
    const { container } = render(<MessagesContainer conversationState="idle" messages={[]} />);
    const filler = container.querySelector('[data-role="filler"]') as HTMLElement;
    expect(filler).toBeInTheDocument();

    expect(filler.style.height).toBe("calc(0px - (var(--gap) * 1))");
  });

  it("renders messages", () => {
    render(<MessagesContainer conversationState="idle" messages={messages} />);

    const renderedMessages = screen.getAllByTestId("message", {});
    expect(renderedMessages).toHaveLength(2);
    expect(renderedMessages[0]).toHaveTextContent("Hello");
    expect(renderedMessages[1]).toHaveTextContent("Hi there!");
  });

  it("updates filler height when a new user message is added", () => {
    const initialMessages: IMessage[] = [
      {
        role: "user",
        content: [{ type: "text", content: "Hello" }],
        context: { canvas: {} as any },
      },
      { role: "assistant", type: "response", content: { type: "text", content: "Hi there!" } },
    ];

    // Mock clientHeight with realistic values
    const getter = vi.spyOn(HTMLElement.prototype, "clientHeight", "get");
    getter.mockImplementation(function (this: HTMLElement) {
      // mock container height
      if (this.classList && this.classList.contains(style.messagesContainer)) {
        return 500;
      }

      // mock message height
      if (this.getAttribute && this.getAttribute("data-type") === "message") {
        return 80;
      }

      // mock other elements height
      return 50;
    });

    const { container, rerender } = render(
      <MessagesContainer conversationState="idle" messages={initialMessages} />,
    );

    // Add a new user message
    const updatedMessages: IMessage[] = [
      ...initialMessages,
      {
        role: "user",
        content: [{ type: "text", content: "How are you?" }],
        context: { canvas: {} as any },
      },
    ];

    rerender(<MessagesContainer conversationState="idle" messages={updatedMessages} />);

    const filler = container.querySelector('[data-role="filler"]') as HTMLElement;
    expect(filler).toBeInTheDocument();

    // The filler height should be calculated based on container height (500) - message height (80) = 420
    expect(filler.style.height).toBe("calc(420px - (var(--gap) * 1))");
    getter.mockRestore();
  });

  it("updates filler height when a new assistant message is added", () => {
    const initialMessages: IMessage[] = [
      {
        role: "user",
        content: [{ type: "text", content: "Hello" }],
        context: { canvas: {} as any },
      },
      { role: "assistant", type: "response", content: { type: "text", content: "Hi there!" } },
      {
        role: "user",
        content: [{ type: "text", content: "How are you?" }],
        context: { canvas: {} as any },
      },
    ];

    // Mock clientHeight with realistic values
    const getter = vi.spyOn(HTMLElement.prototype, "clientHeight", "get");
    getter.mockImplementation(function (this: HTMLElement) {
      // mock container height
      if (this.classList && this.classList.contains(style.messagesContainer)) {
        return 500;
      }

      // mock message height
      if (this.getAttribute && this.getAttribute("data-type") === "message") {
        return 80;
      }

      // mock other elements height
      return 50;
    });

    const { container, rerender } = render(
      <MessagesContainer conversationState="idle" messages={initialMessages} />,
    );

    // Add a new assistant message
    const updatedMessages: IMessage[] = [
      ...initialMessages,
      {
        role: "assistant",
        type: "response",
        content: { type: "text", content: "I'm doing well, thanks!" },
      },
    ];

    rerender(<MessagesContainer conversationState="idle" messages={updatedMessages} />);

    const filler = container.querySelector('[data-role="filler"]') as HTMLElement;
    expect(filler).toBeInTheDocument();

    // The filler height should be calculated based on container height (500) - current message height (80) - previous message height (80) = 340
    expect(filler.style.height).toBe("calc(340px - (var(--gap) * 2))");
    getter.mockRestore();
  });
});
