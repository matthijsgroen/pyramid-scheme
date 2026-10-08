import { StrictMode, useEffect, useMemo, useState, type FC } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { cellAddress } from "@/game/cellAddress"
import { concealShutGround } from "@/game/concealment"
import { revealAll } from "@/game/gridNavigation"
import { regionBarrierCovers } from "@/game/regionBarrierCover"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { onRouteSluiceFloor } from "@/game/testSupport/regionBarrierFixtures"
import { journeys } from "@/data/journeys"
import { DIR_MOVES } from "./corridorRuns"
import { cellCenter, mapHeight, mapWidth } from "./mapScale"
import { SiteMapView } from "./SiteMapView"
import { assemblePlayedFloor, useAssembledFloor } from "./useAssembledFloor"
import { REGION_COVER_FADE_OUT_MS } from "./useRegionBarrierCovers"
import "@/mods/registerModApps"

// The water or sand over a shut region barrier, on a carved floor (`onRouteSluiceFloor`: a hall on the route
// between the pump room and the way out). The floor goes through `useAssembledFloor` with the sluice's position, then
// everything is revealed and the ground behind shut barriers concealed, as `SiteMapScreen` draws it. The explorer
// stands at the hall's edge: the cover starts at the blockage door, fades in over that cell and lies full beyond.
// Draining throws the sluice open and back in a loop, so the cover fades away and returns.

const JOURNEY = journeys[0].id
const SHUT_MS = 1800
const OPEN_MS = REGION_COVER_FADE_OUT_MS + 1200
const FRAME_W = 640
const FRAME_H = 440

type Realisation = "water" | "sand"

type Stage = {
  config: FloorConfig
  seed: number
  sluice: string
  shut: string
  open: string
  explorer: readonly [number, number]
  door: readonly [number, number]
}

const stageFor = (realisation: Realisation): Stage => {
  const config = { ...onRouteSluiceFloor(), regionBarrierRealisation: realisation }
  for (let seed = 0; seed < 120; seed++) {
    const result = assemblePlayedFloor(JOURNEY, config, seed, 0)
    if (!result.success) continue
    const base = result.grid
    const at = base.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.mechanism ? [[r, c] as const] : []))
    )[0]
    const cell = base.cells[at[0]][at[1]]
    const address = cellAddress(base, 0, at[0], at[1])
    if (cell.type !== "room" || !cell.mechanism || !address) continue
    const { initial, states } = cell.mechanism
    const seen = concealShutGround(revealAll(base), base.entrancePos)
    const edge = regionBarrierCovers(seen)
      .flatMap(cover => cover.cells)
      .find(({ fadeFrom }) => fadeFrom && fadeFrom.length > 0)
    if (!edge?.fadeFrom) continue
    const [dr, dc] = DIR_MOVES[edge.fadeFrom[0]]
    return {
      config,
      seed,
      sluice: address,
      shut: initial,
      open: states.find(state => state !== initial)!,
      explorer: [edge.at[0] + dr, edge.at[1] + dc],
      door: edge.at,
    }
  }
  throw new Error(`no seed carved the sluice floor with ${realisation}`)
}

const STAGES: Record<Realisation, Stage> = { water: stageFor("water"), sand: stageFor("sand") }

/** The map at `zoom`, centred on the blockage door, in a fixed window: the map is laid out at its own size and
 * scaled as a whole, the way `useMapZoom` scales it. */
const Window: FC<{ grid: FloorGrid; stage: Stage; states: ReadonlyMap<string, string>; zoom: number }> = ({
  grid,
  stage,
  states,
  zoom,
}) => {
  const { cx, cy } = cellCenter(stage.door[0], stage.door[1])
  return (
    <figure className="m-0 flex flex-col gap-1">
      <div className="relative overflow-hidden bg-black" style={{ width: FRAME_W, height: FRAME_H }}>
        <div
          className="absolute top-0 left-0"
          style={{
            width: mapWidth(grid.cols),
            height: mapHeight(grid.rows),
            transform: `translate(${FRAME_W / 2 - cx * zoom}px, ${FRAME_H / 2 - cy * zoom}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <SiteMapView
            grid={grid}
            currentFloor={0}
            explorerPos={stage.explorer}
            mechanismStates={states}
            className="size-full"
          />
        </div>
      </div>
      <figcaption className="text-[10px] text-white/70">{zoom}x</figcaption>
    </figure>
  )
}

const RegionBarrier: FC<{ realisation: Realisation; drains: boolean }> = ({ realisation, drains }) => {
  const stage = STAGES[realisation]
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!drains) return
    let timer: ReturnType<typeof setTimeout>
    const step = (next: boolean) => {
      setOpen(next)
      timer = setTimeout(() => step(!next), next ? OPEN_MS : SHUT_MS)
    }
    step(false)
    return () => clearTimeout(timer)
  }, [drains])
  const states = useMemo(
    () => new Map([[stage.sluice, open ? stage.open : stage.shut]]) as ReadonlyMap<string, string>,
    [stage, open]
  )
  const { grid } = useAssembledFloor(JOURNEY, stage.config, stage.seed, 0, {}, null, 0, undefined, undefined, states)
  const drawn = useMemo(() => (grid ? concealShutGround(revealAll(grid), stage.explorer) : null), [grid, stage])
  if (!drawn) return <p className="text-red-300">the floor does not assemble</p>
  return (
    <div className="flex h-screen flex-col gap-2 overflow-auto bg-neutral-900 p-4 text-sm text-white/80">
      <span data-barrier-state={open ? "open" : "shut"}>
        {realisation}, seed {stage.seed}: {open ? "sluice thrown, the cover fades away" : "shut"}
      </span>
      <div className="flex flex-wrap gap-4">
        {[1, 3].map(zoom => (
          <Window key={zoom} grid={drawn} stage={stage} states={states} zoom={zoom} />
        ))}
      </div>
    </div>
  )
}

const meta = {
  title: "Topology/Region barrier",
  component: RegionBarrier,
  parameters: { layout: "fullscreen" },
  // The app renders in StrictMode; so does the barrier here, or a mount-time cleanup would go unseen.
  decorators: [
    Story => (
      <StrictMode>
        <Story />
      </StrictMode>
    ),
  ],
} satisfies Meta<typeof RegionBarrier>

export default meta
type Story = StoryObj<typeof meta>

export const Water: Story = { args: { realisation: "water", drains: false } }
export const Sand: Story = { args: { realisation: "sand", drains: false } }
export const WaterDraining: Story = { args: { realisation: "water", drains: true } }
export const SandDraining: Story = { args: { realisation: "sand", drains: true } }
