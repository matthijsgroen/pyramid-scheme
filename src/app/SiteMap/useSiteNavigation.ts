import { useCallback, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { cellAddress } from "./cellIdentity"
import { storedAtCell } from "@/game/cellAddress"
import { dropLaunchedAt, findPath, getCell } from "@/game/gridNavigation"
import { isSpent as mechanismIsSpent, throwMechanism } from "@/game/mechanismDoors"
import { walkPresses } from "@/game/sequencePlay"
import type { FloorGrid, MechanismRecord, ObstacleKind, RoomCell, SiteConfig, TreasureReward } from "@/game/siteTypes"
import { useTimeout } from "@/support/useTimeout"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { encodeEdge } from "./edgeId"
import { actsOnArrival, staysOpen } from "./nodeKinds"
import { buildOfferContext, clickTargetAt } from "./clickTargets"
import { buildRoomClaims } from "./roomClaims"
import { stairPeerPosition } from "./stairTravel"
import { crossAtOnce, type PlayTraversal, type Traversal } from "./obstacleTraversal"
import type { ResolveOneWayRealisation } from "@/game/oneWayRealisation"
import { resolveOneWayRealisation } from "@/mods/allOneWayRealisations"

type NavigationArgs = {
  journeys: JourneyAPI
  journeyId: string
  siteConfig: SiteConfig
  seed: number
  currentFloor: number
  grid: FloorGrid | null
  explorerPos: readonly [number, number]
  /** A room to open, once the explorer has walked there. */
  onEncounter: (pos: readonly [number, number], freshArrival: boolean) => void
  /** Re-entering a chest whose consumable was left behind when the pack was full. */
  onSkippedConsumable: (reward: TreasureReward, address: string) => void
  /** The explorer has stepped into an exit chamber. */
  onExitReached: () => void
  /** Plays a span the player takes (see obstacleTraversal.ts). Settles when the traversal is over. */
  playTraversal?: PlayTraversal
  /** Says what the realisation a span was bound to declares, namely the prompt its crossing is offered through. */
  resolveOneWay?: ResolveOneWayRealisation
}

/**
 * What the explorer is standing at — what the prompt beside him says, and nothing more.
 *
 * `stairs`, `exit` and `obstacle` take the player somewhere; `room` opens what stands in the room he is
 * already in, whether that is a board or a stall, and moves nobody.
 */
export type ArrivalPromptKind = "room" | "stairs" | "exit" | "obstacle"

export type ArrivalPrompt = {
  kind: ArrivalPromptKind
  /** The cell the prompt hangs over, which is the one the explorer has walked to. */
  at: readonly [number, number]
  /** Whose room this is, so the family can name the prompt itself (FamilyMeta.invitation). Unset on a
   * `room` whose cell names no family, and on the two kinds that are the floor's own. */
  familyId?: string
  /** What the span is, on an `obstacle` prompt, so the span names the prompt itself. */
  obstacleKind?: ObstacleKind
  /** Locale key of the prompt the span's realisation declared. Unset where none is registered, which reads
   * as the generic one-way prompt: a crossing is never taken without one. */
  invitation?: string
  /** Takes what is offered — this does what arriving used to do on its own. */
  take: () => void
}

export type SiteNavigation = {
  onCellClick: (row: number, col: number) => void
  /** The way in the explorer is standing at, or null when he is standing at none. */
  prompt: ArrivalPrompt | null
  /** The explorer is out of sight, in the middle of a span: drawn nowhere until he lands. */
  explorerHidden: boolean
}

// What a tap on the map does: walk there, and — for a room that reopens, a shop, a staircase or the way
// out — offer what is there rather than take it. Walking somewhere and acting on what you find are two
// acts, so the walk ends with a prompt beside the explorer and the player decides.
// Everything "on arrival" waits out the walk (ExplorerDot's own step duration is 120ms).
export const useSiteNavigation = ({
  journeys,
  journeyId,
  siteConfig,
  seed,
  currentFloor,
  grid,
  explorerPos,
  onEncounter,
  onSkippedConsumable,
  onExitReached,
  playTraversal = crossAtOnce,
  resolveOneWay = resolveOneWayRealisation,
}: NavigationArgs): SiteNavigation => {
  const [scheduleArrival] = useTimeout()
  const [prompt, setPrompt] = useState<ArrivalPrompt | null>(null)
  const [explorerHidden, setExplorerHidden] = useState(false)
  // A ref beside the state: a tap in the same tick as taking the span must already see it under way.
  const traversing = useRef(false)

  // Hangs an offer beside the explorer. Taking it clears it first, so nothing offers twice what the
  // player has already taken.
  const offer = useCallback(
    (
      kind: ArrivalPromptKind,
      row: number,
      col: number,
      accept: () => void,
      familyId?: string,
      obstacleKind?: ObstacleKind,
      invitation?: string
    ) =>
      setPrompt({
        kind,
        at: [row, col],
        familyId,
        obstacleKind,
        invitation,
        take: () => {
          setPrompt(null)
          accept()
        },
      }),
    []
  )

  const walkDelay = useCallback(
    (row: number, col: number) =>
      grid ? Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100 : 0,
    [grid, explorerPos]
  )
  // Taking a span: out of sight, the traversal plays, and only then is the player written down at the
  // landing and drawn there. The hide is flushed so the dot unmounts before the traversal starts; batched,
  // a microtask traversal would leave it mounted and it would walk the corridor instead. `finally` means a
  // traversal that fails still ends with the player standing somewhere rather than gone for good.
  const takeSpan = useCallback(
    async (traversal: Traversal) => {
      if (!grid) return
      const [row, col] = traversal.to
      const landing = getCell(grid, row, col)
      if (!landing || landing.type === "empty") return
      traversing.current = true
      flushSync(() => setExplorerHidden(true))
      try {
        await playTraversal(traversal)
      } finally {
        const edgeId = encodeEdge(currentFloor, row, col)
        const address = cellAddress(grid, currentFloor, row, col) ?? edgeId
        journeys.markCellExplored(landing.sectionHash ?? "", edgeId, address)
        journeys.updatePosition(journeyId, address, edgeId)
        setExplorerHidden(false)
        traversing.current = false
      }
    },
    [grid, journeys, journeyId, currentFloor, playTraversal]
  )
  const onCellClick = useCallback(
    (tapRow: number, tapCol: number) => {
      if (!grid || traversing.current) return
      // ADMISSION AND TARGET ARE THE OFFER LAYER'S, asked, not re-derived: a tap the map does not offer
      // moves nobody, and one it offers acts on the cell it resolves to (a straight run's near cell is
      // its far end). Reckoned from where the explorer stands, in play (never the builder's freeWalk).
      const target = clickTargetAt(
        grid,
        buildRoomClaims(grid),
        tapRow,
        tapCol,
        buildOfferContext(grid, { walkFrom: explorerPos, runFrom: explorerPos, runsSuppressed: false, freeWalk: false })
      )
      if (!target) return
      const [row, col] = target
      const cell = getCell(grid, row, col)
      if (!cell || cell.type === "empty") return

      // Leaving where you stood takes the way in you were standing at with you. A tap this guard block
      // turned away moved nobody, so it leaves the standing offer alone.
      setPrompt(null)

      const edgeId = encodeEdge(currentFloor, row, col)
      const sectionHash = cell.sectionHash ?? ""
      // Where this cell sits in its section, which is what every write below files it under. Every cell
      // the assembler draws carries one, so the fallback is for grids built outside the world.
      const address = cellAddress(grid, currentFloor, row, col) ?? edgeId
      const goHere = () => journeys.updatePosition(journeyId, address, edgeId)

      // WALKING ONTO A SEQUENCE TILE WORKS IT: no prompt, no screen, no stop beyond the step. Every tile
      // on the route counts, not only the one tapped, since a tile on the way is stood on. Written now,
      // beside the position and the exploration, so a tile never reads walked for a step the position
      // does not hold.
      for (const press of walkPresses(
        grid,
        currentFloor,
        findPath(grid, explorerPos, [row, col]),
        journeys.getMechanismStates(journeyId)
      ))
        journeys.setMechanismState(press.address, press.state)

      // THROWING IT IS THE WHOLE VISIT (FamilyMeta.actsOnArrival): no screen opens for it, so this is
      // where a lever's position gets written — the same call its old modal made (`setMechanismState`),
      // never a second path to that state. Only the position: a lever is written down by being stood in
      // (the encounter branch below), the way a junction is, so a player who declines to throw it still
      // sees every way out of it.
      const stateOf = (mechanism: MechanismRecord) =>
        storedAtCell(grid, currentFloor, row, col, journeys.getMechanismStates(journeyId)) ?? mechanism.initial
      const throwLever = (target: RoomCell) => {
        if (!target.mechanism) return
        const current = stateOf(target.mechanism)
        const next = throwMechanism(target.mechanism, current)
        if (next !== current) journeys.setMechanismState(address, next)
      }
      // A SPENT MECHANISM (a lit torch) OFFERS NOTHING: with no legal target a throw would be an empty
      // prompt, so the room reads as plain floor the player walks through.
      const isSpent = (target: RoomCell) =>
        !!target.mechanism && mechanismIsSpent(target.mechanism, stateOf(target.mechanism))

      // A portal takes the player somewhere whatever state its cell is in, so both kinds are answered
      // BEFORE the completed-cell block below, which would otherwise just reposition and swallow the
      // click. A stairhead is "completed" from the moment it is arrived on, and the way out is
      // completed as soon as it is written down — see the exit case just below.
      //
      // The walk runs first either way; nothing happens until the explorer has actually got there.
      if (cell.type === "room" && cell.roomType === "portal" && cell.stairId) {
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
        const stairId = cell.stairId
        scheduleArrival(walkDelay(row, col), () =>
          offer("stairs", row, col, () => {
            const peer = stairPeerPosition(journeyId, siteConfig, seed, stairId, currentFloor)
            if (peer) journeys.updatePosition(journeyId, peer.address, encodeEdge(peer.floor, peer.pos[0], peer.pos[1]))
          })
        )
        return
      }

      // The way out: a portal that is neither a staircase nor this floor's own entrance. Written down
      // like any other cell the player walks onto — it is the last slot along its chain, so it carries
      // the section's high-water mark, and without it every corridor past the last room comes back
      // fogged after a re-carve. Written on the way IN, since arriving only ASKS about leaving and the
      // player may say no; a write during the teardown after a yes is the fragile window that made the
      // marker wrong to begin with.
      if (
        cell.type === "room" &&
        cell.roomType === "portal" &&
        (row !== grid.entrancePos[0] || col !== grid.entrancePos[1])
      ) {
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
        scheduleArrival(walkDelay(row, col), () => offer("exit", row, col, onExitReached))
        return
      }

      // A LAUNCH IS WALKED TO AND THEN OFFERED, like a staircase: the span between it and the landing is
      // not ground, so reaching the far side is something the player takes rather than a tap on it. Its
      // words come from what the span is (traversalInvitation), not from here.
      const span = cell.type === "corridor" ? dropLaunchedAt(grid, row, col) : undefined
      if (span) {
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
        const traversal: Traversal = { kind: span.kind, from: span.launch, to: span.landing, dir: span.dir }
        scheduleArrival(walkDelay(row, col), () =>
          offer(
            "obstacle",
            row,
            col,
            () => void takeSpan(traversal),
            undefined,
            span.kind,
            resolveOneWay(span.kind)?.prompt
          )
        )
        return
      }

      // Completed cells just reposition the player, except three that reopen: a room whose family
      // says it stays re-enterable, a shop with unbought stock, and an unfitted consumable.
      if (cell.state === "completed") {
        const alreadyStandingHere = explorerPos[0] === row && explorerPos[1] === col
        goHere()
        // A family that hands over one of several things it holds, one per visit — see `staysOpen`.
        const familyStaysOpen = cell.type === "room" && staysOpen(cell) && !(actsOnArrival(cell) && isSpent(cell))
        const shopHasUnclaimedStock =
          cell.type === "room" &&
          !!cell.stock?.some((item, j) => item && !journeys.getPurchasedShopSlots(journeyId).has(`${address}!${j}`))
        if (familyStaysOpen || shopHasUnclaimedStock) {
          // The family standing here names the prompt; a stall and a switch ask for different things.
          const familyId = cell.type === "room" ? cell.family : undefined
          const roomCell = cell.type === "room" ? cell : null
          scheduleArrival(walkDelay(row, col), () =>
            offer(
              "room",
              row,
              col,
              () =>
                roomCell && actsOnArrival(roomCell)
                  ? throwLever(roomCell)
                  : onEncounter([row, col], !alreadyStandingHere),
              familyId
            )
          )
          return
        }
        if (
          cell.type === "room" &&
          cell.reward?.type === "consumable" &&
          journeys.getSkippedConsumables(journeyId).has(address)
        ) {
          const reward = cell.reward
          scheduleArrival(walkDelay(row, col), () => onSkippedConsumable(reward, address))
        }
        return
      }

      if (cell.type === "corridor") {
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
        return
      }

      if (cell.type !== "room") return

      // A JUNCTION IS WRITTEN DOWN BY STANDING IN IT, whether or not something stands in it too. That
      // write is what shows the player the room and every way out of it, which is what a junction is
      // for — and a way out a switch shut is a wall the reveal stops at, so its bars are seen and
      // nothing behind them is. From here the cell reads completed, so every later visit is answered by
      // the re-entry block above: a switch says its rooms stay re-enterable, and offers its board again.
      //
      // What a fork HOLDS decides only whether a screen opens on arrival: the junction opens none, the
      // encounter standing in it does.
      if (cell.roomType === "fork") {
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
        if (cell.family !== undefined) scheduleArrival(walkDelay(row, col), () => onEncounter([row, col], true))
      } else if (cell.sequenceTile) {
        // A tile is ground: written down by standing on it, as a junction is, and nothing opens on it.
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
      } else if (cell.roomType === "encounter") {
        // A GATE IS WALKED INTO LIKE ANY OTHER ROOM. Its bars are drawn across the FAR side of its own
        // square, on the sill where this rank's stone meets the pocket's (`SiteMapView`), so the square
        // itself is the ground you stand on to work the gate rather than the barrier — which is why
        // this needs no case of its own.
        //
        // A lever is written down by standing in it, as a junction is: nothing else ever marks it, and
        // that write is what lifts the fog past a lever astride the only way through (`walkableFrom`
        // refuses any cell still fogged), whether or not it is thrown. Whether a gate stands is the
        // lever's position alone, so walking past an unthrown one opens nothing.
        if (actsOnArrival(cell)) journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
        if (actsOnArrival(cell)) {
          const familyId = cell.family
          const target = cell
          if (!isSpent(cell))
            scheduleArrival(walkDelay(row, col), () => offer("room", row, col, () => throwLever(target), familyId))
        } else {
          scheduleArrival(walkDelay(row, col), () => onEncounter([row, col], true))
        }
      } else if (cell.roomType === "portal") {
        // Staircases and the way out are answered by the guards above; what is left is this floor's
        // own entrance, which is only ever walked back onto.
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
      }
    },
    [
      grid,
      journeys,
      journeyId,
      currentFloor,
      explorerPos,
      walkDelay,
      scheduleArrival,
      seed,
      siteConfig,
      onEncounter,
      onSkippedConsumable,
      onExitReached,
      offer,
      takeSpan,
      resolveOneWay,
    ]
  )

  return { onCellClick, prompt, explorerHidden }
}
