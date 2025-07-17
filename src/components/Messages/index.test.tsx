import "@testing-library/jest-dom/vitest";
import { cleanup, configure, render, screen } from "@testing-library/react";
import type { Message as IMessage } from "@types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessagesContainer } from "./index";
import style from "./style.module.css";

describe("MessagesContainer", () => {
  const scrollIntoViewMock = window.HTMLElement.prototype.scrollIntoView;
  configure({ testIdAttribute: "data-type" });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  const messages: IMessage[] = [
    { role: "user", content: [{ type: "text", content: "Hello" }] },
    { role: "assistant", content: { type: "text", content: "Hi there!" } },
  ];

  it("does not crash with empty messages array", () => {
    expect(() => render(<MessagesContainer messages={[]} />)).not.toThrow();
  });

  it("renders a filler when messages are empty", () => {
    const { container } = render(<MessagesContainer messages={[]} />);
    const filler = container.querySelector('[data-role="filler"]');
    expect(filler).toBeInTheDocument();
  });

  it("renders messages", () => {
    render(<MessagesContainer messages={messages} />);

    const renderedMessages = screen.getAllByTestId("message", {});
    expect(renderedMessages).toHaveLength(2);
    expect(renderedMessages[0]).toHaveTextContent("Hello");
    expect(renderedMessages[1]).toHaveTextContent("Hi there!");
  });

  it("scrolls to the bottom on initial render", () => {
    render(<MessagesContainer messages={messages} />);
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("calculates filler height for last user message", () => {
    const userLastMessages: IMessage[] = [
      { role: "assistant", content: { type: "text", content: "Hi" } },
      { role: "user", content: [{ type: "text", content: "Hello" }] },
    ];

    const getter = vi.spyOn(HTMLElement.prototype, "clientHeight", "get");
    getter.mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains(style.messagesContainer)) {
        return 500;
      }
      if (this.getAttribute("data-role") === "user") {
        return 100;
      }
      return 50;
    });

    const { container } = render(<MessagesContainer messages={userLastMessages} />);

    const filler = container.querySelector('[data-role="filler"]') as HTMLElement;
    // containerHeight (500) - currentMssgHeight (100) = 400
    expect(filler.style.height).toBe("calc(400px - (var(--gap) * 1))");
    expect(scrollIntoViewMock).toHaveBeenCalled();
    getter.mockRestore();
  });

  it("calculates filler height for last assistant message", () => {
    const assistantLastMessages: IMessage[] = [
      { role: "user", content: [{ type: "text", content: "Hello" }] },
      { role: "assistant", content: { type: "text", content: "Hi" } },
    ];

    const getter = vi.spyOn(HTMLElement.prototype, "clientHeight", "get");
    getter.mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains(style.messagesContainer)) {
        return 500;
      }
      if (this.getAttribute("data-role") === "assistant") {
        return 100;
      }
      if (this.getAttribute("data-role") === "user") {
        return 80;
      }
      return 50;
    });

    const { container } = render(<MessagesContainer messages={assistantLastMessages} />);

    const filler = container.querySelector('[data-role="filler"]') as HTMLElement;
    // containerHeight (500) - currentMssgHeight (100) - previousMssgHeight (80) = 320
    expect(filler.style.height).toBe("calc(320px - (var(--gap) * 2))");
    getter.mockRestore();
  });
});
