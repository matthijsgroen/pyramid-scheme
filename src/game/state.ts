import type { Pyramid, PyramidLevel } from "@/game/types"

export const isComplete = (state: PyramidLevel): boolean => {
  const openBlocks = state.pyramid.blocks
    .filter((block) => block.isOpen)
    .map((block) => block.id)
  return openBlocks.every((blockId) =>
    Object.entries(state.values).some(
      ([id, value]) => id === blockId && value !== undefined
    )
  )
}

export const isValid = (state: PyramidLevel): boolean => {
  // check for addition if the value above matches the sum of the values below
  const { pyramid, values } = state
  const expectedValues = getAnswers(pyramid, { ignoreOpen: true })
  if (!expectedValues) return false
  // check if values match expectedValues
  for (const [id, value] of Object.entries(expectedValues)) {
    if (values[id] !== value && pyramid.blocks.find((b) => b.id === id)?.isOpen)
      return false
  }

  return true
}

export const getBlockChildIndices = (
  pyramid: PyramidLevel["pyramid"],
  blockId: string
): number[] => {
  // 1. get the floor number of the block
  const blockIndex = pyramid.blocks.findIndex((b) => b.id === blockId)
  // the pyramid grows in a triangular pattern, so the floor number can be calculated
  // the first block is the top of the pyramid, the second is the first block of the second floor, etc.
  const floorNumber = Math.floor((Math.sqrt(8 * blockIndex + 1) - 1) / 2)
  const indexOnFloor = blockIndex - (floorNumber * (floorNumber + 1)) / 2

  // 2. calculate the 2 child IDs based on the floor number
  // the first child block on next floor with same index, the second child block is the next index
  const children: number[] = []
  const nextFloorStartIndex = ((floorNumber + 1) * (floorNumber + 2)) / 2
  const firstChildIndex = nextFloorStartIndex + indexOnFloor
  const secondChildIndex = firstChildIndex + 1
  if (firstChildIndex < pyramid.blocks.length) {
    children.push(firstChildIndex)
  }
  if (secondChildIndex < pyramid.blocks.length) {
    children.push(secondChildIndex)
  }

  return children
}

export const getAnswers = (
  pyramid: Pyramid,
  { ignoreOpen = false } = {}
): Record<string, number> | undefined => {
  const blockValues: Record<string, number> = {}
  pyramid.blocks.forEach((block) => {
    if (block.value !== undefined) {
      blockValues[block.id] = block.value
    }
  })

  // Find blocks with missing value at themselves or their children
  const answersNeeded = pyramid.blocks.filter(
    (block) => block.value === undefined && (block.isOpen || ignoreOpen)
  )
  if (answersNeeded.length === 0) return undefined

  // Iteratively fill in missing values using the map
  let updated = true
  while (updated) {
    updated = false
    for (const block of pyramid.blocks) {
      const value = blockValues[block.id]
      const childIndices = getBlockChildIndices(pyramid, block.id)
      const childValues = childIndices.map(
        (index) => blockValues[pyramid.blocks[index].id]
      )

      // If block value is missing and children are known
      if (
        value === undefined &&
        childValues.length > 0 &&
        childValues.every((v) => v !== undefined)
      ) {
        const sum = childValues.reduce((sum, v) => sum + (v ?? 0), 0)
        blockValues[block.id] = sum
        updated = true
      }
      // If one child is missing and block value and other child are known
      if (
        value !== undefined &&
        childValues.length > 0 &&
        childValues.filter((v) => v === undefined).length === 1
      ) {
        const missingIdx = childValues.findIndex((v) => v === undefined)
        const knownSum = childValues.reduce(
          (sum: number, v) => sum + (v ?? 0),
          0
        )
        const missingValue = value - knownSum
        const missingBlock = pyramid.blocks[childIndices[missingIdx]]
        blockValues[missingBlock.id] = missingValue
        updated = true
      }
    }
  }

  // Collect answers for blocks that were missing a value
  const answers: Record<string, number> = {}
  answersNeeded.forEach((block) => {
    answers[block.id] = blockValues[block.id]
  })

  return answers.size < answersNeeded.length ? undefined : answers
}

export const getLevelWidth = (floorCount: number): number => {
  // The width of the pyramid is the number of blocks in the last floor
  return (
    (floorCount * (floorCount + 1)) / 2 - (floorCount * (floorCount - 1)) / 2
  )
}
