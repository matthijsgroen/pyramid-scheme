import { hashString } from "@/support/hashString"
import type { FloorConfig, SideSection, StairLink, SubSection } from "../siteTypes"

// A section hash is a run's handle on a stretch of floor: saved explored cells and found hidden
// corridors are filed under it, and a cell whose hash no longer matches is dropped as stale. So it
// must cover everything the LAYOUT depends on, and nothing else — a hash that moves for a
// non-structural reason throws away progress on a floor that did not change.
//
// Stable across: loot changes, key reassignment, decorations, themes, and re-authoring WHICH
// encounter a room serves. Changes on: puzzle count, difficulty, exit type, gate presence, hidden
// flag, whether the section is isolated from leftover maze edges, and the floor's own carve knobs.
//
// Both hashes carry the floor's carve knobs (`packing`, `corridorStraightness`), because those
// re-carve the WHOLE floor — every side section along with the main path. Without them a floor could
// be re-shaped end to end while every hash held still, and a run would restore its explored cells
// onto a maze that no longer exists. See docs/game-design/world-spec-stability.md.
//
// `isolated` is why an encounter is not in here directly: the carve reads a section's encounter for
// exactly one layout decision — cutting a trap off from stray tree edges — so the hash records that
// decision, not the encounter. Swapping a section to another puzzle family is then invisible to a save.
//
// `legacySectionHash` is the same hash without that substitution, carried on every cell so a save written
// under the old scheme keeps matching its own cells. Delete both once no live save predates it.
// Which way a stair runs is drawn, never carved, so a stair link's `goes` stays out of every hash.
const carvedLink = <T extends string | StairLink>(link: T): T | StairLink =>
  typeof link === "object" ? { stairId: link.stairId } : link

export const computeLegacyMainSectionHash = (config: FloorConfig): string =>
  String(
    hashString(
      JSON.stringify({
        pathPuzzles: config.pathPuzzles,
        difficulty: config.difficulty,
        exitOrStaircase: carvedLink(config.exitOrStaircase),
      })
    )
  )

export const computeLegacySideSectionHash = (
  section: SideSection | SubSection,
  idx: number,
  parentIdx?: number
): string =>
  String(
    hashString(
      JSON.stringify({
        idx,
        parentIdx,
        pathPuzzles: section.pathPuzzles,
        difficulty: section.difficulty,
        end: carvedLink(section.end),
        hidden: section.hidden,
        sealed: section.sealed,
        encounter: section.encounter,
        gateType: section.gate?.type,
        wideByIndex: section.wideByIndex,
      })
    )
  )

// The floor-wide inputs to the carve itself: change any and every cell on the floor moves. `outsideLock` moves a side
// path off its lock corridor into a branch and `corridorsTakeTwo` lets a corridor carry two, which re-lays the lock
// and re-carves the floor around it.
const carveShape = (config: FloorConfig) => ({
  packing: config.packing,
  corridorStraightness: config.corridorStraightness,
  outsideLock: config.outsideLock,
  corridorsTakeTwo: config.corridorsTakeTwo,
  plan: config.plan,
  spread: config.spread,
  corridorWidth: config.corridorWidth,
})

export const computeMainSectionHash = (config: FloorConfig, isolated: boolean): string =>
  String(
    hashString(
      JSON.stringify({
        pathPuzzles: config.pathPuzzles,
        difficulty: config.difficulty,
        exitOrStaircase: carvedLink(config.exitOrStaircase),
        isolated,
        ...carveShape(config),
        wideByIndex: config.wideByIndex,
      })
    )
  )

export const computeSideSectionHash = (
  section: SideSection | SubSection,
  idx: number,
  isolated: boolean,
  floor: FloorConfig,
  parentIdx?: number
): string =>
  String(
    hashString(
      JSON.stringify({
        idx,
        parentIdx,
        ...carveShape(floor),
        pathPuzzles: section.pathPuzzles,
        difficulty: section.difficulty,
        end: carvedLink(section.end),
        hidden: section.hidden,
        isolated,
        gateType: section.gate?.type,
      })
    )
  )
