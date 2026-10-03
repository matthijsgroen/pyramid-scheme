// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { journeys as allJourneys } from "@/data/journeys"
import type { Difficulty } from "@/data/difficultyLevels"
import { getFamilyPlugin, registerFamily, resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { assembleFloor } from "@/game/siteAssembler"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FamilyMeta } from "@/game/families/familyMeta"
import type { FloorConfig, FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
import { forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import { andDoorFloor, threeOwnerDoorFloor } from "@/game/testSupport/gateFaceFixtures"
import { boardIndexesForFloor } from "./boardIndexes"
import { SiteMapView } from "./SiteMapView"
import { cellCenter, CELL } from "./mapScale"
import { tileUrl } from "./tileAssets"

const RANKS: Difficulty[] = ["starter", "junior", "expert", "master", "wizard"]
const LEVER_TILES = ["leverBaseBack", "leverArm", "leverBaseFront"]

// Realisations nobody has heard of, registered through the registry the app uses: whatever they declare is
// what the map must draw, and nothing in core may know their names.
const fakeMeta = (id: string, icon: string, drawing?: FamilyMeta["drawing"]): FamilyMeta => ({
  id,
  ownerMod: "test",
  tags: [id],
  icon,
  color: "amber",
  rewardPriority: 0,
  reEnterable: true,
  ...(drawing ? { drawing } : {}),
})
const FAKES = {
  undeclared: fakeMeta("zz-undeclared", "🧪"),
  icon: fakeMeta("zz-icon", "🔔", { marker: "mechanism" }),
  lever: fakeMeta("zz-lever", "🪝", { marker: "handle", art: "lever" }),
}
for (const meta of Object.values(FAKES))
  registerFamily({ meta, generate: () => ({ satisfied: true }), Component: () => null })

const JOURNEY = allJourneys[0].id

const carve = (config: FloorConfig, siteId = JOURNEY): FloorGrid => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(siteId, config, seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    if (result.success) return result.grid
  }
  throw new Error("no seed carved this floor")
}

const bindEveryControl = (config: FloorConfig, encounter: string): FloorConfig => ({
  ...config,
  controls: config.controls!.map(c => ("states" in c && !("control" in c) ? { ...c, encounter } : c)),
})

const JUNIOR_2_LEVEL = 2
const realJunior2Floor = (): FloorGrid => {
  const config = allJourneys.find(j => j.id === "junior_2")!.siteConfigs![JUNIOR_2_LEVEL - 1][0] as FloorConfig
  const result = assembleFloor(
    "junior_2",
    config,
    floorAssemblySeed(persistentInteriorSeed("junior_2"), JUNIOR_2_LEVEL, 0),
    resolveEncounter,
    {
      resolveKeyRequirements: (familyId, ctx) => getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx),
      floorRef: { journeyId: "junior_2", levelIndex: JUNIOR_2_LEVEL - 1, floorIndex: 0 },
      resolveBoardIndex: boardIndexesForFloor("junior_2", JUNIOR_2_LEVEL - 1, 0),
    }
  )
  if (!result.success) throw new Error("junior_2 floor refused")
  return result.grid
}

/** The same floor drawn at a rank: every room at that tier, every cell walked. */
const drawnAt = (grid: FloorGrid, tier: Difficulty): FloorGrid => ({
  ...grid,
  difficulty: tier,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "completed", difficulty: tier }))
  ),
})

const mechanismRooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) =>
      cell.type === "room" && cell.mechanism && !cell.sequenceTile ? [{ r, c, cell: cell as RoomCell }] : []
    )
  )

const markerKind = (container: HTMLElement, r: number, c: number) => {
  const { cx, cy } = cellCenter(r, c)
  const marker = Array.from(container.querySelectorAll<HTMLElement>("[data-marker-cell]")).find(
    el => parseFloat(el.style.left) === cx - CELL / 2 && parseFloat(el.style.top) === cy - CELL / 2
  )
  return {
    kind: marker?.querySelector("[data-shape-kind]")?.getAttribute("data-shape-kind"),
    icon: marker?.querySelector("[data-mechanism-icon]")?.textContent,
  }
}
const hasLeverStack = (container: HTMLElement, r: number, c: number) =>
  container.querySelector(`[data-node-sprite="handle:${r},${c}"]`) !== null

const hasLeverArt = (tier: Difficulty) => LEVER_TILES.every(name => tileUrl(tier, name) !== undefined)

/** What a family declared, with the stated fallback for one that declared nothing. */
const declaredDrawing = (family: string): NonNullable<FamilyMeta["drawing"]> =>
  getFamilyPlugin(family)?.meta.drawing ?? { marker: "mechanism" }

const floors = new Map<string, FloorGrid>()
beforeAll(() => {
  floors.set("a torch and a lever on one door", carve(andDoorFloor()))
  floors.set("two torches and a lever on one door", carve(threeOwnerDoorFloor()))
  floors.set("a fork-switch beside the doubleBack's controls", carve(forkSwitchFloorConfig(), "site-draw-fork"))
  floors.set("the plain switch of junior_2 pyramid 2", realJunior2Floor())
}, 600_000)

