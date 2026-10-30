import type { FC } from "react"
import { Mummy, Sarcophagus } from "./glyphs"

/**
 * What the mummy rest board looks like.
 *
 * The family emits logical state only: a square is empty, ruled out by the player or holds a piece, an anchor
 * is printed, a line is open, met or broken. The skin decides the pixels (`docs/instructions/puzzle-screens.md`). One skin, a pyramid burial room in the same sandstone as the scarab board.
 */
export type PairSkin = {
  /** Which place this is, as its own name: the goal, the rules and every hint sentence are keyed on it. */
  name: string
  /** A square the player may still use, and one a placed piece already rules out. */
  cell: string
  spent: string
  /** The border every square draws on all four edges, as a CSS colour. */
  seam: string
  /** The square a sarcophagus is printed on, with the sarcophagus colour: printed floor, so a darker tile and a muted tone, never as strong as a placed piece. */
  anchor: string
  Anchor: FC
  /** What a piece looks like standing in a square, and its colour. */
  Glyph: FC
  answer: string
  /** The player's own "not here" mark, deliberately slight. */
  dark: string
  /** The hint's hatch, as the stripe colour of a repeating gradient. */
  hatch: string
  evidence: string
  focus: string
  conflict: string
  /** What a piece does for its turn in the completion run. */
  celebrate: string
  /** What an anchor does as its piece arrives in that run. */
  anchorCelebrate: string
  /** The count beside a line while it still owes pieces, once it holds exactly its count, and once it cannot be met. */
  countOpen: string
  countMet: string
  countBroken: string
}

export const PAIR_SKINS: Record<string, PairSkin> = {
  default: {
    name: "mummies",
    cell: "bg-[#e6cf9d]",
    spent: "bg-[#d2b87c]",
    seam: "rgb(120 90 40 / 0.4)",
    anchor:
      "bg-[#b89b60] text-amber-950/45 shadow-[inset_2px_2px_0_rgba(255,255,255,0.25),inset_-2px_-2px_0_rgba(0,0,0,0.3)]",
    Anchor: Sarcophagus,
    Glyph: Mummy,
    answer: "scale-125 text-stone-950",
    dark: "text-stone-700/70",
    hatch: "rgba(120,53,15,0.4)",
    evidence: "ring-sky-800/70",
    focus: "ring-emerald-950",
    conflict: "ring-red-800",
    // Each mummy walks into its sarcophagus and is gone; the sarcophagus catches the light as it arrives.
    // Raised above the squares so the walk is drawn over the neighbouring one.
    celebrate: "animate-into-tomb relative z-10",
    anchorCelebrate: "animate-flare [animation-delay:450ms]",
    countOpen: "text-stone-200",
    countMet: "text-emerald-400",
    countBroken: "text-red-400",
  },
}

/** One face for now; resolved through a function so a second one is a table entry. */
export const pairSkinFor = (): PairSkin => PAIR_SKINS.default
