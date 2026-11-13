export type PadButton = "a" | "b" | "x" | "y" | "lb" | "rb" | "dpad" | "start" | "select"

/** The pad looks a glyph can wear. A new brand is one more entry here, and its look in `KeyGlyph`. */
export const PAD_BRANDS = ["xbox", "playstation"] as const
/** Which face buttons a pad wears: Xbox letters or PlayStation shapes. */
export type PadBrand = (typeof PAD_BRANDS)[number]

/** One key or pad button, as drawn in a prompt or a controls line. */
export type Glyph = { kind: "key"; label: string } | { kind: "arrows" } | { kind: "pad"; button: PadButton }

export const key = (label: string): Glyph => ({ kind: "key", label })
export const arrows: Glyph = { kind: "arrows" }
export const pad = (button: PadButton): Glyph => ({ kind: "pad", button })
