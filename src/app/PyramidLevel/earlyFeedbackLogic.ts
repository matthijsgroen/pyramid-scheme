import type { Pyramid } from "@/game/types"
import { getBlockChildIndices } from "@/game/state"
import { generateNewSeed, mulberry32, shuffle } from "@/game/random"

export const computeEarlyFeedbackBlockIds = (
  pyramid: Pyramid,
  randomSeed: number,
  levelNr: number,
  earlyFeedbackCount: number
): string[] => {
  if (earlyFeedbackCount === 0) return []

  // Build parent map: childId → parentId
  const parentOf: Record<string, string> = {}
  for (const block of pyramid.blocks) {
    for (const childIndex of getBlockChildIndices(pyramid, block.id)) {
      parentOf[pyramid.blocks[childIndex].id] = block.id
    }
  }

  // Seed known values from all closed blocks with a value
  const knownValues: Record<string, number> = {}
  for (const block of pyramid.blocks) {
    if (!block.isOpen && block.value !== undefined) {
      knownValues[block.id] = block.value
    }
  }

  const openBlocks = pyramid.blocks.filter(b => b.isOpen)
  const depth: Record<string, number> = {}
  let solved = 0

  // Wave propagation: each wave discovers newly reachable open blocks
  let changed = true
  while (changed) {
    changed = false
    const wave: string[] = []

    for (const block of openBlocks) {
      if (block.id in depth) continue

      const childIndices = getBlockChildIndices(pyramid, block.id)
      const childIds = childIndices.map(i => pyramid.blocks[i].id)

      // Rule 1: both children known → sum
      if (childIds.length === 2 && childIds.every(id => id in knownValues)) {
        wave.push(block.id)
        continue
      }

      // Rule 2: parent and sibling known → subtraction
      const pid = parentOf[block.id]
      if (pid !== undefined && pid in knownValues) {
        const parentChildIndices = getBlockChildIndices(pyramid, pid)
        const siblingIndex = parentChildIndices.find(i => pyramid.blocks[i].id !== block.id)
        if (siblingIndex !== undefined && pyramid.blocks[siblingIndex].id in knownValues) {
          wave.push(block.id)
          continue
        }
      }
    }

    if (wave.length > 0) {
      changed = true
      for (const blockId of wave) {
        depth[blockId] = solved

        // Compute and store this block's value so subsequent waves can use it
        const childIndices = getBlockChildIndices(pyramid, blockId)
        const childIds = childIndices.map(i => pyramid.blocks[i].id)

        if (childIds.length === 2 && childIds.every(id => id in knownValues)) {
          knownValues[blockId] = knownValues[childIds[0]] + knownValues[childIds[1]]
        } else {
          const pid = parentOf[blockId]
          const parentChildIndices = getBlockChildIndices(pyramid, pid)
          const siblingIndex = parentChildIndices.find(i => pyramid.blocks[i].id !== blockId)!
          knownValues[blockId] = knownValues[pid] - knownValues[pyramid.blocks[siblingIndex].id]
        }
      }
      solved += wave.length
    }
  }

  // Pick one block per threshold using a single seeded RNG sequence
  const random = mulberry32(generateNewSeed(randomSeed, levelNr + 4000))
  const picks: string[] = []

  for (let i = 0; i < earlyFeedbackCount; i++) {
    const threshold = (i + 1) * 4
    const candidates = openBlocks
      .map(b => b.id)
      .filter(id => id in depth && depth[id] >= threshold && !picks.includes(id))
      .sort() // stable order before shuffle so result is seed-determined

    if (candidates.length === 0) continue
    picks.push(shuffle(candidates, random)[0])
  }

  return picks
}
