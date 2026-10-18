import { hashString } from "@/support/hashString"
import { oneWayRunCells } from "../carveConstants"
import { ACTIVITIES } from "../activities"
import { activitiesServing, rolesOfProp, rolesOfWallItem } from "../dressingTags"
import { footprintSize, isChamber, portalKindOf } from "../roomFootprint"
import type {
  CorridorCell,
  DecorationKind,
  Direction,
  FloorGrid,
  GridCell,
  RoomCell,
  WallDecorationKind,
} from "../siteTypes"
import { MECHANISM_AT_REST } from "../siteTypes"
import { holeRegion } from "../mechanics/weights"
import { standOnCorridor } from "../sequenceTiles"
import { edgeAllowed, forkPositions, rooms, routeStepOf } from "./derive"
import { CONNECTOR_DIRS, OPPOSITE } from "./grid"
import { switchMark } from "./ids"
import { MAIN_SECTION_ADDRESS } from "./sections"
import type { CarveState, FloorPrep, RoomSpec } from "./state"

/** The five kinds a god can be DEPICTED on, as `tileAssets.ts`'s resolver reads them: a patron reaches the map
 * through these and nothing else. Copied rather than imported for the reason `artCensus.ts` gives — that module
 * pulls in the app's PNG imports. */
const PATRON_KINDS = new Set<string>(["statue", "shrine", "wallShrine", "stela", "mask"])
/** How many rooms per floor a dedicated site gives to its god: a guaranteed count, not a raised probability. */
const PATRON_PER_FLOOR = 1

/** A grid whose cells are still being written. */
export type WritableGrid = Omit<FloorGrid, "cells"> & { cells: GridCell[][] }

/** What the renderer reads: every pass's decision but the ladder's. */
export type RenderState = Pick<
  Required<CarveState>,
  | "maze"
  | "branches"
  | "doors"
  | "lay"
  | "labels"
  | "mainRooms"
  | "chainRooms"
  | "switchDoors"
  | "drops"
  | "forks"
  | "switchWays"
  | "switchRooms"
  | "forkSwitchRooms"
  | "pipeHoles"
>

/**
 * A room serves one purpose: what hangs on its wall agrees with what stands in it. The prop leads, and the wall
 * pool narrows to the prop's purposes only where that still leaves a choice: a single survivor would hang the
 * identical thing in every room of that purpose.
 */
const wallSuiting = (pool: WallDecorationKind[], prop: DecorationKind | undefined) => {
  const purposes = prop ? rolesOfProp(prop) : undefined
  if (!purposes?.length) return pool
  const fits = pool.filter(k => rolesOfWallItem(k)?.some(role => purposes.includes(role)))
  return fits.length >= 2 ? fits : pool
}

/**
 * THE GROUND, WRITTEN FROM WHAT THE PASSES DECIDED, every reserved junction still open. Every used node becomes
 * a room where a pass specced one and a corridor where none did, every allowed edge its connector, every drop
 * its launch, run and landing; then the entrance opens and the chambers are dressed. It decides
 * nothing a pass could: what it reads back off the grid (a node's `dirs` for a drop's join and a room's
 * footprint for its dressing) is what it itself just wrote. The carve is checked against this view open.
 */
