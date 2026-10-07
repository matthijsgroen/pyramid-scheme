import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { cellAddress } from "@/game/cellAddress"
import { revealAll } from "@/game/gridNavigation"
import { assembleFloor } from "@/game/siteAssembler"
import type { Direction, FloorGrid } from "@/game/siteTypes"
import { soloTorchDoorFloor } from "@/game/testSupport/gateFaceFixtures"
import { journeys } from "@/data/journeys"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { DIR_MOVES } from "./corridorRuns"
import { CELL, PROP_H, WALL_H } from "./mapScale"
import { SiteMapView } from "./SiteMapView"
import { ART_IMAGE_RENDERING, sharedTileUrl, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"
import "@/mods/registerModApps"

// The standing torch is one painting, shared by every rank (`tiles/default/`), unlit and lit. The sheet
// stages the two tiles by hand on two ranks' floors, the explorer beside them for scale, because a
// generation that looks fine at 2000px can still turn to mud at 56 (`PropSheet.stories.tsx`'s `Chamber`,
// as `Lever.stories.tsx` reuses it). `OnTheFloor` is the map itself: a carved floor with one torch, drawn
// unlit and lit by `SiteMapView`, where the lit one lays its pool on the floor and is cut with no shadow.
// The two tiles share one frame, so swapping them on a cell must change only the flame.

const EXPLORER_W = 40
const EXPLORER_H = 70
const CHAMBER_W = CELL * 4
const CHAMBER_H = CELL * 2

const TorchStage: FC<{ tier: "starter" | "expert"; zoom: number }> = ({ tier, zoom }) => {
  const palette = tierPalette[tier]
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  const explorer = tileUrl("starter", "explorer-s-1")
  const props = [
    { name: "torchUnlit", src: sharedTileUrl("torchUnlit") },
    { name: "torchLit", src: sharedTileUrl("torchLit") },
  ]
  const floorLine = (WALL_H + CELL) * zoom
  const artW = CELL * zoom
  const artH = PROP_H * zoom

  return (
    <figure className="m-0 flex flex-col gap-1">
      <div
        className="relative overflow-hidden"
        style={{ width: CHAMBER_W * zoom, height: (WALL_H + CHAMBER_H) * zoom, background: palette.slab }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: WALL_H * zoom,
            background: face ? `url(${face})` : palette.wall,
            backgroundSize: `${CELL * 8 * zoom}px ${WALL_H * zoom}px`,
            imageRendering: ART_IMAGE_RENDERING,
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: CHAMBER_H * zoom,
            background: floor ? `url(${floor})` : palette.slab,
            backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
            imageRendering: ART_IMAGE_RENDERING,
          }}
        />
        {props.map(
          ({ name, src }, i) =>
            src && (
              <img
                key={name}
                src={src}
                alt={name}
                className="absolute"
                style={{
                  left: CELL * (0.5 + i * 1.2) * zoom,
                  top: floorLine - artH,
                  width: artW,
                  height: artH,
                  imageRendering: ART_IMAGE_RENDERING,
                }}
              />
            )
        )}
        {explorer && (
          <img
            src={explorer}
            alt="explorer"
            className="absolute"
            style={{
              left: CELL * 3 * zoom,
              top: floorLine - EXPLORER_H * zoom,
              width: EXPLORER_W * zoom,
              height: EXPLORER_H * zoom,
              imageRendering: ART_IMAGE_RENDERING,
            }}
          />
        )}
      </div>
      <figcaption className="text-[10px] text-white/70">
        {tier} floor, {zoom}x: torch unlit, torch lit, explorer
      </figcaption>
    </figure>
  )
}

const TorchSheet: FC<{ zoom: number }> = ({ zoom }) => (
  <div className="flex h-screen flex-col gap-4 overflow-auto bg-neutral-900 p-6">
    <h2 className="m-0 text-sm text-white/80">standing torch, unlit and lit</h2>
    <div className="flex flex-wrap gap-6">
      <TorchStage tier="starter" zoom={zoom} />
      <TorchStage tier="expert" zoom={zoom} />
    </div>
  </div>
)

const meta = {
  title: "Topology/Torch",
  component: TorchSheet,
  parameters: { layout: "fullscreen" },
  argTypes: { zoom: { control: { type: "range", min: 1, max: 6, step: 1 } } },
  args: { zoom: 3 },
} satisfies Meta<typeof TorchSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Map scale: one cell is 56 wide, as the renderer draws it. */
export const MapScale: Story = { args: { zoom: 1 } }

/** Three times map scale, to see the paint. */
export const Zoomed: Story = { args: { zoom: 3 } }

const JOURNEY = journeys[0].id

/** The first seed that carves the one-torch floor, every cell lit, so only the torch's own state differs. */
const torchFloor = (() => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, soloTorchDoorFloor(), seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    if (!result.success) continue
    const grid = revealAll(result.grid)
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.cells[r][c]
        if (cell.type !== "room" || cell.family !== "torch") continue
        // The explorer two steps out of the torch's room by its first way out, near enough for scale and far
        // enough that the pool he carries does not fall on the torch's own.
        const [dir] = [...cell.dirs] as Direction[]
        const [dr, dc] = DIR_MOVES[dir]
        const two = grid.cells[r + 2 * dr]?.[c + 2 * dc]
        const steps = two && two.type !== "empty" ? 2 : 1
        return { grid, at: [r, c] as const, beside: [r + steps * dr, c + steps * dc] as [number, number] }
      }
  }
  throw new Error("no seed carved the torch floor")
})()

const statesFor = (grid: FloorGrid, lit: boolean) => {
  const address = cellAddress(grid, 0, torchFloor.at[0], torchFloor.at[1])
  return new Map(address ? [[address, lit ? "lit" : "unlit"]] : [])
}

const TorchOnFloor: FC = () => (
  <div className="flex h-screen gap-2 bg-neutral-900 p-2">
    {[false, true].map(lit => (
      <figure key={String(lit)} className="m-0 flex flex-1 flex-col gap-1">
        <SiteMapView
          grid={torchFloor.grid}
          currentFloor={0}
          explorerPos={torchFloor.beside}
          mechanismStates={statesFor(torchFloor.grid, lit)}
          className="h-136 w-full"
        />
        <figcaption className="text-[10px] text-white/70">{lit ? "lit" : "unlit"}</figcaption>
      </figure>
    ))}
  </div>
)

/** The map itself: one carved floor, the torch unlit and lit, the explorer beside it. */
export const OnTheFloor: Story = { render: () => <TorchOnFloor /> }
