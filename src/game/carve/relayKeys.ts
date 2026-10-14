import { shuffle } from "../random"
import type { KeyColor, SideSection } from "../siteTypes"
import { nid } from "./ids"
import { doorsShutting } from "./sections"
import { pass } from "./state"
import type { Cell, Chain, SectionGroup } from "./state"

// Where the chains of a laid lock count from, so no index of theirs is one of an authored section.
const LAID_CHAIN_IDX = 10000

/**
 * THE KEY CHAIN, and every carved path off the main walk as a chain. Only FREE (no endReward) treasure-end
 * gated sections can safely relay the next key onward — one that already carries its own authored reward
 * must be a chain LEAF (receives a key, never grants one), the same "never overwrite an authored reward"
 * rule the ungated key host keeps. Staircase-end sections are always leaves too (terminal, no relay). The
 * first gated section's key goes to the ungated section's end; each later one's to the MOST RECENT free
 * section's end room, which may end up granting several different leaves' keys at once (not necessarily its
 * own immediate successor) — never a rewarded section's own room.
 *
 * The chains come in the order the passes after this read them: the ground a lock laid, the paths off the
 * main path, then the paths off those. What each of them was authored as and what the carve gave it, so
 * nothing downstream asks which level it came from.
 */
export const relayKeys = pass("relayKeys", ["branches", "lay", "rand"], ["keys"], (prep, state) => {
  const { siteId } = prep.input
  const { sideSections, ungatedIdxs, gatedTreasureIdxs, gatedStaircaseIdxs } = prep.sections
  const { groups, subChains } = state.branches
  const laid = state.lay?.laid
  const chain = [...shuffle([...gatedTreasureIdxs], state.rand), ...shuffle([...gatedStaircaseIdxs], state.rand)]

  const keyNodeIdMap = new Map<number, string>() // gated section idx → key node id
  const hostColors = new Map<number, KeyColor[]>() // host section idx → key color(s) its end room holds

  // A content section's end room stands on a laid node; it hosts a key the same way a branch's does.
  const absorbedGroups: SectionGroup[] = (laid?.absorbed ?? []).map(({ section, cells }) => {
    const nodes = cells.map(key => key.split(",").map(Number) as Cell)
    return { sectionIdx: section, cells: nodes, attachedAt: nodes[0] }
  })
  const groupOf = (idx: number) =>
    groups.find(g => g.sectionIdx === idx) ?? absorbedGroups.find(g => g.sectionIdx === idx)

  if (chain.length > 0 && ungatedIdxs.length > 0) {
    const hostGroup = groupOf(ungatedIdxs[0])
    if (hostGroup) {
      let hostIdx = ungatedIdxs[0]
      let hostCell = hostGroup.cells[hostGroup.cells.length - 1]

      for (const idx of chain) {
        keyNodeIdMap.set(idx, nid(siteId, hostCell[0], hostCell[1]))
        const gate = sideSections[idx].gate as { type: "floor-key"; color?: KeyColor }
        const colors = hostColors.get(hostIdx) ?? []
        colors.push(gate.color ?? "blue")
        hostColors.set(hostIdx, colors)

        if (!sideSections[idx].endReward) {
          const group = groupOf(idx)
          if (group) {
            hostIdx = idx
            hostCell = group.cells[group.cells.length - 1]
          }
        }
      }
    }
  }

  const laidSection: SideSection = { pathPuzzles: 0, difficulty: prep.config.config.difficulty, end: "treasure" }
  const laidChains = (laid?.chains ?? []).map((laidChain, i): Chain => ({
    section: laidSection,
    cells: laidChain.cells,
    attachedAt: laidChain.attachedAt ?? laidChain.cells[0],
    positional: `lock${i}`,
    idx: LAID_CHAIN_IDX + i,
    doors: [],
    hidden: false,
    keyHostColors: [],
    laid: true,
  }))
  const chains: Chain[] = [
    ...laidChains,
    ...groups.map((group): Chain => {
      const section = sideSections[group.sectionIdx]
      const positional = `s${group.sectionIdx}`
      // An authored keyId is used verbatim; only an unauthored gate looks up the id the key-host chain
      // above assigned it.
      const authoredKeyId = section.gate?.type === "floor-key" ? section.gate.keyId : undefined
      return {
        section,
        cells: group.cells,
        attachedAt: group.attachedAt,
        positional,
        idx: group.sectionIdx,
        doors: doorsShutting(section, positional, []),
        hidden: Boolean(section.hidden),
        keyNodeId: authoredKeyId ?? keyNodeIdMap.get(group.sectionIdx),
        keyHostColors: hostColors.get(group.sectionIdx) ?? [],
      }
    }),
    ...subChains,
  ]
  state.keys = { chains, hostColors }
})
