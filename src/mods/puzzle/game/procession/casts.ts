/**
 * The doings a day is made of, six hieroglyphs a place (`docs/game-design/puzzles/procession.md` §8). A row of
 * the board wears one; the names live in the locale files, aligned by index, because a name is language and a
 * sign is not.
 *
 * On the game side because a procession door's tiles wear the same signs as its bars, and the carve is what
 * writes a tile's glyph. Every sign must be a literal in a `.ts` file for `yarn generate-font` to keep it.
 */
export const PROCESSION_CASTS = {
  /**
   * **A day's work**, and the face a room wears when its site asked for nothing in particular: a fire,
   * water carried, bread baked, a boat worked, oxen driven, a watch kept through the night.
   */
  default: ["𓊮", "𓈗", "𓏏", "𓊛", "𓃒", "𓇹"],
  /**
   * **A day cutting a tomb** — the workmen's valley, and the largest pool in the game: the wall plastered,
   * the grid drawn on it, the relief carved, the colour laid in, the gold leaf, the door hung.
   *
   * **Craft rather than rites, and that is a rule of the family and not a squeamishness.** §8 asks a cast to
   * imply no order of its own, because the generator decides what happens when and a set carrying its own
   * story tells a lie on every board whose answer runs the other way. A burial has exactly one order — you
   * cannot seal before you wrap — so those six were the one cast that could not keep the promise. A
   * workshop's day can be arranged any way round and stays true. It also puts a child in the room with the
   * people who MADE the place, which is the better half of the subject.
   */
  funerary: ["𓉐", "𓏞", "𓍋", "𓏊", "𓋞", "𓊃"],
  /**
   * **A night of the sky** — decans and lights crossing it, each visible for its own stretch. This is the
   * face `wizard_4` has been waiting for: the one journey no pool serves (`journeys.md` §9).
   */
  cosmos: ["𓇳", "𓇼", "𓇹", "𓇯", "𓈍", "𓆳"],
  /**
   * **A day on the flood plain**: the water let in, the channel, the basin, the field, the ferrying, the
   * reaping.
   */
  water: ["𓈗", "𓈘", "𓈙", "𓈇", "𓊛", "𓌳"],
  /**
   * **A day at the quay**: goods, bread, beer, the ferry, the hauling, and the tally that says what moved.
   */
  trade: ["𓎟", "𓏏", "𓏊", "𓊛", "𓂻", "𓏛"],
} as const satisfies Record<string, readonly string[]>

export type ProcessionCast = keyof typeof PROCESSION_CASTS

/** A cast's signs as code points, the form a tile's glyph is written in. */
export const castGlyphs = (cast: ProcessionCast): number[] => PROCESSION_CASTS[cast].map(sign => sign.codePointAt(0)!)
