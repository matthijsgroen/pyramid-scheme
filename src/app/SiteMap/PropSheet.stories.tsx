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

/** One chamber cell: the rank's wall band above, its floor below, the object standing on the floor line. */
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
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <div
        className="relative"
        style={{ width: CELL * zoom, height: (CELL + WALL_H) * zoom, background: palette.slab }}
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
            height: CELL * zoom,
            background: floor ? `url(${floor})` : palette.slab,
            backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
            imageRendering: ART_IMAGE_RENDERING,
          }}
        />
        {art && (
          <img
            src={art}
            alt={name}
            className="absolute"
            // A prop is bottom-anchored on the floor line and CELL + WALL_H tall, so its headroom rises
            // over the wall band. A wall item is painted into the band itself.
            style={
              wallItem
                ? { left: 0, top: 0, width: CELL * zoom, height: WALL_H * zoom, imageRendering: ART_IMAGE_RENDERING }
                : { left: 0, top: 0, width: CELL * zoom, height: PROP_H * zoom, imageRendering: ART_IMAGE_RENDERING }
            }
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
  <div className="flex flex-col gap-6 bg-neutral-900 p-6">
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
