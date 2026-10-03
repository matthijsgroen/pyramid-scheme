import type { SideSection, SiteConfig, SubSection, TreasureReward, MapPieceReward } from "./types"
import type { Difficulty } from "@/data/difficultyLevels"
import type { FamilyMeta } from "@/game/families/familyMeta"
import { FORK_SHAPES, type ForkShape } from "@/game/forkShape"
import { configHash } from "@/game/seeds/configHash"
import { switchFamilies } from "@/game/seeds/enumerateConfigs"
import type { FloorGrid as AssembledFloor } from "@/game/siteTypes"
import { walkFloorLock, describeFloorWalkFailure, deadFloorRegions } from "@/game/floorLockWalk"
import { PYRAMID_JOURNEYS, TOMB_JOURNEYS } from "./data"
import { WORLD_TARGETS } from "./worldSpec"
import { capabilitiesFor, type SiteCapabilities } from "./capabilities"

const KNOWN_JOURNEY_IDS = new Set([...PYRAMID_JOURNEYS.map(j => j.id), ...TOMB_JOURNEYS.map(j => j.id)])

// A post-build check over the whole grown world, contributed by a mod (e.g. the shop economy
// guard) and injected into buildConfigs. Drops out with its mod, so core names no mod-specific
// balance rule.
//
// `reachableRewards` is every reward a player can ever get to, from placeFragments' final
// permissive walk — a mod counts its own kind in there to hold its collection's target count. A
// validator that only reads the authored configs ignores the second argument.
export type WorldValidator = (
  configs: Record<string, SiteConfig[]>,
  reachableRewards: readonly TreasureReward[]
) => void

// Throws if: a non-last floor is set to exit, a mapPiece references an unknown journey ID,
// the total mapPiece count drifts from WORLD_TARGETS, or the count of placed gating-currency
// rewards drifts from what the registered currencies expect. Both the expected total and the
// "is this a gating-currency reward" predicate are injected (built from the registered
// currencies by the caller) — core names no specific currency, and a currency that leaves the
// registry drops its expectation and its rewards together, so toggle-off never trips a false
// "expected N, got 0". Omit both to skip the currency-reward check. Mod-owned capped currencies
// (mosaic) aren't checked here — placeFragments' phase-3 pass hard-fails if it can't fully place
// them, so core needs no per-mod count (docs/mods/TARGET.md rule 2).
export const validateRewardCounts = (
  configs: Record<string, SiteConfig[]>,
  expectedCurrencyRewards?: number,
  isCurrencyReward: (r: TreasureReward) => boolean = () => false
): void => {
  let mapPieces = 0
  let currencyRewards = 0
  const unknownTombIds: string[] = []
  const hiddenGating: string[] = []

  // A hidden corridor is a discovery-gated OPTIONAL pocket (keys-and-locks-solver.md §E /
  // collection-and-detector-design.md §7.3): structurally reachable but never guaranteed
  // reachable, so a progression-gating currency the solver must guarantee (a map piece, or a
  // registered gating currency like a hieroglyph fragment) may NEVER sit there — placing one
  // would soft-lock a player who can't reveal the corridor. placeFragments excludes hidden slots
  // from the gating worklist; this is the post-build proof that nothing slipped through.
  const isGating = (r: TreasureReward) => r.type === "mapPiece" || isCurrencyReward(r)

  const checkReward = (r: TreasureReward | undefined, hidden: boolean, where: string) => {
    if (!r) return
    if (r.type === "mapPiece") {
      const mp = r as MapPieceReward
      mapPieces++
      if (!KNOWN_JOURNEY_IDS.has(mp.tombId)) unknownTombIds.push(mp.tombId)
    }
    if (isCurrencyReward(r)) currencyRewards++
    if (hidden && isGating(r)) hiddenGating.push(`${where}: ${r.type}`)
  }
  // Count both node reward fields: a path-end `endReward` AND every entry of a node's `rewards[]`
  // array (a shop's stock lands here). One uniform sweep, mirroring what the detector scans.
  const checkRewards = (rs: (TreasureReward | undefined)[] | undefined, hidden: boolean, where: string) =>
    rs?.forEach(r => checkReward(r, hidden, where))

  for (const [siteId, siteConfigs] of Object.entries(configs)) {
    for (const floors of siteConfigs) {
      for (let fi = 0; fi < floors.length; fi++) {
        const floor = floors[fi]
        const isLast = fi === floors.length - 1
        if (isLast && floor.exitOrStaircase !== "exit")
          throw new Error(
            `[worldSpec] Site "${siteId}" last floor has exitOrStaircase="${floor.exitOrStaircase}", expected "exit"`
          )
        checkReward(floor.mainEndReward, false, `${siteId}#${fi} main`)
        checkRewards(floor.rewards, false, `${siteId}#${fi} main`)
        for (const s of floor.sideSections) {
          const secHidden = !!s.hidden
          checkReward(s.endReward, secHidden, `${siteId}#${fi} side`)
          checkRewards(s.rewards, secHidden, `${siteId}#${fi} side`)
          for (const sub of s.sideSections ?? []) {
            const subHidden = secHidden || !!sub.hidden
            checkReward(sub.endReward, subHidden, `${siteId}#${fi} sub`)
            checkRewards(sub.rewards, subHidden, `${siteId}#${fi} sub`)
          }
        }
      }
    }
  }

  if (hiddenGating.length > 0)
    throw new Error(
      `[worldSpec] ${hiddenGating.length} gating-currency reward(s) placed in hidden (discovery-gated) ` +
        `pockets — a hidden corridor is optional loot only and may never hold a required currency ` +
        `(collection-and-detector-design.md §7.3): ${hiddenGating.slice(0, 8).join("; ")}` +
        (hiddenGating.length > 8 ? ` …(+${hiddenGating.length - 8} more)` : "")
    )
  if (unknownTombIds.length > 0)
    throw new Error(
      `[worldSpec] mapPiece rewards reference unknown journey IDs: ${[...new Set(unknownTombIds)].join(", ")}`
    )
  if (mapPieces !== WORLD_TARGETS.mapPieceRewards)
    throw new Error(`[worldSpec] Expected ${WORLD_TARGETS.mapPieceRewards} map pieces, got ${mapPieces}`)
  if (expectedCurrencyRewards !== undefined && currencyRewards !== expectedCurrencyRewards)
    throw new Error(`[worldSpec] Expected ${expectedCurrencyRewards} gating-currency rewards, got ${currencyRewards}`)
}

