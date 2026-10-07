import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC, ReactNode } from "react"
import type { Direction } from "@/game/siteTypes"
import { ExplorerFigure, FOOT_LIFT } from "./ExplorerDot"
import { OCCLUDER_FADE } from "./htmlLayers"
import { CELL, PROP_H, WALL_H } from "./mapScale"
import { SqueezeFigure } from "./SqueezeRider"
import { ART_IMAGE_RENDERING, sharedTileUrl, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// The narrow passage is one painting per orientation, shared by every rank (`tiles/default/`): `narrowAcross`, the
// wall's face across a north-south way, and `narrowAlong`, its top across an east-west way. The map draws it in the
// passage's own cell (`nodeSpritesFor`); the explorer waits on the cell either side and squeezes through the crack
// (`SqueezeRider`). Staged on a 3x3 patch of two ranks' floors at map scale, zoomed as a whole: the explorer on both
// sides of each wall (the wall faded while he stands behind it, as the map fades it), then the squeezing poses.

type Explorer = { at: readonly [number, number]; facing: Direction }
const STAGES: { name: string; wall: "narrowAcross" | "narrowAlong"; explorer: Explorer; behind: boolean }[] = [
  {
    name: "across, explorer north (behind)",
    wall: "narrowAcross",
    explorer: { at: [0, 1], facing: "s" },
    behind: true,
  },
  { name: "across, explorer south", wall: "narrowAcross", explorer: { at: [2, 1], facing: "n" }, behind: false },
  { name: "along, explorer west", wall: "narrowAlong", explorer: { at: [1, 0], facing: "e" }, behind: false },
  { name: "along, explorer east", wall: "narrowAlong", explorer: { at: [1, 2], facing: "w" }, behind: false },
]

// One cell's centre on the patch: rows a cell apart under a wall band, as the Plate story lays them.
const centre = ([r, c]: readonly [number, number]) => ({ x: CELL * (c + 0.5), y: WALL_H + CELL * (r + 0.5) })

const Patch: FC<{ tier: "starter" | "expert"; zoom: number; children: ReactNode; caption: string }> = ({
  tier,
  zoom,
  children,
  caption,
}) => {
  const floor = tileUrl(tier, "floor")
  return (
    <figure className="m-0 flex flex-col gap-1">
      <div
        className="relative overflow-hidden"
        style={{
          width: CELL * 3 * zoom,
          height: (WALL_H + CELL * 3) * zoom,
          background: floor ? `url(${floor})` : tierPalette[tier].slab,
          backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
          imageRendering: ART_IMAGE_RENDERING,
        }}
      >
        <div
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: CELL * 3,
            height: WALL_H + CELL * 3,
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {children}
        </div>
      </div>
      <figcaption className="text-[10px] text-white/70">
        {tier}, {zoom}x: {caption}
      </figcaption>
    </figure>
  )
}

const Wall: FC<{ name: string; faded: boolean }> = ({ name, faded }) => {
  const src = sharedTileUrl(name)
  const { x, y } = centre([1, 1])
  return src ? (
    <img
      src={src}
      alt={name}
      className="absolute"
      style={{
        left: x - CELL / 2,
        top: y + CELL / 2 - PROP_H,
        width: CELL,
        height: PROP_H,
        opacity: faded ? OCCLUDER_FADE : 1,
      }}
    />
  ) : null
}

const Standing: FC<Explorer> = ({ at, facing }) => {
  const { x, y } = centre(at)
  return (
    <div className="absolute" style={{ left: x, top: y, width: 0, height: 0 }}>
      <ExplorerFigure facing={facing} />
    </div>
  )
}

// Hung from the wall's cell's foot line, as `SqueezeRider` hangs it mid-crossing.
const Squeezing: FC<{ dir: Direction }> = ({ dir }) => {
  const { x, y } = centre([1, 1])
  return (
    <div className="absolute" style={{ left: x, top: y + CELL / 2 - FOOT_LIFT, width: 0, height: 0 }}>
      <SqueezeFigure dir={dir} />
    </div>
  )
}

const PassageSheet: FC<{ zoom: number }> = ({ zoom }) => (
  <div className="flex h-screen flex-col gap-4 overflow-auto bg-neutral-900 p-6">
    {(["starter", "expert"] as const).map(tier => (
      <div key={tier} className="flex flex-col gap-2">
        <h2 className="m-0 text-sm text-white/80">{tier}: the wall, the explorer either side</h2>
        <div className="flex flex-wrap gap-4">
          {STAGES.map(({ name, wall, explorer, behind }) => (
            <Patch key={name} tier={tier} zoom={zoom} caption={name}>
              {behind && <Standing {...explorer} />}
              <Wall name={wall} faded={behind} />
              {!behind && <Standing {...explorer} />}
            </Patch>
          ))}
        </div>
        <h2 className="m-0 text-sm text-white/80">{tier}: squeezing, each heading, in the wall's cell</h2>
        <div className="flex flex-wrap gap-4">
          {(["n", "s", "e", "w"] as const).map(dir => (
            <Patch key={dir} tier={tier} zoom={zoom} caption={`squeezing ${dir}`}>
              <Wall name={dir === "n" || dir === "s" ? "narrowAcross" : "narrowAlong"} faded={false} />
              <Squeezing dir={dir} />
            </Patch>
          ))}
        </div>
      </div>
    ))}
  </div>
)

const meta = {
  title: "Topology/NarrowPassage",
  component: PassageSheet,
  parameters: { layout: "fullscreen" },
  argTypes: { zoom: { control: { type: "range", min: 1, max: 6, step: 1 } } },
  args: { zoom: 3 },
} satisfies Meta<typeof PassageSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Map scale: one cell is 56 wide, as the renderer draws it. */
export const MapScale: Story = { args: { zoom: 1 } }

/** Three times map scale, to see the paint. */
export const Zoomed: Story = { args: { zoom: 3 } }
