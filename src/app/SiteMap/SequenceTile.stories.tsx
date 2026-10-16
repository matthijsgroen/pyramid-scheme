import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import type { TileStatus } from "@/game/sequence"
import { CELL, COL_PITCH, ROW_PITCH, WALL_H } from "./mapScale"
import { ART_IMAGE_RENDERING, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"
import { NodeShape } from "./nodeShapes"

// The sequence tile as the map draws it: the shared painting with the glyph on its top, one row per state
// (dark unwalked, light blue in order, red out of order) and a few glyphs per row, on a rank's floor with
// the explorer beside them for scale. Each tile is placed the way `MarkerCell` places a marker, at map
// scale, and the whole floor is zoomed as one.

const STATUSES: TileStatus[] = ["unwalked", "inOrder", "outOfOrder"]
const GLYPHS = [0x13080, 0x130c0, 0x1309d, 0x13171]
const EXPLORER_W = 40
const EXPLORER_H = 70

const Stage: FC<{ tier: "starter" | "expert"; zoom: number }> = ({ tier, zoom }) => {
  const palette = tierPalette[tier]
  const floor = tileUrl(tier, "floor")
  const explorer = tileUrl("starter", "explorer-s-1")
  const width = COL_PITCH * (GLYPHS.length + 1) + CELL / 2
  const height = ROW_PITCH * STATUSES.length
  const centre = (col: number, row: number) => ({
    cx: CELL / 2 + col * COL_PITCH,
    cy: WALL_H + CELL / 2 + row * ROW_PITCH,
  })
  return (
    <figure className="m-0 flex flex-col gap-1">
      <div
        className="relative overflow-hidden"
        style={{
          width: width * zoom,
          height: height * zoom,
          background: floor ? `url(${floor})` : palette.slab,
          backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
          imageRendering: ART_IMAGE_RENDERING,
        }}
      >
        <div
          className="absolute"
          style={{ left: 0, top: 0, width, height, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
        >
          {STATUSES.map((status, row) =>
            GLYPHS.map((glyph, col) => {
              const { cx, cy } = centre(col, row)
              return (
                <svg
                  key={`${status}:${glyph}`}
                  aria-hidden="true"
                  viewBox={`${-CELL / 2} ${-CELL / 2} ${CELL} ${CELL}`}
                  style={{
                    position: "absolute",
                    left: cx - CELL / 2,
                    top: cy - CELL / 2,
                    width: CELL,
                    height: CELL,
                    overflow: "visible",
                  }}
                >
                  <NodeShape type="plate" state="reachable" plate={{ glyph, status }} />
                </svg>
              )
            })
          )}
          {explorer &&
            STATUSES.map((status, row) => {
              const { cx, cy } = centre(GLYPHS.length, row)
              return (
                <img
                  key={status}
                  src={explorer}
                  alt="explorer"
                  className="absolute"
                  style={{
                    left: cx - EXPLORER_W / 2,
                    top: cy + CELL / 2 - EXPLORER_H,
                    width: EXPLORER_W,
                    height: EXPLORER_H,
                    imageRendering: ART_IMAGE_RENDERING,
                  }}
                />
              )
            })}
        </div>
      </div>
      <figcaption className="text-[10px] text-white/70">
        {tier} floor, {zoom}x: rows unwalked, inOrder, outOfOrder; explorer for scale
      </figcaption>
    </figure>
  )
}

const meta = {
  title: "Topology/Sequence tile",
  parameters: { layout: "padded", backgrounds: { default: "dark" } },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OnTheFloor: Story = {
  render: () => (
    <div className="flex flex-col gap-4 bg-black p-4">
      <Stage tier="expert" zoom={2} />
      <Stage tier="starter" zoom={2} />
    </div>
  ),
}
