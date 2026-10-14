import { hashString } from "@/support/hashString"
import { regionOfStep } from "../regions"
import { keyOf } from "./derive"
import { computeLegacySideSectionHash, computeSideSectionHash } from "./sectionHash"
import { MAIN_SECTION_ADDRESS } from "./sections"
import type { CellLabels, DressingPools, Pass } from "./state"

/**
 * WHAT EVERY CARVED CELL IS FILED UNDER: its section's hash and address, how far along its section's walk it
 * sits, the region it stands in, its tier, its dressing pools, and whether it is hidden.
 *
 * The ADDRESS is which authored section a cell belongs to — `main`, `s0`, `s0.1`. What the author steers, and
 * so what a save files the cell under: where the builder hangs a sidepath along the main walk, and how much it
 * holds, are both free to change without the sidepath becoming a different place. Addressed exactly as
 * boardIndex.ts addresses chains, because it is the same thing.
 *
 * The ORDINAL is where a cell sits along its section's walk — how far in it is, not which cell it is. This is a
 * property of the carve, not of the authoring: the walk's length is `targetDistance`'s choice, so re-carving a
 * floor renumbers everything past the first divergence. A save must not name a cell by it (it names rooms by
 * their authored slot — see cellIdentity.ts). What it is good for is ORDER, which survives: it puts a
 * section's cells in the sequence the player walks them, so the fog can be restored as far as the furthest
 * room they reached.
 *
 * The DIFFICULTY is the tier each cell's own section was authored at, so a passage into a pocket of another
 * difficulty is BUILT of that difficulty (docs/game-design/spritesheet-renderer-prep.md — the material is the
 * rank whose tomb this is). Rooms carry it already; corridors did not.
 *
 * The DRESSING is which section's authored pools a footprint room draws from — what stands on its floor and
 * what hangs on its wall, both keyed on the cell so a claimed footprint keeps its own section's pools.
 */
export const labelCells: Pass<"maze" | "regions" | "keys" | "lay", "labels"> = (prep, state) => {
  const { config, addressOf } = prep.config
  const { chainRegionsBySectionIdx } = prep.layout
  const { mainSectionHash, legacyMainSectionHash } = prep.hashes
  const { sideSections } = prep.sections
  const { mainPath } = state.maze
  const { stepRegion } = state.regions
  const laid = state.lay?.laid
  const labels: CellLabels = {
    sectionHash: new Map(),
    legacySectionHash: new Map(),
    address: new Map(),
    ordinal: new Map(),
    hidden: new Set(),
    dressing: new Map(),
    difficulty: new Map(),
    region: new Map(),
    absorbedHash: new Map(),
  }
  const floorPools: DressingPools = { props: config.decorations, wall: config.wallDecorations }

  mainPath.forEach((cell, step) => {
    const key = keyOf(cell)
    labels.ordinal.set(key, String(step))
    labels.address.set(key, MAIN_SECTION_ADDRESS)
    labels.sectionHash.set(key, mainSectionHash)
    labels.legacySectionHash.set(key, legacyMainSectionHash)
    labels.dressing.set(key, floorPools)
    labels.difficulty.set(key, config.difficulty)
    const region = stepRegion[step]
    if (region !== undefined) labels.region.set(key, region)
  })

  let laidOrdinal = 0
  for (const { section, cells, positional, idx, parentIdx, doors, hidden, attachedAt, laid: laidChain } of state.keys
    .chains) {
    // A stretch the lock laid takes its labels, its address and its hash from the regions it crosses, so a
    // re-carve that moves the stretch moves nothing a save was filed under.
    if (laid && laidChain) {
      for (const cell of cells) {
        const key = keyOf(cell)
        const region = laid.label.get(key)!
        labels.ordinal.set(key, String(laidOrdinal++))
        labels.address.set(key, `lock:${region}`)
        labels.region.set(key, region)
        labels.sectionHash.set(key, String(hashString(`lock|${region}`)))
        labels.legacySectionHash.set(key, String(hashString(`lock|${region}|legacy`)))
        labels.dressing.set(key, floorPools)
        labels.difficulty.set(key, config.difficulty)
      }
      continue
    }
    const sHash = computeSideSectionHash(section, idx, doors.length > 0, config, parentIdx)
    const legacyHash = computeLegacySideSectionHash(section, idx, parentIdx)
    const pools: DressingPools = { props: section.decorations, wall: section.wallDecorations }
    const address = addressOf.get(positional) ?? positional
    cells.forEach((cell, step) => labels.ordinal.set(keyOf(cell), String(step)))
    for (const cell of cells) labels.address.set(keyOf(cell), address)
    // A top-level chain matched to an off-route component seats that component's OWN regions across its
    // cells — nearest the mouth first — the same way `regionOfStep` deals the main route across the main
    // path; re-using it here is what keeps a chain's region always in the order its component declared,
    // regardless of how many cells the carve gave it. Every other chain belongs to the region it grows
    // from, whole.
    const hostedRegions = parentIdx === undefined ? chainRegionsBySectionIdx.get(idx)?.regions : undefined
    if (hostedRegions) {
      const perCell = regionOfStep(hostedRegions, cells.length)
      cells.forEach((cell, step) => {
        const region = perCell[step]
        if (region !== undefined) labels.region.set(keyOf(cell), region)
      })
    } else {
      const grownFrom = labels.region.get(keyOf(attachedAt))
      if (grownFrom !== undefined) for (const cell of cells) labels.region.set(keyOf(cell), grownFrom)
    }
    for (const cell of cells) {
      const key = keyOf(cell)
      labels.sectionHash.set(key, sHash)
      labels.legacySectionHash.set(key, legacyHash)
      labels.dressing.set(key, pools)
      labels.difficulty.set(key, section.difficulty)
      if (hidden) labels.hidden.add(key)
    }
  }

  // A SECTION FILLED INTO LAID NODES KEEPS ITS OWN IDENTITY ON ITS ROOMS: its hash is the one it would have as
  // a branch, so a save filed under it survives a re-carve that moves the room to another node, and its rooms
  // draw from its own pools. The ground between the rooms stays the lock's.
  for (const { section: idx, cells: nodes } of laid?.absorbed ?? []) {
    const section = sideSections[idx]
    const own = {
      hash: computeSideSectionHash(section, idx, false, config, undefined),
      legacy: computeLegacySideSectionHash(section, idx, undefined),
    }
    for (const cellKey of nodes) {
      labels.absorbedHash.set(cellKey, own)
      labels.dressing.set(cellKey, { props: section.decorations, wall: section.wallDecorations })
    }
  }

  state.labels = labels
}
