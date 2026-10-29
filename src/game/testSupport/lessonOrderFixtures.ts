import type { Direction, FloorGrid, GridCell, MechanismRecord, PrefabRoom } from "../siteTypes"

export const lever: MechanismRecord = {
  states: ["a", "b"],
  initial: "a",
  returnsToInitial: true,
  positions: [{ state: "b", gateKeyId: "G" }],
}
const board: MechanismRecord = {
  states: ["rest", "Y"],
  initial: "rest",
  returnsToInitial: true,
  positions: [{ state: "Y", gateKeyId: "Y" }],
}
const MOVES: [Direction, number, number][] = [
  ["n", -1, 0],
  ["s", 1, 0],
  ["e", 0, 1],
  ["w", 0, -1],
]

/** A made-up floor drawn in characters: `E` the entrance, `-|+x` corridor, `D` a door the lever `L` opens (`mechanism`
 * in its place), `Y` a door the board `B` in its own junction opens, `R` a fork (laid over by `prefabRoom`). Every two
 * drawn cells side by side are joined. */
export const drawnFloor = (
  rows: string[],
  extra: { prefabRoom?: PrefabRoom; mechanism?: MechanismRecord } = {}
): FloorGrid => {
  const width = Math.max(...rows.map(row => row.length))
  const drawn = (r: number, c: number) => (rows[r]?.[c] ?? " ") !== " "
  let entrancePos: [number, number] = [0, 0]
  const cells = rows.map((row, r) =>
    Array.from({ length: width }, (_, c): GridCell => {
      const ch = row[c] ?? " "
      if (ch === " ") return { type: "empty" }
      const dirs = new Set(MOVES.filter(([, dr, dc]) => drawn(r + dr, c + dc)).map(([dir]) => dir))
      if (ch === "E") entrancePos = [r, c]
      const room = { type: "room" as const, roomType: "fork" as const, dirs, state: "fogged" as const }
      if (ch === "D" || ch === "Y") return { ...room, tags: ["gate"], requiredKeyId: ch === "D" ? "G" : "Y" }
      if (ch === "L") return { ...room, mechanism: extra.mechanism ?? lever }
      if (ch === "B") return { ...room, mechanism: board, exits: [{ dir: "e", kind: "side", gateKeyId: "Y" }] }
      if (ch === "R") return { ...room, ...(extra.prefabRoom ? { prefabRoom: extra.prefabRoom } : {}) }
      return { type: "corridor", dirs, state: "fogged" }
    })
  )
  return {
    cells,
    rows: rows.length,
    cols: width,
    entrancePos,
    exitPos: [0, width - 1],
    siteId: "site",
    staircases: {},
  }
}
