/**
 * A line of signs with one of them not right, and the sign that belongs there.
 *
 * The signs are the hieroglyphs the player collects (`symbolCatalogue`), so a wall is readable
 * exactly to the extent they have been paying attention — and fixable only with a sign they hold.
 * That is the whole gate: no glyph, no repair, and the room says so rather than refusing silently.
 */
export type Wall = {
  /** The signs as cut, left to right — including the one that is not right. */
  cut: string[]
  /** Which of them is not right, 0-based. */
  wrongAt: number
  /** The sign that belongs there. */
  answer: string
  /**
   * The slot is empty rather than miscut, and the player places what they hold instead of choosing
   * from a tray. The two are different questions: a miscut sign asks *which one was right*, so the
   * tray is the answer space; a scoured slot asks *do you have it*, and offering fifty-eight wrong
   * answers beside the one would turn having it into hunting for it.
   */
  missing?: boolean
  /** Prefix for this wall's own copy — `<prefix>.wrong`, `.fixed`, `.pick`, `.cannot`. */
  copy: string
  /** Played when the wall is put right. */
  after: string
}

/**
 * Henut's wall, in the junior tomb.
 *
 * Her name inside a cartouche, and the third sign is a goose where an owl belongs — the confusion
 * an apprentice actually makes, because the bird signs differ by a beak. She is not wrong to be
 * annoyed: it is not her name until it is fixed.
 *
 * The Sphinx, behind `starter_1`'s ward gate.
 *
 * The writing from the first minute of the game. A cartouche, the Horus falcon, and a slot the sand
 * took — so what the player can read, after fifty hours of collecting gods, is a god's name. The
 * sign that finishes it is the reed leaf, which is not a god or an animal or a jar but a sound, and
 * adding it turns Horus into Hori: a man named after the god, one of thousands.
 */
export const WALLS: Record<string, Wall> = {
  junior_treasure_tomb: {
    cut: ["art5", "a11", "a7", "a12"],
    wrongAt: 2,
    answer: "a12",
    copy: "story.wall",
    after: "tomb.juniorFixed",
  },
  starter_1: {
    cut: ["art5", "d3", ""],
    wrongAt: 2,
    answer: "s1",
    missing: true,
    copy: "story.sphinx",
    after: "reading.sphinx",
  },
}

/** The wall standing in a journey, if one does. */
export const wallFor = (journeyId: string): Wall | undefined => WALLS[journeyId]

/** Whether the player holds the sign this wall needs. Held keys are `hieroglyph:<id>`. */
export const canRepair = (wall: Wall, held: ReadonlySet<string>): boolean => held.has(`hieroglyph:${wall.answer}`)

/** Which signs of a wall the player can actually read; the rest are shapes, and a gap is neither. */
export const legible = (wall: Wall, held: ReadonlySet<string>): boolean[] =>
  wall.cut.map(id => held.has(`hieroglyph:${id}`))
