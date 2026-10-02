import { useCallback, useMemo } from "react"
import { assembleFloor } from "@/game/siteAssembler"
import { openDoorsFor, openWaysOut } from "@/game/mechanismDoors"
import { withGateFaces } from "@/game/gateFace"
import { completeCell, isSealedWayOut } from "@/game/gridNavigation"
import type { Direction, FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import type { ResolveKeyRequirements } from "@/game/siteAssembler"
import { OBSTACLE_KEY_PREFIX } from "@/game/cellSlot"
import { boardIndexesForFloor } from "./boardIndexes"
import { cellKey, cellSlot, findByAddress, floorOfAddress, walkPosition } from "./cellIdentity"

const NO_OPEN_GATES: ReadonlySet<string> = new Set()

// A node's own key requirements, resolved from whichever family declares them (a tableau's
// hieroglyphs, etc.) — the same dispatch world-gen uses, but off the app-side family registry so
// this module names no mod. Populates each room's `requiredKeyIds` at assembly time so runtime
// consumers (the "still stuff to find" marker) can read a node's exposed keys uniformly with a
// gate's key. Inert for play — no other runtime code gates on requiredKeyIds.
const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

/**
 * Restore one floor's exploration from the cell keys a save holds, never from the coordinates beside
 * them (docs/instructions/world-reshape-release.md). A coordinate only names a cell on the carve it was
 * written against, so reading one against a re-carved floor marks rooms explored that were never opened
 * — including the ones holding keys.
 *
 * A cell comes back explored for either of two reasons:
 *
 * 1. **The save names it.** Every cell the player walked is written down, so within one carve this
 *    restores the floor exactly, corridor by corridor, the way it always has.
 * 2. **It is behind the high-water mark.** A corridor's key is carve-bound and stops matching once the
 *    floor moves — after a compaction there is a different number of corridors and they are not the
 *    same ones. A ROOM's key is authored and does not move, so the furthest room of each section the
 *    save reached is measured along THIS carve's walk, and everything up to it comes back with it. A
 *    section is a linear chain, so how far along it the player got outlives the carve.
 *
 * A ROOM itself is never restored by the mark, only by rule 1: a looted room is remembered by nothing
 * but its own entry, so a chest must never come back opened because something past it was reached.
 *
 * A section the save no longer matches at all gets no mark and stays fogged, which is the reset it
 * should be.
 *
 * `openGateKeys` is which obstacle gates currently stand open (`openDoorsFor`, mechanismDoors.ts). A
 * region's obstacle gate is the one kind of gate whose passability reverses — a control can be thrown
 * back after the player has already walked past it and had rooms beyond it named — so the mark must
 * not carry past one that is shut now, even though rule 1 still trusts whatever the save names
 * directly. A ward or floor-key gate is never checked here: its key, once earned, is never lost, so
 * nothing past it needs re-sealing. Defaults to none open, which is the conservative reading for a
 * caller (`repairFloorExploration`) that has no mechanism state to give it.
 */
export const applyExplored = (
  grid: FloorGrid,
  floor: number,
  exploredCells: Record<string, string[]>,
  openGateKeys: ReadonlySet<string> = NO_OPEN_GATES
): FloorGrid => {
  // Filed by the section's AUTHORING address, so re-authoring what is inside a section no longer makes
  // it a different section. There is no older address format to fall back to: a save still holding the
  // structural hashes is re-keyed from the coordinate archive before it is ever read (cellKeyVersion).
  const keysFor = (cell: GridCell): string[] | undefined =>
    cell.type === "empty" || cell.sectionAddress === undefined ? undefined : exploredCells[cell.sectionAddress]
  // A save never calls a WALL explored. A way out a switch shut is not ground, so a key naming one is
  // a leftover from a floor where it could still be walked onto — and honouring it would carry the
  // section's high-water mark past the bars, which is the whole floor beyond them coming back lit.
  const named = (r: number, c: number): boolean => {
    if (isSealedWayOut(grid.cells[r][c])) return false
    const key = cellKey(grid, floor, r, c)
    return key !== null && (keysFor(grid.cells[r][c])?.includes(key) ?? false)
  }

  const isShutObstacleGate = (cell: GridCell): boolean =>
    cell.type === "room" &&
    (cell.tags?.includes("gate") ?? false) &&
    cell.requiredKeyId !== undefined &&
    cell.requiredKeyId.startsWith(OBSTACLE_KEY_PREFIX) &&
    !openGateKeys.has(cell.requiredKeyId)

  const highWater = new Map<string, number>()
  // The furthest a shut obstacle gate lets the blind fill below reach, per section — Infinity where a
  // section has none, so it never constrains one. A room the save names directly is untouched by this:
  // only the fill that guesses forward from the mark has to stop at the bars.
  const nearestShutGate = new Map<string, number>()
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty" || !cell.ordinal) continue
      if (isShutObstacleGate(cell)) {
        const section = cell.sectionAddress ?? ""
        nearestShutGate.set(section, Math.min(nearestShutGate.get(section) ?? Infinity, walkPosition(cell.ordinal)))
      }
      if (!cellSlot(grid, r, c) || !named(r, c)) continue
      const section = cell.sectionAddress ?? ""
      highWater.set(section, Math.max(highWater.get(section) ?? -Infinity, walkPosition(cell.ordinal)))
    }
  }

  let result = grid
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "empty") continue
      const section = cell.sectionAddress ?? ""
      const behindTheMark =
        !cellSlot(grid, r, c) &&
        cell.ordinal !== undefined &&
        walkPosition(cell.ordinal) <= (highWater.get(section) ?? -Infinity) &&
        walkPosition(cell.ordinal) <= (nearestShutGate.get(section) ?? Infinity)
      if (named(r, c) || behindTheMark) result = completeCell(result, r, c)
    }
  }
  return result
}

