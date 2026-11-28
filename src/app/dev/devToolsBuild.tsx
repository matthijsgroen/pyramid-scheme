import { lazy } from "react"

/**
 * Whether this build carries the developer tools: every dev server and test run, and a build that asks for them
 * with `VITE_DEV_TOOLS=true` (the preview). The release asks for nothing. A compile-time constant, so a release
 * build drops every branch behind it.
 */
export const DEV_TOOLS: boolean = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === "true"

/** `?skipIntro` in the address, in a build with the developer tools: Fez does not greet on the camp, so a check
 * on a fresh profile starts at the camp itself. */
export const SKIP_INTRO: boolean =
  DEV_TOOLS && typeof location !== "undefined" && new URLSearchParams(location.search).has("skipIntro")

// The tools' screens are loaded behind the same constant, in this module, where the bundler folds it before it
// follows the import: a release then emits no chunk for them at all.

/** The playtesting tools in the settings dialog; absent from a build without them. */
export const DevTools = DEV_TOOLS ? lazy(() => import("./DevTools").then(m => ({ default: m.DevTools }))) : undefined

/** The lock and room editors over the whole app; absent from a build without them. */
export const LockEditorHost = DEV_TOOLS
  ? lazy(() => import("./LockEditorHost").then(m => ({ default: m.LockEditorHost })))
  : undefined
