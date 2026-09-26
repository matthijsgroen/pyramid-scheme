/**
 * Reading a board back out of a stored fixture.
 *
 * **JSON HAS NO `undefined`, AND A BOARD IS FULL OF IT.** An empty square is `undefined` in a givens
 * array, and `JSON.stringify` writes that as `null` — so a fixture loaded raw hands the game a board
 * whose blanks are all filled with a value that is not a value. Sudoku loses 1398 of them and eclipse
 * 1774; lightbeam and constellation have none, which is the only reason the first fixture worked.
 *
 * It is worse than a wrong board, because it is INVISIBLE TO THE OBVIOUS CHECK: `JSON.stringify` maps
 * `undefined` and `null` onto the same text, so comparing a fresh board with a stored one through JSON
 * says they match. A freshness check has to compare the revived value against the generator's own output
 * with `toStrictEqual`, which is what the `.verify.ts` files do.
 *
 * Reviving every `null` is exact here because no board in any family contains a real one — counted, not
 * assumed. Should one ever want a genuine `null`, this is where it breaks, and the verify check is what
 * reports it.
 */
export const reviveBoards = <T>(value: unknown): T => {
  if (value === null) return undefined as T
  if (Array.isArray(value)) return value.map(entry => reviveBoards(entry)) as T
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, reviveBoards(entry)])) as T
  return value as T
}
