/**
 * The tomb's formula: a list of things given away, one formula wall per tier from junior up.
 *
 * Each row is one wall and the ghost who fills it. The first treasure tomb of a tier has a wall with one
 * empty slot, and the sign for it is given by the ghost of the tier below, on a revisit, once the player has
 * seen the wall. A gift, not loot: the whole sign at once. Signs are named by id, as every wall names
 * them; the reward that carries one is the hieroglyph mod's to apply.
 */
import type { Wall } from "./walls"

export type FormulaRow = {
  /** The tier whose first treasure tomb stands the wall. */
  wall: string
  /** The scene of the ghost who gives the sign. */
  giver: string
  /** The sign given, by catalogue id. */
  sign: string
}

export const FORMULA: readonly FormulaRow[] = [
  { wall: "junior", giver: "tomb.starter", sign: "o1" },
  { wall: "expert", giver: "tomb.junior", sign: "o2" },
  { wall: "master", giver: "tomb.expert", sign: "o3" },
  { wall: "wizard", giver: "tomb.master", sign: "o4" },
]

/** Played at the wall each time it is opened without its sign: Fez, naming who to go back to. Heard once, the wall has been seen. */
export const formulaHint = (row: FormulaRow): string => `formula.${row.wall}.hint`

/** The giver's scene of handing the sign over. */
export const formulaGift = (row: FormulaRow): string => `formula.${row.wall}.gift`

/** What the gift puts in the player's hands: the sign, whole — its one and only piece. */
export const giftReward = (row: FormulaRow) =>
  ({ type: "hieroglyphFragment", hieroglyphId: row.sign, pieceIndex: 0 }) as const

/**
 * The wall of row `i`, on the second floor of its tier's first treasure tomb: the signs given so far, in the
 * order they were given, then the empty slot for this row's. Each wall is a different length, and none of
 * them ever changes; the wizard wall is the first to carry the whole line.
 */
export const formulaWall = (i: number): Wall => {
  const row = FORMULA[i]
  return {
    at: { levelNr: 2, floor: 1 },
    cut: [...FORMULA.slice(0, i).map(given => given.sign), ""],
    wrongAt: i,
    answer: row.sign,
    missing: true,
    copy: "story.formula",
    hint: formulaHint(row),
    after: `reading.${row.wall}`,
    // The lying stela's one register holds four signs, so a shorter wall fills only the start of it. The
    // rectangle is a share of the trimmed painting: re-measure it if a repaint moves the register.
    panel: {
      art: "formulaPanel",
      aspect: 1024 / 393,
      signs: { x: 0.04, y: 0.36, width: (0.9 * (i + 1)) / FORMULA.length, height: 0.27 },
      flow: "row",
    },
  }
}
