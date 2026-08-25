/**
 * The six signs a scribe's board is played in, as the CHARACTERS they are — in the order the values
 * 1…6 run: an eye, the sun, an ankh, a house, an owl, the feather of truth.
 *
 * Their own module because two things need them and neither may hold them: `glyphs.tsx` exports
 * components and nothing else (fast refresh needs that split), and the skin table imports from it.
 *
 * They are picked for **silhouette** rather than for meaning — a wide eye, a disc, an upright cross, a
 * squat box, a bird, a tall plume. Telling one from another at a sixth of a phone screen IS this
 * board's mechanic, so six seated figures would be authentic and unplayable.
 *
 * And picked for **where the ink sits in the box**, which only a typed sign has to care about. Water
 * and a mouth held the first and fifth places until it was seen on a board: both are flat signs that a
 * font sets on the baseline, so they hung at the foot of their square while the other four stood in the
 * middle of theirs. A row that is not level reads as a row of squares that are not the same.
 *
 * **The game ships the face that draws them** (`scripts/generateFont.ts`), which is what lets a sign be
 * a character here rather than a drawing: one shape for the squares, the pad's keys and every sentence
 * that names one.
 */
export const SIGN_CHARACTERS = ["𓁹", "𓇳", "𓋹", "𓉐", "𓅓", "𓆄"] as const
