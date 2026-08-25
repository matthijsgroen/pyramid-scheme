/**
 * The six signs a scribe's board is played in, as the CHARACTERS they are — in the order the values
 * 1…6 run: water, the sun, an ankh, a house, a mouth, the feather of truth.
 *
 * Their own module because two things need them and neither may hold them: `glyphs.tsx` exports
 * components and nothing else (fast refresh needs that split), and the skin table imports from it.
 *
 * They are picked for **silhouette** rather than for meaning — a flat zigzag, a disc, an upright cross,
 * a squat box, a flat lens, a tall plume. Telling one from another at a sixth of a phone screen IS this
 * board's mechanic, so six seated figures would be authentic and unplayable.
 *
 * **The game ships the face that draws them** (`scripts/generateFont.ts`), which is what lets a sign be
 * a character here rather than a drawing: one shape for the squares, the pad's keys and every sentence
 * that names one.
 */
export const SIGN_CHARACTERS = ["𓈖", "𓇳", "𓋹", "𓉐", "𓂋", "𓆄"] as const
