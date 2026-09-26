/**
 * A line of signs with one of them wrong, and the sign that belongs there.
 *
 * The signs are the hieroglyphs the player collects (`symbolCatalogue`), so a wall is readable
 * exactly to the extent they have been paying attention — and fixable only with a sign they hold.
 * That is the whole gate: no glyph, no repair, and the room says so rather than refusing silently.
 */
export type Wall = {
  /** The signs as cut, left to right — including the wrong one. */
  cut: string[]
  /** Which of them is wrong, 0-based. */
  wrongAt: number
  /** The sign that belongs there. */
  answer: string
  /** Played when the wall is put right. */
  after: string
}

/**
 * Henut's wall, in the junior tomb.
 *
 * Her name inside a cartouche, and the third sign is a goose where an owl belongs — the confusion
 * an apprentice actually makes, because the bird signs differ by a beak. She is not wrong to be
 * annoyed: it is not her name until it is fixed.
 */
export const WALLS: Record<string, Wall> = {
  junior_treasure_tomb: {
    cut: ["art5", "a11", "a7", "a12"],
    wrongAt: 2,
    answer: "a12",
    after: "tomb.juniorFixed",
  },
}

/** The wall standing in a journey, if one does. */
export const wallFor = (journeyId: string): Wall | undefined => WALLS[journeyId]

/** Whether the player holds the sign this wall needs. Held keys are `hieroglyph:<id>`. */
export const canRepair = (wall: Wall, held: ReadonlySet<string>): boolean => held.has(`hieroglyph:${wall.answer}`)

/** Which signs of a wall the player can actually read; the rest are shapes. */
export const legible = (wall: Wall, held: ReadonlySet<string>): boolean[] =>
  wall.cut.map(id => held.has(`hieroglyph:${id}`))