describe("a mechanism's room is drawn as its realisation, on real carved floors", () => {
  it("a lever room wears the lever and a torch room the flame, on every floor, at a rank with art and one without", () => {
    expect(hasLeverArt("expert")).toBe(true)
    expect(hasLeverArt("junior")).toBe(false)
    const seen = { torch: 0, handle: 0 }
    for (const [name, grid] of floors)
      for (const tier of ["expert", "junior"] as const)
        for (const { container } of [
          { container: render(<SiteMapView grid={drawnAt(grid, tier)} currentFloor={0} />).container },
        ])
          for (const { r, c, cell } of mechanismRooms(grid)) {
            if (cell.roomType !== "encounter") continue
            const where = `${name} / ${tier} / ${cell.family} at ${r},${c}`
            const drawn = markerKind(container, r, c)
            if (cell.family === "torch") {
              seen.torch++
              expect(drawn, where).toEqual({ kind: "mechanism", icon: "🔥" })
              expect(hasLeverStack(container, r, c), `${where}: no lever stack on a torch`).toBe(false)
            } else if (cell.family === "handle") {
              seen.handle++
              expect(drawn.kind, where).toBe("handle")
              expect(drawn.icon, where).toBeUndefined()
              expect(hasLeverStack(container, r, c), `${where}: lever stack iff the rank has the art`).toBe(
                tier === "expert"
              )
            }
          }
    expect(seen.torch).toBeGreaterThan(0)
    expect(seen.handle).toBeGreaterThan(0)
  })

  it("a junction's switch stays a switch whatever realises it", () => {
    const grid = floors.get("the plain switch of junior_2 pyramid 2")!
    const forks = mechanismRooms(grid).filter(({ cell }) => cell.roomType === "fork")
    expect(forks.length).toBeGreaterThan(0)
    const { container } = render(<SiteMapView grid={drawnAt(grid, "junior")} currentFloor={0} />)
    for (const { r, c } of forks) expect(markerKind(container, r, c).kind).toBe("switch")
  })
})

describe("a realisation with no art at a rank falls back to its declared drawing", () => {
  const realisations = ["handle", "torch", "lightbeamSwitch", ...Object.values(FAKES).map(m => m.id)]
  const carved = new Map<string, FloorGrid>()
  beforeAll(() => {
    for (const encounter of realisations) carved.set(encounter, carve(bindEveryControl(andDoorFloor(), encounter)))
  }, 600_000)

  for (const encounter of realisations)
    for (const tier of RANKS)
      it(`${encounter} at ${tier}: the marker is the declared one, and furniture stands only where painted`, () => {
        const grid = carved.get(encounter)!
        const rooms = mechanismRooms(grid).filter(({ cell }) => cell.roomType === "encounter")
        expect(rooms.length).toBeGreaterThan(0)
        const { container } = render(<SiteMapView grid={drawnAt(grid, tier)} currentFloor={0} />)
        for (const { r, c, cell } of rooms) {
          expect(cell.family).toBe(encounter)
          const declared = declaredDrawing(encounter)
          const drawn = markerKind(container, r, c)
          expect(drawn.kind, `${encounter} at ${tier}`).toBe(declared.marker)
          if (declared.marker === "mechanism") expect(drawn.icon).toBe(getFamilyPlugin(encounter)?.meta.icon)
          expect(hasLeverStack(container, r, c), `${encounter} at ${tier}: furniture`).toBe(
            declared.art === "lever" && hasLeverArt(tier)
          )
        }
      })
})

describe("core draws a realisation it has never heard of", () => {
  it("a family declaring the flame-style marker is drawn by its own icon, with its own tags on the room", () => {
    const grid = carve(bindEveryControl(andDoorFloor(), FAKES.icon.id))
    const rooms = mechanismRooms(grid).filter(({ cell }) => cell.roomType === "encounter")
    expect(rooms.length).toBeGreaterThan(0)
    const { container } = render(<SiteMapView grid={drawnAt(grid, "expert")} currentFloor={0} />)
    for (const { r, c, cell } of rooms) {
      expect(cell.family).toBe(FAKES.icon.id)
      expect(cell.tags).toEqual(FAKES.icon.tags)
      expect(markerKind(container, r, c)).toEqual({ kind: "mechanism", icon: "🔔" })
    }
  })

  it("a family declaring the lever's furniture gets it, so the furniture is the family's to claim", () => {
    const grid = carve(bindEveryControl(andDoorFloor(), FAKES.lever.id))
    const { container } = render(<SiteMapView grid={drawnAt(grid, "expert")} currentFloor={0} />)
    for (const { r, c } of mechanismRooms(grid).filter(({ cell }) => cell.roomType === "encounter"))
      expect(hasLeverStack(container, r, c)).toBe(true)
  })
})
