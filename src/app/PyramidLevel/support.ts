export const createFloorStartIndices = (floorCount: number): number[] => {
  const indices: number[] = []
  let index = 0
  for (let i = 1; i <= floorCount; i++) {
    indices.push(index)
    index += i
  }
  return indices
}
export const getFloorAndIndex = (
  blockIndex: number,
  startFloorIndices: number[]
) => {
  for (let floor = 0; floor < startFloorIndices.length; floor++) {
    const start = startFloorIndices[floor]
    const end = start + floor + 1
    if (blockIndex >= start && blockIndex < end) {
      return { floor, index: blockIndex - start }
    }
  }
  return { floor: 0, index: 0 }
}
