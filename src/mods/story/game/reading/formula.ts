/**
 * The tomb's formula: a list of things given away, one formula wall per tier from junior up.
 *
 * Each row is one wall and the ghost who fills it. The first treasure tomb of a tier has a wall with one
 * empty slot, and the sign for it is given by the ghost of the tier below, on a revisit, once the player has
 * seen the wall. A gift, not loot: the whole sign at once. Signs are named by id, as every wall names
 * them; the reward that carries one is the hieroglyph mod's to apply.
 */
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
