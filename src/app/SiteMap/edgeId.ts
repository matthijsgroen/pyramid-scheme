// A cell's grid coordinate, as "floorIdx:row,col". Backward compat: no colon prefix = floor 0.
//
// This is where a cell WAS in one particular carve, which is not what a save remembers it by — see
// cellIdentity.ts for the identity that survives a re-carve. Coordinates stay for the things that
// are only ever about the here and now: a click, an open room, the archive the re-keying reads.
export const encodeEdge = (floor: number, row: number, col: number): string => `${floor}:${row},${col}`

export const decodeEdge = (edgeId: string): [floor: number, row: number, col: number] => {
  if (edgeId.includes(":")) {
    const [f, pos] = edgeId.split(":")
    const [r, c] = pos.split(",").map(Number)
    return [Number(f), r, c]
  }
  const [r, c] = edgeId.split(",").map(Number)
  return [0, r, c]
}
