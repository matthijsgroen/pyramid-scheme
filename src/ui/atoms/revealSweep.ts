// The partial-collection wedge as a CSS value: the found fraction of a full turn is transparent
// (revealed), sweeping clockwise from 12 o'clock; the remainder is masked.
//
// Its own module, apart from the RevealMask component that renders it, for two reasons: the
// fast-refresh lint rule wants component files to export only components, and jsdom's CSS parser
// drops `conic-gradient` outright — so this string is the only thing about the sweep a test can
// actually assert.
export const revealSweep = ({ found, required }: { found: number; required: number }): string => {
  const revealed = Math.max(0, found) / required
  return `conic-gradient(from 0deg, transparent 0 ${revealed}turn, rgba(0,0,0,0.72) ${revealed}turn 1turn)`
}
