import { useCallback } from "react"
import { cellAddress } from "./cellIdentity"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import { findPath, getCell } from "@/game/gridNavigation"
import type { FloorGrid, SiteConfig, TreasureReward } from "@/game/siteTypes"
import { useTimeout } from "@/support/useTimeout"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { encodeEdge } from "./edgeId"
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
        scheduleArrival(walkDelay(row, col), () => {
          const peer = stairPeerPosition(journeyId, siteConfig, seed, stairId, currentFloor)
          if (peer) journeys.updatePosition(journeyId, peer.address, encodeEdge(peer.floor, peer.pos[0], peer.pos[1]))
        })
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
        scheduleArrival(walkDelay(row, col), onExitReached)
        return
      }

      // Completed cells just reposition the player, except three that reopen: a room whose family
      // says it stays re-enterable, a shop with unbought stock, and an unfitted consumable.
      if (cell.state === "completed") {
        const alreadyStandingHere = explorerPos[0] === row && explorerPos[1] === col
        goHere()
        // A family that hands over one of several things it holds, one per visit (FamilyMeta.reEnterable).
        // Read off the registry, so core learns which rooms those are without naming any of them — and an
        // unregistered family answers "no", which is what a toggled-off mod's leftover rooms need.
        const familyStaysOpen =
          cell.type === "room" && !!cell.family && !!getFamilyPlugin(cell.family)?.meta.reEnterable
        const shopHasUnclaimedStock =
          cell.type === "room" &&
          !!cell.stock?.some((item, j) => item && !journeys.getPurchasedShopSlots(journeyId).has(`${address}!${j}`))
        if (familyStaysOpen || shopHasUnclaimedStock) {
          scheduleArrival(walkDelay(row, col), () => onEncounter([row, col], !alreadyStandingHere))
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

      // WHAT A ROOM HOLDS DECIDES THIS, not what type it is: a switch is a junction with an encounter
      // standing in it, and the junction opens no screen while the encounter does.
      if (cell.roomType === "fork" && cell.family === undefined) {
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
      } else if (cell.roomType === "encounter" || cell.roomType === "fork") {
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
    ]
  )

  return { onCellClick }
}