export const renderGround = (prep: FloorPrep, state: RenderState): WritableGrid => {
  const { siteId } = prep.input
  const { config } = prep.config
  const { mainSectionHash, legacyMainSectionHash } = prep.hashes
  const { n: N, entrance, exit } = state.maze
  const [entR, entC] = entrance
  const [exR, exC] = exit
  const { used } = state.branches
  const labels = state.labels
  const roomSpecs = rooms(state)
  const allowed = edgeAllowed(state, state.switchDoors)
  const forks = forkPositions(state)
  const stepOf = routeStepOf(state.maze)

  // What lies one node away, read off the NEIGHBOUR's own kind rather than inferred from this cell.
  const exitKindOf = (cellKey: string, neighborKey: string): "main" | "side" | "ward" | "fork" => {
    if (forks.has(neighborKey)) return "fork"
    if (roomSpecs.get(neighborKey)?.gateVariant === "tomb-key") return "ward"
    const mi = stepOf.get(cellKey)
    const neighborMi = stepOf.get(neighborKey)
    return mi !== undefined && neighborMi !== undefined && Math.abs(mi - neighborMi) === 1 ? "main" : "side"
  }

  const cells2D: GridCell[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, (): GridCell => ({ type: "empty" }))
  )

  // Every used node, a room or a corridor. A fork also names what each of its own dirs leads to.
  for (const cellKey of used) {
    const [r, c] = cellKey.split(",").map(Number)
    const spec = roomSpecs.get(cellKey)
    const dirs = new Set<Direction>()
    const exits: RoomCell["exits"] = spec?.roomType === "fork" ? [] : undefined
    for (const [dr, dc, d] of CONNECTOR_DIRS) {
      const nr = r + dr,
        nc = c + dc
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && used.has(`${nr},${nc}`) && allowed(r, c, nr, nc)) {
        dirs.add(d)
        if (exits) exits.push({ dir: d, kind: exitKindOf(cellKey, `${nr},${nc}`) })
      }
    }

    const sectionHash = labels.sectionHash.get(cellKey) ?? mainSectionHash
    const sectionAddress = labels.address.get(cellKey) ?? MAIN_SECTION_ADDRESS
    const legacySectionHash = labels.legacySectionHash.get(cellKey) ?? legacyMainSectionHash
    const hidden = labels.hidden.has(cellKey) || undefined
    // No default: a floor that authors no regionLayout leaves every cell's region absent.
    const region = labels.region.get(cellKey)
    const ordinal = labels.ordinal.get(cellKey)
    const tier = labels.difficulty.get(cellKey)
    if (spec) {
      // The spec spreads whole, so a future RoomCell field cannot go missing here; the section's tier first, so a
      // room authored at its own tier keeps it.
      const roomCell: RoomCell = {
        type: "room",
        dirs,
        state: "fogged",
        ...(tier ? { difficulty: tier } : {}),
        sectionAddress,
        sectionHash: labels.absorbedHash.get(cellKey)?.hash ?? sectionHash,
        legacySectionHash: labels.absorbedHash.get(cellKey)?.legacy ?? legacySectionHash,
        ...(ordinal ? { ordinal } : {}),
        ...(hidden ? { hidden } : {}),
        ...(region !== undefined ? { region } : {}),
        ...spec,
        ...(exits ? { exits } : {}),
      }
      cells2D[r][c] = roomCell
    } else {
      const corridorCell: CorridorCell = {
        type: "corridor",
        dirs,
        state: "fogged",
        sectionAddress,
        sectionHash,
        legacySectionHash,
        ...(ordinal ? { ordinal } : {}),
        ...(tier ? { difficulty: tier } : {}),
        ...(hidden ? { hidden } : {}),
        ...(region !== undefined ? { region } : {}),
      }
      cells2D[r][c] = corridorCell
    }
  }

  // THE PLAIN 1-WIDE CORRIDOR CELL BETWEEN TWO NODES, built the one way for a two-way passage and a drop alike.
  // `owner` is the node it answers to: its section, hash, tier and region, which for a drop is the node it falls
  // FROM. It is hidden only when both ends are, so the corridor into a hidden section stays visible. A drop's far
  // end belongs to another section, so its ordinal names that section too: the bare pair would collide with the
  // owner's own connector between the same two step numbers.
  const connectorBetween = (
    owner: string,
    other: string,
    dirs: Set<Direction>,
    drop = false,
    runIndex = 0
  ): CorridorCell => {
    const ownerOrdinal = labels.ordinal.get(owner)
    const otherOrdinal = labels.ordinal.get(other)
    const otherLabel =
      drop && otherOrdinal !== undefined
        ? `${labels.address.get(other) ?? MAIN_SECTION_ADDRESS}:${otherOrdinal}`
        : otherOrdinal
    const tier = labels.difficulty.get(owner)
    return {
      type: "corridor",
      dirs,
      state: "fogged",
      sectionAddress: labels.address.get(owner) ?? MAIN_SECTION_ADDRESS,
      sectionHash: labels.sectionHash.get(owner) ?? mainSectionHash,
      legacySectionHash: labels.legacySectionHash.get(owner) ?? legacyMainSectionHash,
      // A connector is named by the two cells it joins: sorted for an ordinary one, directional for a drop.
      ...(ownerOrdinal && otherLabel
        ? {
            ordinal: drop ? `${ownerOrdinal}|${otherLabel}#${runIndex}` : [ownerOrdinal, otherLabel].sort().join("|"),
          }
        : {}),
      ...(tier ? { difficulty: tier } : {}),
      ...(labels.hidden.has(owner) && labels.hidden.has(other) ? { hidden: true } : {}),
      ...(labels.region.get(owner) !== undefined ? { region: labels.region.get(owner) } : {}),
    }
  }

  // The connector of every allowed edge between two used nodes, each written once from its lower end.
  for (const cellKey of used) {
    const [r, c] = cellKey.split(",").map(Number)
    for (const [dr, dc, d] of CONNECTOR_DIRS) {
      const nr = r + dr,
        nc = c + dc
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
      if (!used.has(`${nr},${nc}`) || !allowed(r, c, nr, nc)) continue
      if (r * N + c > nr * N + nc) continue
      cells2D[(r + nr) / 2][(c + nc) / 2] = connectorBetween(cellKey, `${nr},${nc}`, new Set([d, OPPOSITE[d]]))
    }
  }

  // THE DROPS: launch, obstacle, landing along `dir`, each cell written once. The obstacle cells name no direction
  // and nothing names them, so the walk graph has no way across: taking the drop is the one thing joining the ends.
  for (const edge of state.drops) {
    const writeStub = (cellKey: string, owner: string, other: string, dirs: Set<Direction>, index: number) => {
      const [r, c] = cellKey.split(",").map(Number)
      if (cells2D[r][c].type !== "empty")
        throw new Error(`[siteAssembler] one-way from ${edge.from} ran into a carved cell at ${cellKey}`)
      cells2D[r][c] = connectorBetween(owner, other, dirs, true, index)
    }
    const joinNode = (nodeKey: string, dir: Direction) => {
      const [r, c] = nodeKey.split(",").map(Number)
      const node = cells2D[r][c]
      if (node.type === "empty")
        throw new Error(`[siteAssembler] one-way from ${edge.from} landed on an uncarved cell at ${nodeKey}`)
      cells2D[r][c] = { ...node, dirs: new Set([...node.dirs, dir]) }
    }
    joinNode(edge.from, edge.dir)
    writeStub(edge.launch, edge.from, edge.to, new Set([OPPOSITE[edge.dir]]), 0)
    edge.run.forEach((cellKey, k) => {
      writeStub(cellKey, edge.from, edge.to, new Set(), k + 1)
      const [r, c] = cellKey.split(",").map(Number)
      const cell = cells2D[r][c]
      if (cell.type === "corridor") cells2D[r][c] = { ...cell, obstacle: { dir: edge.dir, kind: edge.realisation } }
    })
    writeStub(edge.landing, edge.to, edge.from, new Set([edge.dir]), oneWayRunCells(edge.dir) + 1)
    joinNode(edge.to, OPPOSITE[edge.dir])
  }

  const entranceCell = cells2D[entR][entC]
  if (entranceCell.type === "room") cells2D[entR][entC] = { ...entranceCell, state: "reachable" }

  // DRESSING: ONLY A CHAMBER IS DRESSED — a room that claims floor on the map (`isChamber`); a puzzle stands in
  // the corridor and has nowhere to put a prop. ONE PURPOSE PER CHAMBER, by precedence — story, then mechanism,
  // then patron, then treasure or shop, then an activity. A story room shows the activity authored for it, from
  // the pool where the pool holds its props and from its own props where it does not: a scene's set is
  // authored, so it may name a kind the wing's role narrowed away. A mechanism's room and a treasure or shop
  // room show nothing competing with what stands in them; every other chamber shows one activity its section's
  // pool furnishes and its wing's role serves, prop and wall item both from it, or where there is none, any
  // prop of the pool. Every pick is hashed from WHERE the room is.
  const switchesStanding = new Set(state.forks.reserved.slice(0, state.forks.switchesPlaced))
  const isMechanism = (pk: string, spec: RoomSpec): boolean =>
    state.switchRooms.has(pk) ||
    state.forkSwitchRooms.has(pk) ||
    switchesStanding.has(pk) ||
    spec.mechanism !== undefined ||
    spec.mechanismId !== undefined ||
    spec.requiredKeyId !== undefined ||
    spec.gateVariant !== undefined
  const isTreasureLike = (spec: RoomSpec): boolean =>
    spec.roomType === "encounter" && (spec.tags?.includes("treasure") === true || spec.tags?.includes("shop") === true)
  const pickDressing = <T>(pool: readonly T[] | undefined, pk: string, salt: string): T | undefined =>
    pool?.length ? pool[hashString(`${siteId}:${salt}:${pk}`) % pool.length] : undefined

  // The rooms that claim floor around them on the map: junctions and dead-end treasure or shop rooms. Only these
  // are big enough to show a god.
  const endpointPositions = new Set<string>()
  for (const [pk, spec] of roomSpecs) {
    const [r, c] = pk.split(",").map(Number)
    const cell = cells2D[r][c]
    if (isTreasureLike(spec) && cell.type === "room" && cell.dirs.size === 1) endpointPositions.add(pk)
  }

  // A DEDICATED FLOOR SHOWS ITS GOD AT LEAST ONCE, in the chamber it is organised around: a fork first, then the
  // biggest room by the floor it draws (`footprintSize`, the renderer's own claim rule), hash breaking ties. Never
  // a portal or a mechanism's room, and only a room whose own pool can carry a patron.
  const patronRooms = new Set<string>()
  if (config.patron !== undefined && PATRON_PER_FLOOR > 0) {
    const claimGrid: FloorGrid = {
      cells: cells2D,
      rows: N,
      cols: N,
      entrancePos: [entR, entC],
      exitPos: [exR, exC],
      siteId,
      staircases: {},
    }
    const rowCol = (pk: string): [number, number] => {
      const [r, c] = pk.split(",").map(Number)
      return [r, c]
    }
    const isFork = (pk: string): boolean => {
      const [r, c] = rowCol(pk)
      const cell = cells2D[r][c]
      return cell.type === "room" && cell.roomType === "fork"
    }
    const eligible = [...new Set([...forks, ...endpointPositions])]
      .filter(pk => (labels.dressing.get(pk)?.props ?? []).some(k => PATRON_KINDS.has(k)))
      .filter(pk => roomSpecs.get(pk)?.authoredActivity === undefined)
      .filter(pk => {
        const spec = roomSpecs.get(pk)
        const [r, c] = rowCol(pk)
        const cell = cells2D[r][c]
        return cell.type === "room" && cell.roomType !== "portal" && !(spec && isMechanism(pk, spec))
      })
      .sort(
        (a, b) =>
          Number(isFork(b)) - Number(isFork(a)) ||
          footprintSize(claimGrid, ...rowCol(b)) - footprintSize(claimGrid, ...rowCol(a)) ||
          hashString(`${siteId}:patronPick:${a}`) - hashString(`${siteId}:patronPick:${b}`) ||
          a.localeCompare(b)
      )
    for (const pk of eligible.slice(0, PATRON_PER_FLOOR)) patronRooms.add(pk)
  }

  const chamberAt = (pk: string, spec: RoomSpec): boolean => {
    const [r, c] = pk.split(",").map(Number)
    const cell = cells2D[r][c]
    if (cell.type !== "room") return false
    const kind =
      spec.roomType === "portal"
        ? portalKindOf({ entrancePos: [entR, entC] }, r, c, spec)
        : isTreasureLike(spec)
          ? "treasure"
          : "room"
    return isChamber(cell, kind)
  }
  const fromPoolOrOwn = <T>(pool: readonly T[] | undefined, own: readonly T[]): readonly T[] => {
    const shared = pool?.filter(k => own.includes(k)) ?? []
    return shared.length ? shared : own
  }
  for (const [pk, spec] of roomSpecs) {
    const isPatron = patronRooms.has(pk)
    const authored = ACTIVITIES.find(a => a.id === spec.authoredActivity)
    if (!chamberAt(pk, spec)) continue
    if (!authored && (isMechanism(pk, spec) || (!isPatron && isTreasureLike(spec)))) continue
    const pools = labels.dressing.get(pk)
    const activity =
      authored ??
      (isPatron ? undefined : pickDressing(activitiesServing(pools?.props ?? [], pools?.role), pk, "activity"))
    // The god's room draws from the god-bearing kinds, a statue first where the pool has one.
    const patronProps = pools?.props?.filter(k => PATRON_KINDS.has(k))
    const godProps = patronProps?.includes("statue") ? (["statue"] as DecorationKind[]) : patronProps
    const propPool = authored
      ? fromPoolOrOwn(pools?.props, authored.props)
      : isPatron
        ? godProps
        : activity
          ? pools?.props?.filter(k => activity.props.includes(k))
          : pools?.props
    const picked = pickDressing(propPool, pk, "decoration")
    // No pit beside a way down: re-picked rather than filtered, so the pool's length moves no other room.
    const [r, c] = pk.split(",").map(Number)
    const owner = cells2D[r][c]
    const besideStair = owner.type === "room" && owner.roomType === "portal" && owner.stairId !== undefined
    const decoration =
      picked === "pit" && besideStair
        ? pickDressing(
            propPool?.filter(k => k !== "pit"),
            pk,
            "decoration:not-a-pit"
          )
        : picked
    // The god's room takes a god's wall item too, which is how the renderer finds it. An activity hangs only its
    // own wall items, and nothing where it has none.
    const patronWall = isPatron ? pools?.wall?.filter(k => PATRON_KINDS.has(k)) : undefined
    const wallPool = authored
      ? fromPoolOrOwn(pools?.wall, authored.wall)
      : patronWall?.length
        ? patronWall
        : activity
          ? pools?.wall?.filter(k => activity.wall.includes(k))
          : pools?.wall
            ? wallSuiting(pools.wall, decoration)
            : undefined
    const wallDecoration = pickDressing(wallPool, pk, "wallDecoration")
    if (!decoration && !wallDecoration) continue
    if (owner.type === "room")
      cells2D[r][c] = {
        ...owner,
        ...(decoration ? { decoration } : {}),
        ...(wallDecoration ? { wallDecoration } : {}),
        ...(activity ? { activity: activity.id } : {}),
        ...(isPatron && decoration ? { patronRoom: true } : {}),
      }
  }

  const staircases: Record<string, readonly [number, number]> = {}
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const cell = cells2D[r][c]
      if (cell.type === "room" && cell.stairId) staircases[cell.stairId] = [r, c]
    }

  return {
    cells: cells2D,
    difficulty: config.difficulty,
    ...(config.theme !== undefined ? { theme: config.theme } : {}),
    ...(config.condition !== undefined ? { condition: config.condition } : {}),
    ...(config.patron !== undefined ? { patron: config.patron } : {}),
    rows: N,
    cols: N,
    entrancePos: [entR, entC],
    exitPos: [exR, exC],
    siteId,
    staircases,
  }
}