// NOTE: the old `validateDiscovery` post-build check (secondary-tomb discovery + ward-key
// ordering) was retired in §E — the worklist reachability model (src/worldGen/reachability.ts +
// placeFragments.ts) already subsumes and strengthens it: secondary-tomb enterability is
// count-aware there (a tomb's own `piecesRequired` map pieces) vs this check's existence-only BFS,
// and ward-key ordering is enforced structurally by the fine per-floor BFS + settleHarvest + the
// winnability sweep (placeFragments.ts, which hard-fails if any lock stays blocking). See
// docs/game-design/keys-and-locks-solver.md.

// Chests are authored, not arranged by the generator, so a chest that ends up holding nothing is an
// authoring slip the author has to settle: either give it loot or take the chest out. Nothing here
// touches the world — it reports, and the caller decides how loudly.
//
// Judged on the ASSEMBLED floor rather than on the spec, because a spec cannot tell you. A treasure
// end with no `endReward` is exactly how an author offers a section as a floor-key host: the
// assembler hands it a key, and the room the player opens is not empty at all. Only the assembled
// room knows the difference.
export type EmptyChest = { journeyId: string; levelNr: number; floorIndex: number; row: number; col: number }

export const findEmptyChests = (
  configs: Record<string, SiteConfig[]>,
  assembleFloorAt: (
    journeyId: string,
    floor: SiteConfig[number],
    levelNr: number,
    floorIndex: number
  ) => AssembledFloor | null
): EmptyChest[] => {
  const empties: EmptyChest[] = []
  for (const [journeyId, sites] of Object.entries(configs)) {
    // A site outside the loot economy grows no reward slot at all (capabilities.ts), so every chest
    // on it stands empty by design and there is no authoring slip to report.
    if (capabilitiesFor(journeyId)?.emitFragmentSlots === false) continue
    sites.forEach((site, siteIdx) => {
      site.forEach((floor, floorIndex) => {
        const grid = assembleFloorAt(journeyId, floor, siteIdx + 1, floorIndex)
        if (!grid) return
        grid.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell.type !== "room" || cell.roomType !== "encounter") return
            if (!cell.tags?.includes("treasure") && !cell.tags?.includes("shop")) return
            // A key host holds a key rather than a reward, and a shop holds stock.
            if (cell.reward || cell.keyColor || cell.keyColors?.length) return
            if ((cell.stock ?? []).some(Boolean)) return
            empties.push({ journeyId, levelNr: siteIdx + 1, floorIndex, row: r, col: c })
          })
        )
      })
    })
  }
  return empties
}

