import type { CSSProperties } from "react"

// The partial-collection sweep, as a CSS mask: the collected fraction of a full turn is kept
// (clockwise from 12 o'clock), the rest of the content is masked away — a part-collected thing shows
// only the part you have, rather than having a shade painted over it. Complete (or over-complete)
// yields `undefined`, so a finished collectible carries no mask at all.
//
// Its own module, apart from the components that use it, for two reasons: the fast-refresh lint rule
// wants component files to export only components, and jsdom's CSS parser drops `conic-gradient`
// outright — so this value is the only thing about the sweep a test can actually assert.
export const revealMaskStyle = ({
  found,
  required,
}: {
  found: number
  required: number
}): CSSProperties | undefined => {
  if (required <= 0 || found >= required) return undefined
  const kept = Math.max(0, found) / required
  const mask = `conic-gradient(from 0deg, #000 0 ${kept}turn, transparent ${kept}turn 1turn)`
  return { maskImage: mask, WebkitMaskImage: mask }
}
