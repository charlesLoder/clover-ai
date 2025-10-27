/**
 * Simple scoped logger with global log level control.
 * Levels: silent < error < warn < info < debug
 */
export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

const order: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

let current: LogLevel = "info";

export function set_log_level(level: LogLevel) {
  if (order[level] == null) return;
  current = level;
}

export function get_log_level(): LogLevel {
  return current;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (...args: any[]) => void;
export interface Logger {
  debug: Fn;
  info: Fn;
  warn: Fn;
  error: Fn;
  scope: string;
}

function make(method: "debug" | "info" | "warn" | "error", scope: string): Fn {
  const needed: Record<typeof method, LogLevel> = {
    debug: "debug",
    info: "info",
    warn: "warn",
    error: "error",
  } as const;
  const min = order[needed[method]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (...args: any[]) => {
    if (order[current] < min) {
      return;
    }

    // eslint-disable-next-line no-console
    console[method](`[${scope}]`, ...args);
  };
}

export function get_logger(scope: string): Logger {
  return {
    scope,
    debug: make("debug", scope),
    info: make("info", scope),
    warn: make("warn", scope),
    error: make("error", scope),
  };
}

export const scoped = get_logger;
