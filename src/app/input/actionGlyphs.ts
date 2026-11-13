import { key, pad, type Glyph } from "@/ui/atoms/glyphs"

/** The key and the pad button of the actions every screen shares, as `keyMap.ts` and `gamepadSource.ts` bind them. */
export const ACTION_GLYPHS = {
  confirm: { keys: key("Enter"), pad: pad("a") },
  back: { keys: key("Esc"), pad: pad("b") },
  undo: { keys: key("Z"), pad: pad("x") },
  hint: { keys: key("H"), pad: pad("select") },
} as const satisfies Record<string, { keys: Glyph; pad: Glyph }>

export type SharedAction = keyof typeof ACTION_GLYPHS
