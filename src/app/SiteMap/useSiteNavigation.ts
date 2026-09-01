import { useCallback } from "react"
import { findPath, getCell } from "@/game/gridNavigation"
import type { FloorGrid, SiteConfig, TreasureReward } from "@/game/siteTypes"
import { useTimeout } from "@/support/useTimeout"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { encodeEdge } from "./useAssembledFloor"
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
  onSkippedConsumable: (reward: TreasureReward, edgeId: string) => void
  /** The explorer has stepped into an exit chamber. */
  onExitReached: () => void
}

export type SiteNavigation = {
  onCellClick: (row: number, col: number) => void
}

// What a tap on the map does: walk there, and act on what is there once the explorer arrives.
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

      const edgeId = encodeEdge(currentFloor, row, col)
      const sectionHash = cell.sectionHash ?? ""

      // A staircase carries the player between floors regardless of the cell's state — handled
      // BEFORE the completed-cell block below. The entrance stairhead you arrive on (and any
      // up-staircase after its first use) is marked "completed", so without this the completed
      // block would just reposition the player and swallow the click, blocking back-travel down a
      // staircase. The walk to the stairhead runs first; the floor only changes once the explorer
      // has actually reached the stairs.
      if (cell.type === "room" && cell.roomType === "portal" && cell.stairId) {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
        const stairId = cell.stairId
        scheduleArrival(walkDelay(row, col), () => {
          const peer = stairPeerPosition(journeyId, siteConfig, seed, stairId, currentFloor)
          if (peer) journeys.updatePosition(journeyId, encodeEdge(peer.floor, peer.pos[0], peer.pos[1]))
        })
        return
      }

      // Completed cells just reposition the player, except a shop with unbought stock or an
      // unfitted consumable, which reopen.
      if (cell.state === "completed") {
        const alreadyStandingHere = explorerPos[0] === row && explorerPos[1] === col
        journeys.updatePosition(journeyId, edgeId)
        const shopHasUnclaimedStock =
          cell.type === "room" &&
          !!cell.stock?.some((item, j) => item && !journeys.getPurchasedShopSlots(journeyId).has(`${edgeId}#${j}`))
        if (shopHasUnclaimedStock) {
          scheduleArrival(walkDelay(row, col), () => onEncounter([row, col], !alreadyStandingHere))
          return
        }
        if (
          cell.type === "room" &&
          cell.reward?.type === "consumable" &&
          journeys.getSkippedConsumables(journeyId).has(edgeId)
        ) {
          const reward = cell.reward
          scheduleArrival(walkDelay(row, col), () => onSkippedConsumable(reward, edgeId))
        }
        return
      }

      if (cell.type === "corridor") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
        return
      }

      if (cell.type !== "room") return

      if (cell.roomType === "fork") {
        journeys.markCellExplored(sectionHash, edgeId)
        journeys.updatePosition(journeyId, edgeId)
      } else if (cell.roomType === "encounter") {
        journeys.updatePosition(journeyId, edgeId)
        scheduleArrival(walkDelay(row, col), () => onEncounter([row, col], true))
      } else if (cell.roomType === "portal") {
        // Staircase portals (with a stairId) are handled by the early teleport guard above; here a
        // portal is either this floor's own entrance (reposition only) or a real exit (leave the site).
        if (row === grid.entrancePos[0] && col === grid.entrancePos[1]) {
          journeys.markCellExplored(sectionHash, edgeId)
          journeys.updatePosition(journeyId, edgeId)
        } else {
          journeys.updatePosition(journeyId, edgeId)
          scheduleArrival(walkDelay(row, col), onExitReached)
        }
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
    ]
  )

  return { onCellClick }
}
