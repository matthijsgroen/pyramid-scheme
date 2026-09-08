import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { CELL, WALL_H } from "./mapScale"
import { authoredKindsFor } from "./authoredKinds"
import { DRIFT_KINDS } from "./floorScatter"
import { ART_IMAGE_RENDERING, sharedTileUrl, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// Every prop of a rank, staged the way the renderer stages one: standing on that rank's floor, its top
// overlapping that rank's wall band, at map scale. The brief's rule is that a prop is judged against a
// wall and never against a swatch — a generation looks fine at 2000px and turns to mud at 56, and the
// only way to know which is to put it where it will live.
//
// A generated floor cannot do this job: RankSeams draws whatever its pools happen to author, so there is
// no way to ask it for the one object you just imported.

const PROP_H = CELL + WALL_H
/** The explorer's slot, from importTile's SLOTS — he is the ruler everything else is measured against. */
const EXPLORER_W = 40
const EXPLORER_H = 70

/** Three cells across and two deep, so an object is seen with floor around it rather than cropped to
 * its own cell — and with the explorer beside it, which is the only thing that says whether a prop is
 * the right SIZE rather than merely the right shape. */
const CHAMBER_W = CELL * 3
const CHAMBER_H = CELL * 2

/** A drift's staged size, in cells — roughly what `driftsFor` gives one in an open chamber. */
const DRIFT_W = 2.2
const DRIFT_H = 1.3

const Chamber: FC<{ tier: Difficulty; name: string; wallItem?: boolean; underfoot?: boolean; zoom: number }> = ({
  tier,
  name,
  wallItem = false,
  underfoot = false,
  zoom,
}) => {
  const drift = DRIFT_KINDS.has(name)
  const palette = tierPalette[tier]
  const art = tileUrl(tier, name)
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  const explorer = tileUrl("starter", "explorer-s-1")
  // Where feet and bases land: one cell up from the bottom, so there is floor in FRONT of the object
  // as well as behind it.
  const floorLine = (WALL_H + CELL) * zoom
  const propLeft = (CHAMBER_W * zoom) / 2 - CELL * zoom
  // SCATTER IS STAGED TWICE: once under the explorer's boots and once on its own, a cell or so to the
  // right. Both readings matter and neither substitutes for the other — with a boot on it you can tell
  // whether it reads as ground rather than as an object in the way, and without one you can tell what
  // was actually drawn. Under a sprite 40 wide, most of a 56-wide tile is hidden.
  //
  // A drift needs the wider gap because it is sized in CELLS and outgrows one: at 2.2 across, a copy set
  // a cell over lands on top of the first.
  const soloGap = drift ? CELL * (DRIFT_W + 0.35) : CELL * 1.55
  // Wide enough for the second copy and half a cell of floor past it, rather than CHAMBER_W plus the gap,
  // which left a cell and a half of empty paving on the right of every scatter row.
  const soloRight = drift ? CELL + soloGap + (CELL * DRIFT_W) / 2 : CELL / 2 + soloGap + CELL
  const stageW = underfoot ? soloRight + CELL / 2 : CHAMBER_W
  const artAt = (dx: number) =>
    art &&
    (drift ? (
      // Centred on the cell and sized in CELLS, the way SandDrifts draws it — a drift stopped being a
      // prop-box sprite the moment it outgrew a cell. Not clipped here: the sheet has no walls to cut it
      // against, and what this view is for is the sand's OWN edge, which is the half of the shape the
      // map's clip does not supply.
      <img
        src={art}
        alt={name}
        className="absolute"
        style={{
          left: propLeft + dx + (CELL / 2 - (CELL * DRIFT_W) / 2) * zoom,
          top: floorLine - (CELL / 2 + (CELL * DRIFT_H) / 2) * zoom,
          width: CELL * DRIFT_W * zoom,
          height: CELL * DRIFT_H * zoom,
          imageRendering: ART_IMAGE_RENDERING,
        }}
      />
    ) : wallItem ? (
      <img
        src={art}
        alt={name}
        className="absolute"
        style={{
          left: propLeft + dx,
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
          left: propLeft + dx,
          top: floorLine - PROP_H * zoom,
          width: CELL * zoom,
          height: PROP_H * zoom,
          imageRendering: ART_IMAGE_RENDERING,
        }}
      />
    ))
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <div
        className="relative overflow-hidden"
        style={{ width: stageW * zoom, height: (WALL_H + CHAMBER_H) * zoom, background: palette.slab }}
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
        {artAt(0)}
        {underfoot && artAt(soloGap * zoom)}
        {/* SCATTER puts the explorer ON the first copy, not beside it, because that is the whole
            difference between this layer and a prop: a prop stands on a cell nobody can reach and scatter
            lies on the cells the player crosses, drawn UNDER him. The second copy to its right is the same
            tile with nothing on it — see `artAt`. */}
        {explorer && (
          <img
            src={explorer}
            alt="explorer"
            className="absolute"
            style={{
              left: propLeft + (underfoot ? CELL / 8 : CELL + CELL / 2) * zoom,
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

/** The three places a CONDITION shows, staged at the sizes `MapGrowth` really draws them.
 *
 * It needs its own component rather than a `Chamber` variant because a condition is not a tile in a slot:
 * a tuft is a small sprite anywhere on the floor, a root hangs off the wall BAND and past its bottom edge,
 * and a plant stands on a chamber floor. Their sizes are the ones in `MapGrowth`, copied here on purpose —
 * seeing them at map scale is the only way to tell whether a root reads as coming through the brick, and
 * that judgement cannot be made on the whole-floor inspector, where each one is 20 units of a 3000-unit
 * map. It is the same argument that gave props this sheet in the first place. */
const GrowthRow: FC<{ tier: Difficulty; kind: string; zoom: number }> = ({ tier, kind, zoom }) => {
  const palette = tierPalette[tier]
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  const tuft = sharedTileUrl(kind)
  const root = sharedTileUrl(`${kind}-wall`) ?? tuft
  const plant = sharedTileUrl(`${kind}-plant`) ?? tuft
  const w = CELL * 3
  const floorLine = (WALL_H + CELL) * zoom
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <div
        className="relative overflow-hidden"
        style={{ width: w * zoom, height: (WALL_H + CELL * 2) * zoom, background: palette.slab }}
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
            height: CELL * 2 * zoom,
            background: floor ? `url(${floor})` : palette.slab,
            backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
            imageRendering: ART_IMAGE_RENDERING,
          }}
        />
        {/* a tuft in a joint: 12-22 units, anywhere on the floor */}
        {tuft && (
          <img
            src={tuft}
            alt={`${kind} tuft`}
            className="absolute"
            style={{ left: CELL * 0.3 * zoom, top: floorLine - 18 * zoom, width: 18 * zoom, height: 18 * zoom }}
          />
        )}
        {/* roots through the band: anchored to its TOP and hanging past its bottom, which is the whole
            point — WALL_H is 28 and this is 40. */}
        {root && (
          <img
            src={root}
            alt={`${kind} roots`}
            className="absolute"
            style={{ left: CELL * 1.15 * zoom, top: 0, width: 26 * zoom, height: 40 * zoom }}
          />
        )}
        {/* a chamber plant: bottom-anchored on the floor, 30-46 units */}
        {plant && (
          <img
            src={plant}
            alt={`${kind} plant`}
            className="absolute"
            style={{ left: CELL * 2.1 * zoom, top: floorLine - 38 * zoom, width: 38 * zoom, height: 38 * zoom }}
          />
        )}
      </div>
      <figcaption className="text-[10px] text-white/60">
        {kind} — joint / wall / chamber
        {sharedTileUrl(`${kind}-wall`) ? "" : " (wall+plant fall back to the tuft)"}
      </figcaption>
    </figure>
  )
}

// Only what this rank is actually furnished with. Staging every kind at every rank invites work that
// will never be seen: the merchant's sheet used to show a sarcophagus and a crystal, neither of which
// the world authors below junior and wizard, and six wall items where it authors two. See
// `authoredKinds.ts`, and `yarn art-census` for the same list with room counts and what has art.
const Sheet: FC<{ tier: Difficulty; zoom: number }> = ({ tier, zoom }) => {
  const { props, wallItems, scatter } = authoredKindsFor(tier)
  return (
    // h-screen + overflow-auto, because at zoom 6 the sheet is wider and taller than the canvas and a
    // fullscreen story clips instead of scrolling.
    <div className="flex h-screen flex-col gap-6 overflow-auto bg-neutral-900 p-6">
      <h2 className="m-0 text-sm text-white/80">
        {tier} — chamber props <span className="text-white/40">({props.length} the world authors here)</span>
      </h2>
      <div className="flex flex-wrap gap-4">
        {props.map(kind => (
          <Chamber key={kind} tier={tier} name={kind} zoom={zoom} />
        ))}
      </div>
      <h2 className="m-0 text-sm text-white/80">
        {tier} — wall items <span className="text-white/40">({wallItems.length})</span>
      </h2>
      <div className="flex flex-wrap gap-4">
        {wallItems.map(kind => (
          <Chamber key={kind} tier={tier} name={kind} wallItem zoom={zoom} />
        ))}
      </div>
      {/* The layer this sheet used to be blind to, for the same reason `yarn art-census` was: nothing
          authors scatter, so a list read off the pools cannot contain it. It is also the layer with the
          most pieces on a floor, and the only one the player walks over. */}
      <h2 className="m-0 text-sm text-white/80">
        {tier} — floor scatter{" "}
        <span className="text-white/40">
          ({scatter.length}, placed by rule — each staged twice: under his boots, then alone)
        </span>
      </h2>
      <div className="flex flex-wrap gap-4">
        {scatter.map(kind => (
          <Chamber key={kind} tier={tier} name={kind} underfoot zoom={zoom} />
        ))}
      </div>
      {/* CONDITIONS: not per rank at all — one shared sprite per kind, over this rank's own stone. Staged
          here because the whole-floor inspector cannot answer the question these sprites raise: at 20
          units on a 3000-unit map you can confirm they EXIST and nothing more. */}
      <h2 className="m-0 text-sm text-white/80">
        conditions <span className="text-white/40">(shared sprites, drawn over {tier}&apos;s stone)</span>
      </h2>
      <div className="flex flex-wrap gap-4">
        {["overgrown", "flooded"].map(kind => (
          <GrowthRow key={kind} tier={tier} kind={kind} zoom={zoom} />
        ))}
      </div>
    </div>
  )
}

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