const at = (pk: string): [number, number] => {
  const [r, c] = pk.split(",").map(Number)
  return [r, c]
}

/**
 * SHUTS THE FIRST `count` RESERVED JUNCTIONS' WAYS OUT: each becomes a door, a ward gate's bars with no family
 * and a key nothing mints, and the junction reports the key it now wants on that exit.
 */
const shutJunctions = (prep: FloorPrep, state: RenderState, cells: GridCell[][], count: number) => {
  for (let n = 0; n < count; n++) {
    const pk = state.forks.reserved[n]
    const [sr, sc] = at(pk)
    const junction = cells[sr][sc]
    if (junction.type !== "room") throw new Error(`[siteAssembler] reserved fork ${pk} is not a room`)
    const gateKeyByDir = new Map<Direction, string>()
    for (const { dir, cell, gateKeyId } of state.switchWays[n]) {
      gateKeyByDir.set(dir, gateKeyId)
      const [gr, gc] = at(cell)
      const wayOut = cells[gr][gc]
      if (wayOut.type !== "corridor") throw new Error(`[siteAssembler] way out ${cell} is not a corridor`)
      cells[gr][gc] = {
        ...wayOut,
        type: "room",
        roomType: "encounter",
        tags: prep.families.keyGate.tags,
        requiredKeyId: gateKeyId,
        gateVariant: "floor-key",
        keyIsAuthored: true,
      }
    }
    cells[sr][sc] = {
      ...junction,
      exits: junction.exits?.map(exit => {
        const gateKeyId = gateKeyByDir.get(exit.dir)
        return gateKeyId ? { ...exit, gateKeyId } : exit
      }),
      mechanism: {
        states: [MECHANISM_AT_REST, ...gateKeyByDir.values()],
        initial: MECHANISM_AT_REST,
        returnsToInitial: true,
        positions: [...gateKeyByDir.values()].map(gateKeyId => ({ state: gateKeyId, gateKeyId })),
      },
    }
  }
}

