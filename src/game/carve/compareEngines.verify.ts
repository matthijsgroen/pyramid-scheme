import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor as assembleWithSiteAssembler } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { AssemblerResult, FloorConfig, FloorGrid, GridCell } from "@/game/siteTypes"
import { resolveEncounterMeta, resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { assembleFloor as assembleWithPasses } from "./assembleFloor"

// A REPORT, NOT A GATE: it carves every shipped floor with siteAssembler.ts and with the pass engine and
// says, per floor, `identical` or what differs, so each difference is read and explained. It never fails
// on a difference. The floors are generatedWorldConfigs at their runtime seeds — the world `allFloors()`
// walks, read here because the domain may not reach the app. The report is the test's stdout, which only
// `yarn verify-content src/game/carve/compareEngines --reporter=verbose` prints for a passing test.

type Floor = { label: string; journeyId: string; levelIndex: number; floorIndex: number; config: FloorConfig }

const floors = (): Floor[] =>
  Object.entries(generatedWorldConfigs).flatMap(([journeyId, levels]) =>
    levels.flatMap((floorsOfLevel, levelIndex) =>
      floorsOfLevel.map((config, floorIndex) => ({
        label: `${journeyId}#${levelIndex + 1}#${floorIndex}`,
        journeyId,
        levelIndex,
        floorIndex,
        config,
      }))
    )
  )

const seedOf = (floor: Floor) =>
  floorAssemblySeed(persistentInteriorSeed(floor.journeyId), floor.levelIndex + 1, floor.floorIndex)

const resolversOf = (floor: Floor) => ({
  resolveKeyRequirements,
  floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
})

const cellsOf = (grid: FloorGrid) => grid.cells.flatMap((row, r) => row.map((cell, c) => ({ at: `${r},${c}`, cell })))

const roomOf = (cell: GridCell) =>
  cell.type === "room" ? `${cell.roomType}/${cell.family ?? "-"}/${cell.pathIndex ?? "-"}` : undefined

/** Each per-cell view the report compares, named as it prints. */
const VIEWS: Record<string, (cell: GridCell) => string | undefined> = {
  route: cell => (cell.type !== "empty" && cell.sectionAddress === "main" ? "main" : undefined),
  rooms: roomOf,
  gates: cell => (cell.type === "room" ? cell.requiredKeyId : undefined),
  marks: cell => (cell.type === "room" && cell.mark ? `${cell.mark.color}:${cell.mark.glyph}` : undefined),
  dirs: cell => (cell.type === "empty" ? undefined : [...cell.dirs].sort().join("")),
}

/** Where two grids differ, view by view, naming the first few cells of each. */
const gridDifferences = (before: FloorGrid, after: FloorGrid): string[] => {
  if (before.rows !== after.rows || before.cols !== after.cols)
    return [`grid ${before.rows}x${before.cols} → ${after.rows}x${after.cols}`]
  const ends = [
    ...(String(before.entrancePos) !== String(after.entrancePos)
      ? [`entrance ${before.entrancePos} → ${after.entrancePos}`]
      : []),
    ...(String(before.exitPos) !== String(after.exitPos) ? [`exit ${before.exitPos} → ${after.exitPos}`] : []),
  ]
  const beforeCells = cellsOf(before)
  const afterCells = cellsOf(after)
  const views = Object.entries(VIEWS).flatMap(([name, view]) => {
    const differing = beforeCells.flatMap(({ at, cell }, i) => {
      const was = view(cell)
      const now = view(afterCells[i].cell)
      return was === now ? [] : [`${at} ${was ?? "∅"} → ${now ?? "∅"}`]
    })
    if (differing.length === 0) return []
    return [
      `${name}: ${differing.length} cells (${differing.slice(0, 3).join(", ")}${differing.length > 3 ? ", …" : ""})`,
    ]
  })
  return [...ends, ...views]
}

/** Where two carves of one floor differ: outcome, attempt, refusal reasons, then the grids. */
const resultDifferences = (before: AssemblerResult, after: AssemblerResult): string[] => {
  if (before.success && after.success)
    return [
      ...(before.attempt !== after.attempt ? [`attempt ${before.attempt} → ${after.attempt}`] : []),
      ...gridDifferences(before.grid, after.grid),
    ]
  if (!before.success && !after.success)
    return JSON.stringify(before.reasons) === JSON.stringify(after.reasons)
      ? []
      : [`reasons ${JSON.stringify(before.reasons)} → ${JSON.stringify(after.reasons)}`]
  return [
    before.success
      ? `carved at attempt ${before.attempt} → refused ${JSON.stringify(after.success ? [] : after.reasons)}`
      : `refused ${JSON.stringify(before.reasons)} → carved at attempt ${after.success ? after.attempt : -1}`,
  ]
}

describe("the pass engine against siteAssembler.ts", () => {
  it("reports every shipped floor: identical, or what differs", () => {
    const all = floors()
    const counts = { identical: 0, differ: 0, refusedBeforeCarving: 0 }
    const lines = all.map(floor => {
      const old = assembleWithSiteAssembler(floor.journeyId, floor.config, seedOf(floor), resolveEncounterMeta, {
        ...resolversOf(floor),
      })
      const next = assembleWithPasses(floor.journeyId, floor.config, seedOf(floor), resolveEncounterMeta, {
        ...resolversOf(floor),
      })
      const differences = resultDifferences(old, next)
      if (differences.length === 0) counts.identical++
      else counts.differ++
      // Every refusal the attempts reach ends in `layoutNotFound`; one without it came from before the first.
      if (!next.success && !next.reasons.some(reason => reason.type === "layoutNotFound")) counts.refusedBeforeCarving++
      return `${floor.label}: ${differences.length === 0 ? "identical" : differences.join("; ")}`
    })
    const summary =
      `${counts.identical} identical, ${counts.differ} differ of ${all.length} floors; ` +
      `the pass engine refused ${counts.refusedBeforeCarving} before carving`
    console.log([...lines, summary].join("\n"))
    expect(lines).toHaveLength(all.length)
  })
})
