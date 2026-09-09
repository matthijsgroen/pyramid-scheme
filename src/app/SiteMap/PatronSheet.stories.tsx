import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { CELL, WALL_H } from "./mapScale"
import { ART_IMAGE_RENDERING, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// Every PATRON crossed with every kind that can carry one, staged on a rank's floor at map scale.
//
// What this sheet is for is COVERAGE, which `PropSheet` cannot show. That one asks "does this prop read",
// one kind at a time; a patron is not a kind but a variant of five of them, so the question here is which
// of thirty-five files exist, which fall back to the generic art, and whether a god is recognisable at
// 56 units once he does exist. A patron nobody can identify is a wasted generation, and there is no way
// to find that out from a 2000px return.
//
// It reads the FILENAME CONVENTION and nothing else: `<kind>-<patron>.png` in the rank's own folder,
// resolved by `tileUrl`, which returns undefined when a rank has no art of that name. So this sheet works
// today, before any resolver exists — and the convention it reads is the contract that resolver will have
// to honour, which is the other half of why it is worth having first.

/** The seven the design settles on, in `docs/instructions/site-map-art-handover.md`, "Decided but NOT
 * built". Sobek and Ma'at are here because a tomb's patron is not always a funerary god — a waterworks
 * wing belongs to the crocodile and a judgement hall to the feather. */
const PATRONS = ["anubis", "horus", "sobek", "bastet", "maat", "ra", "sekhmet"] as const

/** The five kinds a patron can dress, and no more. Every one of them is something a god is DEPICTED on —
 * a statue of him, a shrine to him, his plaque, his mask — so a patron variant is a different drawing of
 * the same object rather than a new kind. That is what keeps this free: no pool edits, no world
 * regeneration, and art can be added one file at a time (`tileVariants`' argument, one axis over). */
const KINDS = ["statue", "shrine", "wallShrine", "stela", "mask"] as const

/** Wall items are painted onto the band; the other two stand on the floor. */
const WALL_KINDS = new Set<string>(["wallShrine", "stela", "mask"])

const PROP_H = CELL + WALL_H

/** One cell of the grid: the patron's art if it exists, the generic kind if it does not, and a label
 * saying WHICH of those you are looking at. The label is the point — a fallback that is not announced
 * reads as a finished patron, and this sheet exists to be counted from. */
const Cell: FC<{ tier: Difficulty; kind: string; patron: string; zoom: number }> = ({ tier, kind, patron, zoom }) => {
  const palette = tierPalette[tier]
  const own = tileUrl(tier, `${kind}-${patron}`)
  const generic = tileUrl(tier, kind)
  const art = own ?? generic
  const state = own ? "art" : generic ? "generic" : "none"
  const wallItem = WALL_KINDS.has(kind)
  const floor = tileUrl(tier, "floor")
  const face = tileUrl(tier, "wall-face")
  const floorLine = (WALL_H + CELL) * zoom

  return (
    <figure className="m-0 flex flex-col items-center gap-0.5">
      <div
        className="relative overflow-hidden"
        style={{ width: CELL * zoom, height: (WALL_H + CELL * 1.15) * zoom, background: palette.slab }}
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
            height: CELL * 1.15 * zoom,
            background: floor ? `url(${floor})` : palette.slab,
            backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
            imageRendering: ART_IMAGE_RENDERING,
          }}
        />
        {art && (
          <img
            src={art}
            alt={`${kind}-${patron}`}
            className="absolute"
            // A fallback is drawn at HALF opacity. Dimming is not decoration: with thirty-five cells on
            // screen the eye counts what is solid, and a generic statue repeated seven times across a
            // row is exactly the thing that must not read as seven patrons.
            style={{
              left: 0,
              top: wallItem ? 0 : floorLine - PROP_H * zoom,
              width: CELL * zoom,
              height: (wallItem ? WALL_H : PROP_H) * zoom,
              opacity: own ? 1 : 0.45,
              imageRendering: ART_IMAGE_RENDERING,
            }}
          />
        )}
        {state === "none" && (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/50">(none)</span>
        )}
      </div>
      <figcaption className="text-[9px] text-white/45">
        {state === "art" ? kind : state === "generic" ? `${kind} · generic` : kind}
      </figcaption>
    </figure>
  )
}

const Sheet: FC<{ tier: Difficulty; zoom: number }> = ({ tier, zoom }) => {
  const drawn = PATRONS.flatMap(p => KINDS.filter(k => tileUrl(tier, `${k}-${p}`))).length
  return (
    <div className="min-h-screen bg-neutral-900 p-4 text-white">
      <h1 className="mb-1 text-sm">
        Patrons · {tier} · {drawn} of {PATRONS.length * KINDS.length} drawn
      </h1>
      <p className="mb-4 max-w-3xl text-[11px] text-white/50">
        Reads <code>&lt;kind&gt;-&lt;patron&gt;.png</code> from this rank&rsquo;s folder. Dimmed cells are the generic
        kind standing in, not a patron — the resolver that would prefer the patron file is still unbuilt, so nothing in
        the game reads these yet.
      </p>
      <div className="flex flex-col gap-4">
        {PATRONS.map(patron => (
          <section key={patron}>
            <h2 className="mb-1 text-xs text-white/70 capitalize">{patron}</h2>
            <div className="flex flex-wrap gap-3">
              {KINDS.map(kind => (
                <Cell key={kind} tier={tier} kind={kind} patron={patron} zoom={zoom} />
              ))}
            </div>
          </section>
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
  args: { tier: "expert", zoom: 3 },
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

/** At map scale, which is the only size that decides whether a god is identifiable. */
export const AtMapScale: Story = { args: { zoom: 1 } }

/** The priest first: his rank is the one whose statue is drawn, so it is the only row with a real
 * patron in it today. */
export const Priest: Story = { args: { tier: "expert", zoom: 3 } }

export const Merchant: Story = { args: { tier: "starter", zoom: 3 } }
export const Nobleman: Story = { args: { tier: "junior", zoom: 3 } }
export const Pharaoh: Story = { args: { tier: "master", zoom: 3 } }
export const Gods: Story = { args: { tier: "wizard", zoom: 3 } }
