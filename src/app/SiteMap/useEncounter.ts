import { useCallback, useEffect, useMemo, useState } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { FloorGrid, KeyColor, TreasureReward } from "@/game/siteTypes"
import { getCell } from "@/game/gridNavigation"
import { hashString } from "@/support/hashString"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { getFamilyPlugin, type FamilyContext, type FamilyPlugin } from "@/app/families/familyRegistry"
import { encodeEdge } from "./useAssembledFloor"

type EncounterArgs = {
  journeys: JourneyAPI
  journeyId: string
  currentFloor: number
  difficulty: Difficulty
  grid: FloorGrid | null
  ownedKeys: ReadonlySet<string>
  /** Called with whatever loot the solved room held — the offer itself is the reward topic's job. */
  onReward: (reward: TreasureReward, edgeId: string, keyColors?: readonly KeyColor[]) => void
}

export type Encounter = {
  /** The plugin that renders this room's puzzle; null while no encounter is open. */
  family: FamilyPlugin | null
  ctx: FamilyContext | null
  puzzle: unknown
  /** True while a room is open, even if its family is missing. */
  isOpen: boolean
  open: (pos: readonly [number, number], freshArrival: boolean) => void
  solved: () => void
  cancel: () => void
}

// The room the player currently has open: which family renders it, the context that family reads,
// its generated puzzle, and what core does when it is solved — mark the room explored and hand its
// reward on. Identical for every family; core names none of them.
export const useEncounter = ({
  journeys,
  journeyId,
  currentFloor,
  difficulty,
  grid,
  ownedKeys,
  onReward,
}: EncounterArgs): Encounter => {
  // Which room's encounter is open, plus whether this is a fresh arrival vs. a re-click while
  // already standing here (shop's stock-reset rule cares).
  const [active, setActive] = useState<{ pos: readonly [number, number]; freshArrival: boolean } | null>(null)

  const family = useMemo(() => {
    if (!active || !grid) return null
    const cell = getCell(grid, active.pos[0], active.pos[1])
    const familyId = cell?.type === "room" ? cell.family : undefined
    return familyId ? (getFamilyPlugin(familyId) ?? null) : null
  }, [active, grid])

  const ctx = useMemo((): FamilyContext | null => {
    if (!active || !grid) return null
    const [row, col] = active.pos
    const cell = getCell(grid, row, col)
    const sectionHash = cell && cell.type !== "empty" ? (cell.sectionHash ?? "") : ""
    const edgeId = encodeEdge(currentFloor, row, col)
    return {
      journeyId,
      edgeId,
      sectionHash,
      freshArrival: active.freshArrival,
      difficulty,
      reward: cell?.type === "room" ? cell.reward : undefined,
      stock: cell?.type === "room" ? cell.stock : undefined,
      pathIndex: cell?.type === "room" ? cell.pathIndex : undefined,
      encounterArgs: cell?.type === "room" ? cell.encounterArgs : undefined,
      // The skin this room was authored to wear (docs/instructions/puzzle-screens.md §2). Core carries the
      // name and reads nothing into it; unset means every family draws its default.
      theme: cell?.type === "room" ? cell.theme : undefined,
      role: cell?.type === "room" ? cell.role : undefined,
      requiredKeyId: cell?.type === "room" ? cell.requiredKeyId : undefined,
      gateVariant: cell?.type === "room" ? cell.gateVariant : undefined,
      keyColor: cell?.type === "room" ? cell.keyColor : undefined,
      ownedKeys,
    }
  }, [active, grid, currentFloor, journeyId, difficulty, ownedKeys])

  const puzzle = useMemo(() => {
    if (!family || !ctx) return null
    return family.generate(hashString(journeyId + ctx.edgeId), ctx)
  }, [family, ctx, journeyId])

  // The one thing core does on any solved encounter, for every family alike: mark the room explored
  // and offer its reward, if it has one.
  const resolve = useCallback(
    (pos: readonly [number, number]) => {
      if (!grid) return
      const [row, col] = pos
      const edgeId = encodeEdge(currentFloor, row, col)
      const cell = getCell(grid, row, col)
      const sectionHash = cell && cell.type !== "empty" ? (cell.sectionHash ?? "") : ""
      journeys.markCellExplored(sectionHash, edgeId)
      setActive(null)

      const reward = cell?.type === "room" ? cell.reward : undefined
      if (!reward) return
      // A key-host chest wears the colour(s) of the doors its key opens; carry that into the popup so
      // the reveal says WHICH key this was, not just "a key". Gated on the reward actually BEING a
      // key (as floorKeyRing does): today only key hosts carry a colour, but a coloured chest holding
      // something else would otherwise be announced as a key it never contained.
      const keyColors =
        reward.type === "tombKey" && cell?.type === "room"
          ? (cell.keyColors ?? (cell.keyColor ? [cell.keyColor] : undefined))
          : undefined
      onReward(reward, edgeId, keyColors)
    },
    [grid, journeys, currentFloor, onReward]
  )

  const open = useCallback(
    (pos: readonly [number, number], freshArrival: boolean) => setActive({ pos, freshArrival }),
    []
  )
  const cancel = useCallback(() => setActive(null), [])
  const solved = useCallback(() => {
    if (active) resolve(active.pos)
  }, [active, resolve])

  // Family-absence pass-through: a room whose family isn't registered — e.g. a gating mod toggled
  // off with its encounter still authored — has no puzzle to render. Resolve it immediately (mark
  // explored, offer whatever generic loot the slot got) so the player isn't stuck on a dead room.
  useEffect(() => {
    if (active && family == null) resolve(active.pos)
  }, [active, family, resolve])

  return { family, ctx, puzzle, isOpen: active !== null, open, solved, cancel }
}