/**
 * A switch a site requiring baked boards authors at a shape and tier no seed list covers.
 *
 * The fallback that would otherwise cover it — searching on the player's device — is exactly what
 * pre-seeding exists to stop, and it covers silently. So a site whose capabilities say its boards are
 * baked (capabilities.ts's requireBakedBoards) makes this an authoring error with a floor named on it,
 * and the playtest journey, which stands the mechanic at tiers nobody has baked yet, is excused by the
 * same seam rather than by its id.
 *
 * All three shapes are owed, because which one a junction gets is the carve's choice rather than the
 * author's.
 */
export type UnbakedSwitchBoard = {
  journeyId: string
  levelNr: number
  floorIndex: number
  familyId: string
  difficulty: Difficulty
  forkShape: ForkShape
}

export const findUnbakedSwitchBoards = (
  configs: Record<string, SiteConfig[]>,
  families: FamilyMeta[],
  seeds: Record<string, number[]>,
  /** Injected so a caller can ask what a site WOULD owe under other capabilities — which is the only
   * way to see that an exemption is excusing something rather than nothing. */
  capabilities: (siteId: string) => SiteCapabilities | undefined = capabilitiesFor
): UnbakedSwitchBoard[] => {
  const byId = new Map(families.map(family => [family.id, family]))
  const missing: UnbakedSwitchBoard[] = []
  for (const [journeyId, sites] of Object.entries(configs)) {
    if (capabilities(journeyId)?.requireBakedBoards === false) continue
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        for (const familyId of switchFamilies(floor).families) {
          const seedable = byId.get(familyId)?.seedable
          if (!seedable) continue
          for (const forkShape of FORK_SHAPES) {
            const hash = configHash(seedable.resolveOptions({ difficulty: floor.difficulty, forkShape }))
            if (seeds[hash]?.length) continue
            missing.push({
              journeyId,
              levelNr: siteIdx + 1,
              floorIndex,
              familyId,
              difficulty: floor.difficulty,
              forkShape,
            })
          }
        }
      })
    )
  }
  return missing
}

/**
 * A one-way drop authored on a floor whose site may not stand one.
 *
 * The map draws the passage from both sides, so until it is drawn as a drop a player meeting one reads
 * an ordinary corridor and falls. A playtest floor is excused by its capabilities
 * (capabilities.ts's standOneWayDrops), never by its id — and a site nothing grants it to fails the
 * build with its floor named rather than leaning on the author remembering.
 */
export type UndrawnOneWay = { journeyId: string; levelNr: number; floorIndex: number; from: string; to: string }

export const findUndrawnOneWays = (
  configs: Record<string, SiteConfig[]>,
  /** Injected so a caller can ask what a site WOULD owe under other capabilities — which is the only
   * way to see that an exemption is excusing something rather than nothing. */
  capabilities: (siteId: string) => SiteCapabilities | undefined = capabilitiesFor
): UndrawnOneWay[] => {
  const found: UndrawnOneWay[] = []
  for (const [journeyId, sites] of Object.entries(configs)) {
    // Granted, never merely "not refused": a site nothing knows about is a site nothing cleared.
    if (capabilities(journeyId)?.standOneWayDrops) continue
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        for (const oneWay of floor.oneWays ?? [])
          found.push({ journeyId, levelNr: siteIdx + 1, floorIndex, from: oneWay.from, to: oneWay.to })
      })
    )
  }
  return found
}

