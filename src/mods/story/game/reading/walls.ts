/**
 * A line of signs with one of them not right, and the sign that belongs there.
 *
 * The signs are the hieroglyphs the player collects (`symbolCatalogue`), so a wall is readable
 * exactly to the extent they have been paying attention — and fixable only with a sign they hold.
 * That is the whole gate: no glyph, no repair, and the room says so rather than refusing silently.
 */
import type { Panel } from "./panel"

/** Where a wall stands inside its journey: which site, and which floor of it. */
export type WallPlace = { levelNr: number; floor: number }

export type Wall = {
  /** Where it stands: one wall per reading room, so one per place. */
  at: WallPlace
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
  /**
   * Played when the wall is put right. Once heard, the wall stands put right on every visit after: the
   * save already says so, so nothing else has to.
   */
  after: string
  /**
   * Played each time the wall is opened without the sign that belongs there, for as long as it is missing:
   * who to go back to. The shared copy cannot say it, because it names nobody.
   */
  hint?: string
  /** The wall as painted, and where on it the signs are written. */
  panel: Panel
}

/**
 * Henut's wall, in the junior tomb.
 *
 * Her name inside a cartouche, and the second sign inside it is a goose where Hathor belongs: the lady of
 * beauty, of mirrors and of kohl, whose name a vain noblewoman would carry in her own. Hathor is
 * the junior sign the tableaus on this same floor ask for before her room, so a player who reaches
 * the wall holds it. She is not wrong to be annoyed: it is not her name until it is fixed.
 *
 * The Sphinx. The wall stands inside it, down the ward stair of `starter_1`.
 *
 * The writing from the first minute of the game. A cartouche, the Horus falcon, and a slot the sand
 * took — so what the player can read, after fifty hours of collecting gods, is a god's name. The
 * sign that finishes it is the reed leaf, which is not a god or an animal or a jar but a sound, and
 * adding it turns Horus into Hori: a man named after the god, one of thousands.
 */
export const WALLS: Readonly<Record<string, readonly Wall[]>> = {
  junior_treasure_tomb: [
    {
      at: { levelNr: 2, floor: 0 },
      cut: ["art5", "a11", "a7", "a12"],
      wrongAt: 2,
      answer: "d15",
      copy: "story.wall",
      after: "tomb.juniorFixed",
      // The inside of the standing cartouche on `namePanel`, short of its rounded ends.
      panel: {
        art: "henutNamePanel",
        aspect: 1024 / 888,
        signs: { x: 0.38, y: 0.13, width: 0.24, height: 0.72 },
        flow: "column",
        frame: 0,
      },
    },
  ],
  starter_1: [
    {
      at: { levelNr: 1, floor: 6 },
      cut: ["art5", "d3", ""],
      wrongAt: 2,
      answer: "s1",
      missing: true,
      copy: "story.sphinx",
      after: "reading.sphinx",
      // No painting yet (repaint queue, `sphinx/namePanel`): a lying cartouche is drawn round the signs.
      panel: {
        aspect: 1.3,
        signs: { x: 0.22, y: 0.28, width: 0.56, height: 0.44 },
        flow: "row",
        frame: 0,
      },
    },
  ],
}

/** The wall standing on this floor of a journey, if one does. */
export const wallFor = (journeyId: string, levelNr: number, floor: number): Wall | undefined =>
  WALLS[journeyId]?.find(wall => wall.at.levelNr === levelNr && wall.at.floor === floor)

/** Whether the wall has been put right on an earlier visit: the scene its repair plays has been heard. */
export const isRepaired = (wall: Wall, heard: Readonly<Record<string, boolean>>): boolean => heard[wall.after] === true

/** Whether the player holds the sign this wall needs. Held keys are `hieroglyph:<id>`. */
export const canRepair = (wall: Wall, held: ReadonlySet<string>): boolean => held.has(`hieroglyph:${wall.answer}`)

/** Which signs of a wall the player can actually read; the rest are shapes, and a gap is neither. */
export const legible = (wall: Wall, held: ReadonlySet<string>): boolean[] =>
  wall.cut.map(id => held.has(`hieroglyph:${id}`))
