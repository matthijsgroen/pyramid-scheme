import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import type { DecorationKind, WallDecorationKind } from "@/game/siteTypes"
import { CELL, WALL_H } from "./mapScale"
import { ART_IMAGE_RENDERING, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// Every prop of a rank, staged the way the renderer stages one: standing on that rank's floor, its top
// overlapping that rank's wall band, at map scale. The brief's rule is that a prop is judged against a
// wall and never against a swatch — a generation looks fine at 2000px and turns to mud at 56, and the
// only way to know which is to put it where it will live.
//
// A generated floor cannot do this job: RankSeams draws whatever its pools happen to author, so there is
// no way to ask it for the one object you just imported.

const PROPS: DecorationKind[] = [
  "statue",
  "shrine",
  "sarcophagus",
  "jarRack",
  "offeringTable",
  "basin",
  "shelf",
  "chestProp",
  "lamp",
  "hanging",
  "pillar",
  "brazier",
  "rubble",
  "pit",
  "mat",
  "crystal",
]

const WALL_ITEMS: WallDecorationKind[] = [
  "niche",
  "stela",
  "sconce",
  "veil",
  "wallShrine",
  "tallyBoard",
  "mask",
  "starShaft",
]

const PROP_H = CELL + WALL_H
/** The explorer's slot, from importTile's SLOTS — he is the ruler everything else is measured against. */
const EXPLORER_W = 40
const EXPLORER_H = 70

/** Three cells across and two deep, so an object is seen with floor around it rather than cropped to
 * its own cell — and with the explorer beside it, which is the only thing that says whether a prop is
 * the right SIZE rather than merely the right shape. */
const CHAMBER_W = CELL * 3
const CHAMBER_H = CELL * 2

const Chamber: FC<{ tier: Difficulty; name: string; wallItem?: boolean; zoom: number }> = ({
  tier,
  name,
  wallItem = false,
  zoom,
}) => {
  const palette = tierPalette[tier]
  const art = tileUrl(tier, name)
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  const explorer = tileUrl("starter", "explorer-s-1")
  // Where feet and bases land: one cell up from the bottom, so there is floor in FRONT of the object
  // as well as behind it.
  const floorLine = (WALL_H + CELL) * zoom
  const propLeft = (CHAMBER_W * zoom) / 2 - CELL * zoom
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <div
        className="relative overflow-hidden"
        style={{ width: CHAMBER_W * zoom, height: (WALL_H + CHAMBER_H) * zoom, background: palette.slab }}
      >
        {/* the wall band the prop's headroom overlaps, and which a wall item is painted onto */}
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
        {art &&
          (wallItem ? (
            <img
              src={art}
              alt={name}
              className="absolute"
              style={{
                left: propLeft,
                top: 0,
                width: CELL * zoom,
                height: WALL_H * zoom,
                imageRendering: ART_IMAGE_RENDERING,
              }}
            />
          ) : (
            // Bottom-anchored on the floor line and CELL + WALL_H tall, so the headroom rises over the band.
            <img
              src={art}
              alt={name}
              className="absolute"
              style={{
                left: propLeft,
                top: floorLine - PROP_H * zoom,
                width: CELL * zoom,
                height: PROP_H * zoom,
                imageRendering: ART_IMAGE_RENDERING,
              }}
            />
          ))}
        {explorer && (
          <img
            src={explorer}
            alt="explorer"
            className="absolute"
            style={{
              left: propLeft + (CELL + CELL / 2) * zoom,
              top: floorLine - EXPLORER_H * zoom,
              width: EXPLORER_W * zoom,
              height: EXPLORER_H * zoom,
              imageRendering: ART_IMAGE_RENDERING,
            }}
          />
        )}
      </div>
      <figcaption className="text-[10px] text-white/60">
        {name}
        {art ? "" : " (none)"}
      </figcaption>
    </figure>
  )
}

const Sheet: FC<{ tier: Difficulty; zoom: number }> = ({ tier, zoom }) => (
  // h-screen + overflow-auto, because at zoom 6 the sheet is wider and taller than the canvas and a
  // fullscreen story clips instead of scrolling.
  <div className="flex h-screen flex-col gap-6 overflow-auto bg-neutral-900 p-6">
    <h2 className="m-0 text-sm text-white/80">{tier} — chamber props</h2>
    <div className="flex flex-wrap gap-4">
      {PROPS.map(kind => (
        <Chamber key={kind} tier={tier} name={kind} zoom={zoom} />
      ))}
    </div>
    <h2 className="m-0 text-sm text-white/80">{tier} — wall items</h2>
    <div className="flex flex-wrap gap-4">
      {WALL_ITEMS.map(kind => (
        <Chamber key={kind} tier={tier} name={kind} wallItem zoom={zoom} />
      ))}
    </div>
  </div>
)

const meta = {
  component: Sheet,
  parameters: { layout: "fullscreen" },
  argTypes: {
    tier: { control: "select", options: ["starter", "junior", "expert", "master", "wizard"] },
    zoom: { control: { type: "range", min: 1, max: 6, step: 1 } },
  },
  args: { tier: "starter", zoom: 3 },
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

/** At map scale, which is the only size that decides whether a prop reads. */
export const AtMapScale: Story = { args: { zoom: 1 } }

/** Three times up: still the same pixels, just legible enough to see WHY something fails. */
export const Merchant: Story = { args: { tier: "starter", zoom: 3 } }

export const Nobleman: Story = { args: { tier: "junior", zoom: 3 } }
export const Priest: Story = { args: { tier: "expert", zoom: 3 } }
export const Pharaoh: Story = { args: { tier: "master", zoom: 3 } }
export const Gods: Story = { args: { tier: "wizard", zoom: 3 } }
