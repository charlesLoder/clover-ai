import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

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
