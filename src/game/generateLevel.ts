import {
  createFloorStartIndices,
  getFloorAndIndex,
} from "@/app/PyramidLevel/support"
import { getAnswers } from "@/game/state"
import type { Pyramid, PyramidLevel, PyramidLevelSettings } from "@/game/types"

const createBasePyramid = (
  settings: Pick<PyramidLevelSettings, "floorCount" | "lowestFloorNumberRange">,
  random = Math.random
): Pyramid => {
  const { floorCount, lowestFloorNumberRange } = settings

  const totalBlocks = (floorCount * (floorCount + 1)) / 2
  const bottomFloorIndex = ((floorCount - 1) * floorCount) / 2

  const blocks: Pyramid["blocks"] = []
  for (let i = 0; i < totalBlocks; i++) {
    let value: number | undefined = undefined
    if (i >= bottomFloorIndex) {
      // Generate values for the bottom floor blocks
      const min = lowestFloorNumberRange[0]
      const max = lowestFloorNumberRange[1]
      value = Math.floor(random() * (max - min + 1)) + min
    }
    blocks.push({
      id: (i + 1).toString(),
      value,
      isOpen: value !== undefined,
    })
  }
  return {
    floorCount,
    blocks,
  }
}

export const createCompletePyramid = (
  settings: Pick<PyramidLevelSettings, "floorCount" | "lowestFloorNumberRange">,
  random = Math.random
): Pyramid => {
  const pyramid = createBasePyramid(settings, random)
  const values = getAnswers(pyramid, { ignoreOpen: true })

  return {
    ...pyramid,
    blocks: pyramid.blocks.map((block) => {
      const value = values?.[block.id] ?? block.value
      return {
        ...block,
        value,
        isOpen: value === undefined,
      }
    }),
  }
}

const openBlocks = (
  levelNr: number,
  pyramid: Pyramid,
  openCount: number,
  restrictedOpenFloors: number[] = [],
  random = Math.random
): PyramidLevel => {
  const openIndices = new Set<number>()
  const floorStartIndices = createFloorStartIndices(pyramid.floorCount)
  while (openIndices.size < openCount) {
    const index = Math.floor(random() * pyramid.blocks.length)
    const { floor } = getFloorAndIndex(index, floorStartIndices)
    // Skip if the block is already open or if it is in a restricted floor
    if (restrictedOpenFloors.includes(pyramid.floorCount - 1 - floor)) {
      continue
    }
    openIndices.add(index)
  }
  const values: Record<string, number> = pyramid.blocks
    .filter((_block, index) => openIndices.has(index))
    .reduce<Record<string, number>>((acc, block) => {
      acc[block.id] = block.value ?? 0
      return acc
    }, {})

  const updatedPyramid: Pyramid = {
    ...pyramid,
    blocks: pyramid.blocks.map((block, index) => ({
      ...block,
      isOpen: openIndices.has(index),
      value: openIndices.has(index) ? undefined : block.value,
    })),
  }

  return {
    levelNr,
    pyramid: updatedPyramid,
    values,
  }
}

const blockBlocks = (
  pyramidLevel: PyramidLevel,
  blockedCount: number,
  random = Math.random
): PyramidLevel => {
  if (blockedCount === 0) return pyramidLevel
  const blockedIndices = new Set<number>()
  while (blockedIndices.size < blockedCount) {
    const index = Math.floor(random() * pyramidLevel.pyramid.blocks.length)
    if (pyramidLevel.pyramid.blocks[index].isOpen) {
      continue // Skip if the block is already open
    }
    blockedIndices.add(index)
  }

  return {
    ...pyramidLevel,
    pyramid: {
      ...pyramidLevel.pyramid,
      blocks: pyramidLevel.pyramid.blocks.map((block, index) => ({
        ...block,
        isOpen: blockedIndices.has(index) ? false : block.isOpen,
        value: blockedIndices.has(index) ? undefined : block.value,
      })),
    },
  }
}

export const generateLevel = (
  levelNr: number,
  settings: PyramidLevelSettings,
  random = Math.random
): PyramidLevel => {
  const { openBlockCount, blockedBlockCount } = settings
  const fullPyramid = createCompletePyramid(settings, random)
  if (openBlockCount === 0) {
    return {
      levelNr,
      pyramid: fullPyramid,
      values: {},
    }
  }
  let tryCount = 0
  while (tryCount < 50) {
    const pyramidLevel = blockBlocks(
      openBlocks(
        levelNr,
        fullPyramid,
        openBlockCount,
        settings.restrictedOpenFloors,
        random
      ),
      blockedBlockCount,
      random
    )

    const answers = getAnswers(pyramidLevel.pyramid)
    if (answers) {
      // check if it are the same answers as the values
      const valuesMatch = Object.keys(answers).every(
        (key) => answers[key] === pyramidLevel.values[key]
      )
      if (valuesMatch) {
        return pyramidLevel
      }
    }
    tryCount++
  }

  throw new Error(
    `Unsolvable pyramid, tried ${tryCount} times. Settings: ${JSON.stringify(settings)}`
  )
}