/**
 * WHICH MECHANISM DRIVES WHICH DOOR IS ONLY READABLE IF BOTH ENDS SAY SO: the mark goes on the mechanism's room
 * and on every door it owns, found by the key its positions carry or the key the door asks for. A switch's
 * marks are this attempt's own: a door minted on a junction another attempt reserved is no door here.
 */
const paintMarks = (prep: FloorPrep, state: RenderState, cells: GridCell[][]) => {
  const { allocation, markByGateKey } = prep.marks
  const switchMarks = new Map(
    state.switchWays
      .slice(0, state.forks.switchesPlaced)
      .flatMap((ways, n) => ways.map(({ gateKeyId }) => [gateKeyId, switchMark(prep, n)] as const))
  )
  const markOf = (gateKeyId: string) => markByGateKey.get(gateKeyId) ?? switchMarks.get(gateKeyId)
  for (let r = 0; r < cells.length; r++)
    for (let c = 0; c < cells[r].length; c++) {
      const cell = cells[r][c]
      if (cell.type !== "room") continue
      const key = cell.mechanism?.positions[0]?.gateKeyId ?? cell.requiredKeyId
      const own = cell.mechanismId
        ? (allocation.marks.get(cell.mechanismId) ?? allocation.marks.get(`handle:${cell.mechanismId}`))
        : undefined
      const mark = own ?? (key === undefined ? undefined : markOf(key))
      if (mark) cells[r][c] = { ...cell, mark }
      // Each way out a fork-switch owns carries what its own gate wears, which is what the board draws.
      const marked = cells[r][c]
      if (marked.type === "room" && marked.exits?.some(exit => exit.gateKeyId && markOf(exit.gateKeyId)))
        cells[r][c] = {
          ...marked,
          exits: marked.exits.map(exit => {
            const wayMark = exit.gateKeyId ? markOf(exit.gateKeyId) : undefined
            return wayMark ? { ...exit, mark: wayMark } : exit
          }),
        }
    }
}

