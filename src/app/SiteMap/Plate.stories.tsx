import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import { CELL, PROP_H, WALL_H } from "./mapScale"
import { ART_IMAGE_RENDERING, sharedTileUrl, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// The pressure plate is one painting, shared by every rank (`tiles/default/`), in three looks: raised
// (`plate`), pressed (`plateDown`, the explorer standing on it) and pressed with a limestone block on it
// (`plateStone`). Nothing in the app draws it yet; this story stages it the way the renderer will, on two
// ranks' floors, the explorer beside it for scale, because a generation that looks fine at 2000px can
// still turn to mud at 56 (`PropSheet.stories.tsx`'s `Chamber`, as `Lever.stories.tsx` reuses it).
// The tiles share one frame, so swapping them on a cell must change only the slab and the stone.

const EXPLORER_W = 40
const EXPLORER_H = 70
const CHAMBER_W = CELL * 5
const CHAMBER_H = CELL * 2

const PlateStage: FC<{ tier: "starter" | "expert"; zoom: number }> = ({ tier, zoom }) => {
  const palette = tierPalette[tier]
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  const explorer = tileUrl("starter", "explorer-s-1")
  const props = [
    { name: "plate", src: sharedTileUrl("plate") },
    { name: "plateDown", src: sharedTileUrl("plateDown") },
    { name: "plateStone", src: sharedTileUrl("plateStone") },
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
              left: CELL * 4.2 * zoom,
              top: floorLine - EXPLORER_H * zoom,
              width: EXPLORER_W * zoom,
              height: EXPLORER_H * zoom,
              imageRendering: ART_IMAGE_RENDERING,
            }}
          />
        )}
      </div>
      <figcaption className="text-[10px] text-white/70">
        {tier} floor, {zoom}x: plate (raised), plateDown (pressed), plateStone (pressed, with stone), explorer
      </figcaption>
    </figure>
  )
}

const PlateSheet: FC<{ zoom: number }> = ({ zoom }) => (
  <div className="flex h-screen flex-col gap-4 overflow-auto bg-neutral-900 p-6">
    <h2 className="m-0 text-sm text-white/80">pressure plate: raised, pressed, pressed with a stone</h2>
    <div className="flex flex-wrap gap-6">
      <PlateStage tier="starter" zoom={zoom} />
      <PlateStage tier="expert" zoom={zoom} />
    </div>
  </div>
)

const meta = {
  title: "Topology/Plate",
  component: PlateSheet,
  parameters: { layout: "fullscreen" },
  argTypes: { zoom: { control: { type: "range", min: 1, max: 6, step: 1 } } },
  args: { zoom: 3 },
} satisfies Meta<typeof PlateSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Map scale: one cell is 56 wide, as the renderer draws it. */
export const MapScale: Story = { args: { zoom: 1 } }

/** Three times map scale, to see the paint. */
export const Zoomed: Story = { args: { zoom: 3 } }