const NO_POSITIONS: ReadonlyMap<string, string> = new Map()

const DIR_MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/**
 * The bars of a way out a switch left shut, stood in the doorway rather than a node further down it.
 *
 * The assembler cuts the door into the NODE beyond the fork, two cells out, because only even/even
 * positions hold a node and that is the cell whose branch is being closed. Left there, the player
 * reads a shut way out as a journey: open floor leading out of the junction, then a locked door at the
 * end of it. It is not a journey — it is a wall, and a wall belongs where the player stands.
 *
 * So the gate moves one cell in, onto the connector between the fork and that node, and the node gets
 * the corridor it was cut from. The connector's own walls, section and place along the walk come with
 * it, so nothing about the carve moves: this rearranges which of two cells already on the floor wears
 * the bars. Everything past the doorway — the node included — is then simply behind a gate the walk
 * stops at, and stays dark without a rule of its own.
 *
 * Runs on the grid `openWaysOut` has already reopened, so a way out the board opened is a corridor by
 * the time this looks and no door is stood in its doorway.
 */
export const sealWaysOut = (grid: FloorGrid): FloorGrid => {
  const moves: { doorway: [number, number]; node: [number, number] }[] = []
  const openMoves: typeof moves = []
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const fork = grid.cells[r][c]
      if (fork.type !== "room") continue
      for (const exit of fork.exits ?? []) {
        if (!exit.gateKeyId) continue
        const [dr, dc] = DIR_MOVES[exit.dir]
        const node = grid.cells[r + dr * 2]?.[c + dc * 2]
        const doorway = grid.cells[r + dr]?.[c + dc]
        if (doorway?.type !== "corridor") continue
        const at = { doorway: [r + dr, c + dc] as [number, number], node: [r + dr * 2, c + dc * 2] as [number, number] }
        if (node?.type === "room" && node.requiredKeyId === exit.gateKeyId) moves.push(at)
        else if (node?.type === "corridor" && node.openGate?.requiredKeyId === exit.gateKeyId) openMoves.push(at)
      }
    }
  }
  if (moves.length === 0 && openMoves.length === 0) return grid

  const cells = grid.cells.map(row => [...row])
  // A way out its board holds open is still a door, and stands in the doorway like the shut one did:
  // the leaf is drawn where the bars were, only the corridor under it differs.
  for (const { doorway, node } of openMoves) {
    const gate = cells[node[0]][node[1]]
    const passage = cells[doorway[0]][doorway[1]]
    if (gate.type !== "corridor" || passage.type !== "corridor") continue
    const { openGate, ...bare } = gate
    cells[doorway[0]][doorway[1]] = { ...passage, openGate }
    cells[node[0]][node[1]] = bare
  }
  for (const { doorway, node } of moves) {
    const gate = cells[node[0]][node[1]]
    const passage = cells[doorway[0]][doorway[1]]
    if (gate.type !== "room" || passage.type !== "corridor") continue
    cells[doorway[0]][doorway[1]] = {
      ...passage,
      type: "room",
      roomType: "encounter",
      tags: gate.tags,
      requiredKeyId: gate.requiredKeyId,
      gateVariant: gate.gateVariant,
      keyIsAuthored: gate.keyIsAuthored,
    }
    cells[node[0]][node[1]] = {
      type: "corridor",
      dirs: gate.dirs,
      state: gate.state,
      sectionAddress: gate.sectionAddress,
      sectionHash: gate.sectionHash,
      legacySectionHash: gate.legacySectionHash,
      ordinal: gate.ordinal,
      difficulty: gate.difficulty,
      hidden: gate.hidden,
    }
  }
  return { ...grid, cells }
}

