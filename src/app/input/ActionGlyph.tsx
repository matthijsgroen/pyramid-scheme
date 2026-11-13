import type { FC } from "react"
import { KeyGlyph } from "@/ui/atoms/KeyGlyph"
import { ACTION_GLYPHS, type SharedAction } from "./actionGlyphs"
import { useModality } from "./useModality"

/** The button that does `action`, small enough to sit inside a label. Keys and pad only; touch shows nothing. */
export const ActionGlyph: FC<{ action: SharedAction }> = ({ action }) => {
  const { input, brand } = useModality()
  if (input === "touch") return null
  return <KeyGlyph glyph={ACTION_GLYPHS[action][input]} brand={brand} size="sm" />
}
