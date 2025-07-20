import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});

HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();