/**
 * A floor standing a handle the site it belongs to may not hold one on.
 *
 * Same line as the one-way drop above, and drawn for the same reason: the lever's room and the doors
 * it owns are carved but not painted, so a player meeting one reads a room with nothing in it and a
 * door nothing on the floor holds the key to. A playtest floor is excused by its capabilities
 * (capabilities.ts's standHandles), never by its id.
 */
export type UndrawnHandle = {
  journeyId: string
  levelNr: number
  floorIndex: number
  in: string
  left: string[]
  right: string[]
}

export const findUndrawnHandles = (
  configs: Record<string, SiteConfig[]>,
  capabilities: (siteId: string) => SiteCapabilities | undefined = capabilitiesFor
): UndrawnHandle[] => {
  const found: UndrawnHandle[] = []
  for (const [journeyId, sites] of Object.entries(configs)) {
    if (capabilities(journeyId)?.standHandles) continue
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        for (const handle of floor.handles ?? [])
          found.push({
            journeyId,
            levelNr: siteIdx + 1,
            floorIndex,
            in: handle.in,
            left: handle.left,
            right: handle.right,
          })
      })
    )
  }
  return found
}

/**
 * A floor whose lock the walk refuses: unsolvable, stranding, or not reading at all.
 *
 * Asked of the assembled floor rather than of the spec, because a lock is made of the gates a carve
 * placed. It is asked AFTER the build rather than inside the assembler's retry loop on purpose: a
 * reason there would quietly re-carve the floor and the author would never hear which arrangement was
 * refused.
 */
export type FloorRef = { journeyId: string; levelNr: number; floorIndex: number }
export type StrandingLock = FloorRef & { problem: string }

const refKey = (ref: FloorRef) => `${ref.journeyId}#${ref.levelNr}#${ref.floorIndex}`

/** `walked` names every floor that handed the walk a lock at all — see `findUnwalkedLocks`. */
export const findStrandingLocks = (
  configs: Record<string, SiteConfig[]>,
  assembleFloorAt: (
    journeyId: string,
    floor: SiteConfig[number],
    levelNr: number,
    floorIndex: number
  ) => AssembledFloor | null
): { walked: FloorRef[]; stranding: StrandingLock[] } => {
  const stranding: StrandingLock[] = []
  const walked: FloorRef[] = []
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        const grid = assembleFloorAt(journeyId, floor, siteIdx + 1, floorIndex)
        if (!grid) return
        const result = walkFloorLock(grid)
        if (!result) return
        const ref = { journeyId, levelNr: siteIdx + 1, floorIndex }
        walked.push(ref)
        if (result.sound) return
        stranding.push({ ...ref, problem: describeFloorWalkFailure(result.failure) })
      })
    )
  return { walked, stranding }
}

export type DeadRegionsReport = FloorRef & { regions: string[] }

/**
 * Floors whose lock walks sound and still leave a region no reachable state stands in — loot a player
 * can never collect, because two on-floor mechanisms deadlock each other rather than because anyone is
 * stranded. `walkLock` does not see this: it calls a floor sound once the way out stays reachable,
 * whether or not every region does (`deadRegions`, game/lockWalk.ts).
 *
 * Walked over the same lock `findStrandingLocks` derives from the same cached carve
 * (`assembleFloorAt`), so a floor is never assembled twice for the two sweeps.
 */
export const findDeadRegions = (
  configs: Record<string, SiteConfig[]>,
  assembleFloorAt: (
    journeyId: string,
    floor: SiteConfig[number],
    levelNr: number,
    floorIndex: number
  ) => AssembledFloor | null
): DeadRegionsReport[] => {
  const found: DeadRegionsReport[] = []
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        const grid = assembleFloorAt(journeyId, floor, siteIdx + 1, floorIndex)
        if (!grid) return
        const regions = deadFloorRegions(grid)
        if (regions.length > 0) found.push({ journeyId, levelNr: siteIdx + 1, floorIndex, regions })
      })
    )
  return found
}

