export type PadButton = "a" | "b" | "x" | "y" | "lb" | "rb" | "dpad" | "start" | "select"

/** One key or pad button, as drawn in a prompt or a controls line. */
export type Glyph = { kind: "key"; label: string } | { kind: "arrows" } | { kind: "pad"; button: PadButton }

export const key = (label: string): Glyph => ({ kind: "key", label })
export const arrows: Glyph = { kind: "arrows" }
export const pad = (button: PadButton): Glyph => ({ kind: "pad", button })