// Mask hidden cells: map to empty, strip dirs pointing into them from neighbours.
// With detectionLevel >= 1: junction cells that were completed stay reachable so the
// player can always navigate back and trigger the reveal.
// revealedSections: authoring addresses whose hidden sections have been revealed by the player.
const maskHiddenCells = (
  grid: FloorGrid,
  detectionLevel: number,
  revealedSections: ReadonlySet<string>
): {
  masked: FloorGrid
  hiddenJunctions: ReadonlySet<string>
  hiddenSections: ReadonlySet<string>
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>
} => {
  // Collect positions of hidden, unrevealed cells, remembering each one's section so a junction
  // can be tied to the specific corridor it borders (the "found = noticed" mark, §7.2).
  const hiddenPos = new Map<string, string>()
  const hiddenSections = new Set<string>()
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if ((cell.type === "room" || cell.type === "corridor") && cell.hidden) {
        const section = cell.sectionAddress ?? ""
        if (!revealedSections.has(section)) {
          hiddenPos.set(`${r},${c}`, section)
          if (section) hiddenSections.add(section)
        }
      }
    }
  }

  const junctionSections = new Map<string, ReadonlySet<string>>()
  if (hiddenPos.size === 0)
    return { masked: grid, hiddenJunctions: new Set(), hiddenSections: new Set(), junctionSections }

  const junctions = new Set<string>()
  // An exit's node sits two grid cells out, past its own connector — and that connector stays visible
  // even when the node beyond it is hidden (a connector is hidden only when both the nodes it joins
  // are). So a fork's own `dirs` never lose that direction here, and an exit is pruned by checking the
  // hidden set directly rather than by whether `dirs` moved.
  const leadsToHidden = (r: number, c: number, dir: Direction): boolean => {
    const [dr, dc] = DIR_MOVES[dir]
    return hiddenPos.has(`${r + dr * 2},${c + dc * 2}`)
  }
  const newCells: GridCell[][] = grid.cells.map((row, r) =>
    row.map((cell, c): GridCell => {
      if (hiddenPos.has(`${r},${c}`)) return { type: "empty" }

      if (cell.type === "room" || cell.type === "corridor") {
        const newDirs = new Set(cell.dirs) as Set<Direction>
        const borderedSections = new Set<string>()
        for (const [dir, [dr, dc]] of Object.entries(DIR_MOVES) as [Direction, [number, number]][]) {
          const neighborSection = newDirs.has(dir) ? hiddenPos.get(`${r + dr},${c + dc}`) : undefined
          if (neighborSection !== undefined) {
            newDirs.delete(dir)
            if (neighborSection) borderedSections.add(neighborSection)
          }
        }
        const dirsChanged = newDirs.size !== cell.dirs.size

        // A gate the player can see says something is there, and a way out drawn on the board says the
        // same — so a fork's `exits` are pruned whenever the node one leads to is hidden, whether or not
        // this cell's own `dirs` moved. Left whole, the board would draw a door into a branch nobody has
        // found.
        const exits = cell.type === "room" ? cell.exits?.filter(exit => !leadsToHidden(r, c, exit.dir)) : undefined
        const exitsChanged = cell.type === "room" && exits !== undefined && exits.length !== (cell.exits?.length ?? 0)

        if (dirsChanged) {
          junctions.add(`${r},${c}`)
          if (borderedSections.size > 0) junctionSections.set(`${r},${c}`, borderedSections)
        }

        if (dirsChanged || exitsChanged) {
          // With detector: force the junction reachable, whether the player is walking up to
          // it for the first time ("visible" — completeCell treated it as a plain passthrough
          // on the unmasked graph, since it had no idea one side led to a hidden dead end) or
          // returning to it later ("completed"). Without a detector, leave the state alone —
          // the player glides straight through the hidden gap, seeing nothing unusual.
          const state =
            dirsChanged && detectionLevel >= 1 && (cell.state === "completed" || cell.state === "visible")
              ? "reachable"
              : cell.state
          // Downgrade room → corridor if hidden dir removal leaves it as a passthrough corner. It is
          // still the same cell, so everything that NAMES it comes along: without the address and the
          // ordinal, a player standing on a downgraded room has nowhere to be written down.
          //
          // NEVER A ROOM THAT HOLDS SOMETHING. Rebuilt as a corridor it would shed its family, its tags
          // and its exits, and a corridor has no slot, so a switch's puzzle would vanish and its solved
          // state would have nowhere to come back to. What reaches this today is only corridors: nodes
          // sit two cells apart, so a room's grid neighbours are all connector cells, and a connector is
          // hidden only when both the nodes it joins are — measured over the baked world, 2044 hidden
          // cells and not one visible room beside any of them. The guard is what keeps that true if the
          // masking ever widens.
          if (cell.type === "room" && dirsChanged && newDirs.size <= 2 && cell.family === undefined) {
            return {
              type: "corridor",
              dirs: newDirs as ReadonlySet<Direction>,
              state,
              sectionAddress: cell.sectionAddress,
              sectionHash: cell.sectionHash,
              legacySectionHash: cell.legacySectionHash,
              ordinal: cell.ordinal,
              difficulty: cell.difficulty,
              hidden: cell.hidden,
            }
          }
          return { ...cell, dirs: newDirs as ReadonlySet<Direction>, state, ...(exits ? { exits } : {}) }
        }
      }

      return cell
    })
  )

  return { masked: { ...grid, cells: newCells }, hiddenJunctions: junctions, hiddenSections, junctionSections }
}