/** The ground with every reserved junction shut, switch or no switch: the carve is checked against it too. */
export const renderShut = (prep: FloorPrep, state: RenderState): WritableGrid => {
  const grid = renderGround(prep, state)
  shutJunctions(prep, state, grid.cells, state.forks.reserved.length)
  return grid
}

/**
 * THE GRID, WRITTEN ONCE FROM WHAT THE PASSES DECIDED: the ground, then the doors of every junction a switch
 * stands in, the switch itself, each `{ in }` fork's switch in the junction laid for it, each pipe's hole, and last the marks
 * tying each mechanism to its doors. A door nothing mints the key for is not a door, so a reserved junction with
 * no switch stays open.
 */
export const render = (prep: FloorPrep, state: RenderState): WritableGrid => {
  const grid = renderGround(prep, state)
  const cells = grid.cells
  shutJunctions(prep, state, cells, state.forks.switchesPlaced)
  for (const [pk, room] of state.switchRooms) {
    const [r, c] = at(pk)
    const junction = cells[r][c]
    if (junction.type !== "room") throw new Error(`[siteAssembler] reserved fork ${pk} is not a room`)
    cells[r][c] = { ...junction, ...room }
  }
  for (const [pk, { room, gateKeyByDir }] of state.forkSwitchRooms) {
    const [r, c] = at(pk)
    const junction = cells[r][c]
    if (junction.type !== "room") throw new Error(`[siteAssembler] fork-switch junction ${pk} is not a room`)
    cells[r][c] = {
      ...junction,
      ...room,
      exits: junction.exits?.map(exit => {
        const gateKeyId = gateKeyByDir.get(exit.dir)
        return gateKeyId ? { ...exit, gateKeyId } : exit
      }),
    }
  }
  // A pipe's hole is its node become a room, `dirs` untouched and nothing dressed on it.
  for (const [hole, { cell }] of state.pipeHoles) {
    const [r, c] = at(cell)
    const node = cells[r][c]
    if (node.type !== "corridor") throw new Error(`[siteAssembler] pipe hole ${hole} is not on a corridor`)
    const region = holeRegion(hole)
    cells[r][c] = standOnCorridor(node, { pipeHole: { pipe: hole.slice(0, hole.length - region.length - 1), region } })
  }
  paintMarks(prep, state, cells)
  return grid
}