/**
 * The floors whose authoring guarantees a mechanism on every carve, so the lock sweep owes each of
 * them a walk.
 *
 * Read off `switches.min` rather than `max`: a junction `forks` reserves plus a switch that must fill
 * one stands a mechanism every time, and so does a lever and a control, while `max` is only what the carve may go up
 * to. `floorLock` returns nothing for a floor with no mechanism cell on it, so this list — not the
 * floor count — is what the sweep's reach is measured against.
 */
export const floorsOwingALock = (configs: Record<string, SiteConfig[]>): FloorRef[] => {
  const owed: FloorRef[] = []
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        const junctions = (floor.forks ?? []).reduce((sum, fork) => sum + ("in" in fork ? 0 : fork.count), 0)
        if (
          Math.min(floor.switches?.min ?? 0, junctions) > 0 ||
          (floor.handles?.length ?? 0) > 0 ||
          (floor.controls?.length ?? 0) > 0 ||
          (floor.locks?.length ?? 0) > 0
        )
          owed.push({ journeyId, levelNr: siteIdx + 1, floorIndex })
      })
    )
  return owed
}

/**
 * Floors that author a mechanism the lock sweep never walked.
 *
 * Almost every floor hands `findStrandingLocks` nothing, because almost no floor stands a switch or a
 * lever — so a sweep that reports no failure says nothing on its own about how much of the world it
 * reached. Asking only whether it reached NOTHING leaves the regression that takes the sweep from
 * eight floors to one passing green, so the whole list the authoring owes is what gets compared.
 */
export const findUnwalkedLocks = (configs: Record<string, SiteConfig[]>, walked: readonly FloorRef[]): FloorRef[] => {
  const reached = new Set(walked.map(refKey))
  return floorsOwingALock(configs).filter(ref => !reached.has(refKey(ref)))
}

export type StairPairing = { stairId: string; uses: FloorRef[] }

/**
 * Stair ids the world wires anything but exactly twice.
 *
 * A stair id is a PAIRING: one end hosts the stairs (a floor's main-path way up, or a section that
 * ends in a stairhead) and one end arrives on them (the next floor's `entrance`), and
 * `grid.staircases[id]` is what carries the player between the two. So two uses is the only sound
 * count. Three means two staircases answer to one id and the walk lands on whichever floor is
 * reached first — a silent teleport to the wrong floor. One means a stairhead nothing arrives from,
 * or a floor whose way in nothing hosts, which strands it.
 *
 * Checked over the authored spec rather than the carve: the ids are minted while the world is grown
 * (game/stairAddress.ts), so a new authoring pattern that lets two of them collide is caught by the
 * build that introduced it instead of by a player walking into the wrong floor.
 */
export const findMispairedStairs = (
  configs: Record<string, SiteConfig[]>
): { paired: number; mispaired: StairPairing[] } => {
  const uses = new Map<string, FloorRef[]>()
  const note = (link: unknown, ref: FloorRef) => {
    if (typeof link !== "object" || link === null || !("stairId" in link)) return
    const id = (link as { stairId: string }).stairId
    if (!uses.has(id)) uses.set(id, [])
    uses.get(id)!.push(ref)
  }
  // Every authored level, not only the two the carve builds: a stairhead nested deeper still bakes
  // its id into the world, so it still has to pair with exactly one arrival.
  const walkSections = (sections: readonly SubSection[], ref: FloorRef): void => {
    for (const section of sections) {
      note(section.end, ref)
      walkSections((section as SideSection).sideSections ?? [], ref)
    }
  }
  for (const [journeyId, sites] of Object.entries(configs))
    sites.forEach((site, siteIdx) =>
      site.forEach((floor, floorIndex) => {
        const ref = { journeyId, levelNr: siteIdx + 1, floorIndex }
        note(floor.entrance, ref)
        note(floor.exitOrStaircase, ref)
        walkSections(floor.sideSections, ref)
      })
    )
  return {
    // Printed on every run: a sweep that reports no failure is otherwise indistinguishable from one
    // that never found a staircase to check.
    paired: [...uses.values()].filter(refs => refs.length === 2).length,
    mispaired: [...uses].filter(([, refs]) => refs.length !== 2).map(([stairId, refs]) => ({ stairId, uses: refs })),
  }
}
