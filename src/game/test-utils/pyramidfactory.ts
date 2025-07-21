import type { Pyramid } from "../types"

export const createPyramid = (blocks: (number | "")[]): Pyramid => {
  // get amount of floors based on the number of blocks
  const floorCount = Math.floor((Math.sqrt(8 * blocks.length + 1) - 1) / 2)
  return {
    floorCount: floorCount,
    blocks: blocks.map((value, index) => ({
      id: (index + 1).toString(),
      value: value === "" ? undefined : value,
      isOpen: value === "",
    })),
  }
}
