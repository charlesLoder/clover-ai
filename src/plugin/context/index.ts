// using a barrel file helps tsc-alias resolve the path correctly
import type { PluginContextActions } from "./plugin-context";
import { PluginContextProvider, usePlugin } from "./plugin-context";

export { PluginContextProvider, usePlugin };
export type { PluginContextActions };
