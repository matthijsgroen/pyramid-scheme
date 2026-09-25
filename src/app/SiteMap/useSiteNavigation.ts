import { useCallback, useState } from "react"
import { cellAddress } from "./cellIdentity"
import { findPath, getCell } from "@/game/gridNavigation"
import type { FloorGrid, SiteConfig, TreasureReward } from "@/game/siteTypes"
import { useTimeout } from "@/support/useTimeout"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { encodeEdge } from "./edgeId"
import { staysOpen } from "./nodeKinds"
import { stairPeerPosition } from "./stairTravel"

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
}

/** Which way in the explorer is standing at — what the prompt beside him says, and nothing more. */
export type ArrivalPromptKind = "room" | "shop" | "stairs" | "exit"

export type ArrivalPrompt = {
  kind: ArrivalPromptKind
  /** The cell the prompt hangs over, which is the one the explorer has walked to. */
  at: readonly [number, number]
  /** Go in — this does what arriving used to do on its own. */
  take: () => void
}

export type SiteNavigation = {
  onCellClick: (row: number, col: number) => void
  /** The way in the explorer is standing at, or null when he is standing at none. */
  prompt: ArrivalPrompt | null
}

// What a tap on the map does: walk there, and — for a room already finished, a shop, a staircase or the
// way out — offer the way in rather than take it. Walking somewhere and going in are two acts, so the
// walk ends with a prompt beside the explorer and the player decides.
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
}: NavigationArgs): SiteNavigation => {
  const [scheduleArrival] = useTimeout()
  const [prompt, setPrompt] = useState<ArrivalPrompt | null>(null)

  // Hangs a way in beside the explorer. Taking it clears it first, so nothing offers a door the player
  // has already gone through.
  const offer = useCallback(
    (kind: ArrivalPromptKind, row: number, col: number, goIn: () => void) =>
      setPrompt({
        kind,
        at: [row, col],
        take: () => {
          setPrompt(null)
          goIn()
        },
      }),
    []
  )

  const walkDelay = useCallback(
    (row: number, col: number) =>
      grid ? Math.max(0, findPath(grid, explorerPos, [row, col]).length - 1) * 120 + 100 : 0,
    [grid, explorerPos]
  )
  const onCellClick = useCallback(
    (row: number, col: number) => {
      if (!grid) return
      const cell = getCell(grid, row, col)
      if (!cell || cell.type === "empty") return
      if (cell.state !== "reachable" && cell.state !== "completed") return
      // A tap means "walk there", so somewhere with no walkable route is not somewhere a tap can send
      // the player: moving anyway is a teleport, and can shut them inside a pocket they cannot leave.
      if (findPath(grid, explorerPos, [row, col]).length === 0) return

      // Leaving where you stood takes the way in you were standing at with you. A tap this guard block
      // turned away moved nobody, so it leaves the standing offer alone.
      setPrompt(null)

      const edgeId = encodeEdge(currentFloor, row, col)
      const sectionHash = cell.sectionHash ?? ""
      // Where this cell sits in its section, which is what every write below files it under. Every cell
      // the assembler draws carries one, so the fallback is for grids built outside the world.
      const address = cellAddress(grid, currentFloor, row, col) ?? edgeId
      const goHere = () => journeys.updatePosition(journeyId, address, edgeId)

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

      // Completed cells just reposition the player, except three that reopen: a room whose family
      // says it stays re-enterable, a shop with unbought stock, and an unfitted consumable.
      if (cell.state === "completed") {
        const alreadyStandingHere = explorerPos[0] === row && explorerPos[1] === col
        goHere()
        // A family that hands over one of several things it holds, one per visit — see `staysOpen`.
        const familyStaysOpen = cell.type === "room" && staysOpen(cell)
        const shopHasUnclaimedStock =
          cell.type === "room" &&
          !!cell.stock?.some((item, j) => item && !journeys.getPurchasedShopSlots(journeyId).has(`${address}!${j}`))
        if (familyStaysOpen || shopHasUnclaimedStock) {
          const kind = familyStaysOpen ? "room" : "shop"
          scheduleArrival(walkDelay(row, col), () =>
            offer(kind, row, col, () => onEncounter([row, col], !alreadyStandingHere))
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
      } else if (cell.roomType === "encounter") {
        // A GATE IS WALKED INTO LIKE ANY OTHER ROOM. Its bars are drawn across the FAR side of its own
        // square, on the sill where this rank's stone meets the pocket's (`SiteMapView`), so the square
        // itself is the ground you stand on to work the gate rather than the barrier — which is why
        // this needs no case of its own.
        goHere()
        scheduleArrival(walkDelay(row, col), () => onEncounter([row, col], true))
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
    ]
  )

  return { onCellClick, prompt }
}