export const useAssembledFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  currentFloor: number,
  exploredCells: Record<string, string[]>,
  positionKey: string | null | undefined,
  detectionLevel = 0,
  revealedSections?: ReadonlySet<string>,
  // Which level of the journey this floor belongs to, so its rooms can be dealt their boards
  // (src/game/seeds/boardIndex.ts). Unset outside the baked world — stories, specs, the builder.
  levelIndex?: number,
  /** Which position every mechanism on this floor is stored in, keyed by its cell address
   * (see useMechanismStates) — read against the floor's own `mechanism` records to find what stands
   * open (see openDoorsFor). */
  mechanismPositions?: ReadonlyMap<string, string>,
  /** The live cell the player is standing on (a bend or bare fork included) — read before `positionKey`
   * for where to draw the explorer, since it names every cell walked onto and `positionKey` only the
   * last authored place. Appended last so a caller that has not been touched by this fix (a fixture
   * built before `standingKey` existed) still resolves exactly as it always has, via `positionKey`. */
  standingKey?: string | null
): {
  grid: FloorGrid | null
  explorerPos: readonly [number, number]
  hiddenJunctions: ReadonlySet<string>
  hiddenSections: ReadonlySet<string>
  junctionSections: ReadonlyMap<string, ReadonlySet<string>>
  /** The gate keys the floor's own mechanisms currently hold open — passed back out so a caller can
   * fold them into what it treats as "owned" (a mechanism a player has thrown IS a key they hold, for
   * every soft gate that reads that word: the key-gate family's own precondition, the map's
   * locked/unlocked tint, the HUD key ring). Recomputed fresh from the current mechanism positions
   * every render, so a lever thrown back shuts a gate this set stops naming just as readily as it
   * opened one. */
  openGateKeys: ReadonlySet<string>
} => {
  const baseGrid = useMemo(() => {
    const result = assembleFloor(journeyId, floorConfig, seed + currentFloor, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId, ...(levelIndex !== undefined ? { levelIndex } : {}), floorIndex: currentFloor },
      ...(levelIndex !== undefined
        ? { resolveBoardIndex: boardIndexesForFloor(journeyId, levelIndex, currentFloor) }
        : {}),
    })
    return result.success ? result.grid : null
  }, [journeyId, floorConfig, seed, currentFloor, levelIndex])

  // Which gates the floor's own mechanisms currently hold open — read once so the carve (below) and
  // the fog restore (applyExplored) agree on the same set rather than each asking openDoorsFor its own.
  const openGateKeys = useMemo(
    () => (baseGrid ? openDoorsFor(baseGrid, currentFloor, mechanismPositions ?? NO_POSITIONS) : NO_OPEN_GATES),
    [baseGrid, currentFloor, mechanismPositions]
  )

  // The carve as the floor's own switches have left it — what everything below reads as "the floor". A
  // door still shut wears its face lit as its owners stand now.
  const carvedGrid = useMemo(
    () =>
      baseGrid
        ? withGateFaces(
            sealWaysOut(openWaysOut(baseGrid, openGateKeys)),
            currentFloor,
            mechanismPositions ?? NO_POSITIONS
          )
        : null,
    [baseGrid, openGateKeys, currentFloor, mechanismPositions]
  )

  // Standing in the doorway is having been there: the entrance reads explored whether or not the save
  // says so, so a floor is never entered onto a fogged cell.
  const effectiveExplored = useMemo(() => {
    if (!carvedGrid) return exploredCells
    const [er, ec] = carvedGrid.entrancePos
    const entranceCell = carvedGrid.cells[er][ec]
    const key = cellKey(carvedGrid, currentFloor, er, ec)
    if (entranceCell.type === "empty" || !key) return exploredCells
    const section = entranceCell.sectionAddress ?? ""
    const existing = exploredCells[section] ?? []
    if (existing.includes(key)) return exploredCells
    return { ...exploredCells, [section]: [...existing, key] }
  }, [carvedGrid, exploredCells, currentFloor])

  const exploredGrid = useMemo(
    () => (carvedGrid ? applyExplored(carvedGrid, currentFloor, effectiveExplored, openGateKeys) : null),
    [carvedGrid, currentFloor, effectiveExplored, openGateKeys]
  )

  const { grid, hiddenJunctions, hiddenSections, junctionSections } = useMemo(() => {
    const empty = new Set<string>() as ReadonlySet<string>
    const emptyMap = new Map<string, ReadonlySet<string>>() as ReadonlyMap<string, ReadonlySet<string>>
    if (!exploredGrid) return { grid: null, hiddenJunctions: empty, hiddenSections: empty, junctionSections: emptyMap }
    const revealed = revealedSections ?? empty
    const masked = maskHiddenCells(exploredGrid, detectionLevel, revealed)
    return {
      grid: masked.masked,
      hiddenJunctions: masked.hiddenJunctions,
      hiddenSections: masked.hiddenSections,
      junctionSections: masked.junctionSections,
    }
  }, [exploredGrid, detectionLevel, revealedSections])

  // Resolves one address against the MASKED grid, or null when it names nowhere to stand on THIS
  // carve — which is the right answer whether the address is stale (see explorerPos below) or the
  // caller has none to offer. Somewhere an address still names is not the same as somewhere you can
  // stand: a saved cell turns to void when the floor it belongs to is restructured, and — more often —
  // when a found hidden section goes back to hidden because its section hash moved (the hash covers the
  // section's encounter, so re-authoring an encounter is enough). A shut way out is one more thing an
  // address can name that is nowhere to stand — nothing walks onto one, so a save that puts the player
  // there is a save that strands them: no route the map will honour starts on a wall.
  const resolveStanding = useCallback(
    (address: string | null | undefined): readonly [number, number] | null => {
      if (!grid || !address || floorOfAddress(address) !== currentFloor) return null
      const at = findByAddress(grid, currentFloor, address)
      if (!at) return null
      const cell = grid.cells[at[0]][at[1]]
      if (cell.type === "empty" || isSealedWayOut(cell)) return null
      return at
    },
    [grid, currentFloor]
  )

  const explorerPos: readonly [number, number] = useMemo(() => {
    if (!grid) return [0, 0]
    // The live cell first — it names every cell walked onto, bends included. A stale one (the carve
    // moved under it, or it simply has none yet) falls through to the last authored place, and that to
    // the entrance, rather than stranding the player on a wall or off the map.
    return resolveStanding(standingKey) ?? resolveStanding(positionKey) ?? grid.entrancePos
  }, [grid, standingKey, positionKey, resolveStanding])

  return { grid, explorerPos, hiddenJunctions, hiddenSections, junctionSections, openGateKeys }
}
