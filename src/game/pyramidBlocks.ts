/**
 * WHERE A CROSS-SUM BOARD'S BLOCKS SIT, as index arithmetic over the single flat `Pyramid["blocks"]`
 * list: floor f holds f + 1 blocks, so floor starts run 0, 1, 3, 6, 10.
 *
 * It lives in the domain because generation reads it (`generateLevel`), and generation runs headless in
 * `yarn generate-world` — the same reason `mark.ts` sits here rather than beside the drawings that wear
 * it. The board that renders it asks the same two questions of the same two functions.
 */
export const createFloorStartIndices = (floorCount: number): number[] => {
  const indices: number[] = []
  let index = 0
  for (let i = 1; i <= floorCount; i++) {
    indices.push(index)
    index += i
  }
  return indices
}

/** Which floor a flat block index falls on, and how far along that floor it sits. An index past the
 * last floor answers with the top block, so a caller never indexes off the board. */
export const getFloorAndIndex = (blockIndex: number, startFloorIndices: number[]) => {
  for (let floor = 0; floor < startFloorIndices.length; floor++) {
    const start = startFloorIndices[floor]
    const end = start + floor + 1
    if (blockIndex >= start && blockIndex < end) {
      return { floor, index: blockIndex - start }
    }
  }
  return { floor: 0, index: 0 }
}
