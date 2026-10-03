import type { Meta, StoryObj } from "@storybook/react-vite"
import { type FC, useEffect, useState } from "react"
import { CELL, PROP_H, WALL_H } from "./mapScale"
import { ART_IMAGE_RENDERING, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// The lever's three sprites just landed (`leverBaseBack`, `leverArm`, `leverBaseFront`, all `expert`,
// all 112x168, sharing one frame to the pixel) and nothing in the app draws them yet. This story stages
// them the way the renderer will — a prop on its rank's floor, top overlapping the wall band, the
// explorer beside it for scale (`PropSheet.stories.tsx`'s `Chamber`, reused rather than reinvented,
// because a generation looks fine at 2000px and turns to mud at 56).
//
// THE ARM IS THROWN BY A PLAIN `rotate()`. A shear correction derived from the render camera was staged
// against it and looked worse, so it is gone: it kept the arm's tip inside the painted track, but the
// un-rotating squash it applies to get there is what the eye catches. The track is paint on the mound,
// not a slot the arm must stay inside, and the overshoot it measured was against a tip radius fitted to
// reproduce that same overshoot. Measured against looked-at, looked-at won.

/** The native frame every one of the three sprites shares, to the pixel. */
const TILE_W = 112

/** The pivot the scaffold defines: inside the mound, not at its crown (`prim_lever`'s docstring).
 * `76.6%` down a 168-tall tile lands 1.5px from the shaft's own last visible row in the landed art
 * (measured off `leverArm.png`: content stops at y=125; the pivot fraction below reproduces `root_z`'s
 * own position in the shared camera frame to three decimals — see the derivation below). */
const PIVOT_X_PCT = 50
const PIVOT_Y_PCT = 76.6

/** The track's painted ends, measured on the landed art: x 45-67 of the 112-wide tile, ±11px from
 * centre. Drawn as guides to sit the throw against, not as a bound the arm has to stay inside. Do not
 * re-derive this; it is a measurement, not a formula. */
const TRACK_X0 = 45
const TRACK_X1 = 67

/** Where a state's index throws the arm to. An index into an ORDERED state list, spread evenly across
 * `±throwDeg` — not two hardcoded cases, because a wheel's control has more than two states and the
 * renderer must not be written for a binary. A single-state list has nothing to throw between. */
const angleForState = (index: number, count: number, throwDeg: number): number => {
  if (count <= 1) return 0
  return -throwDeg + (2 * throwDeg * index) / (count - 1)
}

// ── Staging, following `PropSheet.stories.tsx`'s `Chamber`: a prop stands on its rank's floor, its top
// overlapping the wall band, the explorer beside it for scale, at map scale — because a generation that
// looks fine at 2000px can still turn to mud at 56, and the only way to know which is to put it where it
// will live. Reused rather than reinvented; see that file for the fuller staging this borrows.

const TIER = "expert"
const EXPLORER_W = 40
const EXPLORER_H = 70
const CHAMBER_W = CELL * 2
const CHAMBER_H = CELL * 2

const LeverStage: FC<{
  thetaDeg: number
  durationMs: number
  reducedMotion: boolean
  zoom: number
  showMarkers: boolean
}> = ({ thetaDeg, durationMs, reducedMotion, zoom, showMarkers }) => {
  const palette = tierPalette[TIER]
  const floor = tileUrl(TIER, "floor")
  const face = tileUrl(TIER, "wall-face")
  const explorer = tileUrl("starter", "explorer-s-1")
  const back = tileUrl(TIER, "leverBaseBack")
  const arm = tileUrl(TIER, "leverArm")
  const front = tileUrl(TIER, "leverBaseFront")

  const [osReduced, setOsReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setOsReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  const noMotion = reducedMotion || osReduced

  const floorLine = (WALL_H + CELL) * zoom
  const propLeft = (CHAMBER_W * zoom) / 2 - (CELL * zoom) / 2
  const artW = CELL * zoom
  const artH = PROP_H * zoom
  // The scale from tile-space (112x168) to this stage's own pixels — the same ratio in x and y,
  // because `CELL:PROP_H` (56:84) was authored to match the art's own `112:168` exactly (both 2:3),
  // so staging the tile at `CELL` wide never stretches it off its native aspect.
  const stagePerTile = artW / TILE_W
  const armTop = floorLine - artH

  const transform = `rotate(${thetaDeg}deg)`

  const pivotLeft = propLeft + (PIVOT_X_PCT / 100) * artW
  const pivotTop = armTop + (PIVOT_Y_PCT / 100) * artH

  return (
    <figure className="m-0 flex flex-col items-center gap-1">
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
        {/* THE STACKING ORDER IS THE POINT: back, arm, front, in depth. All three share one frame to
            the pixel, so they stack at the same origin with no per-tile offset — computing one would
            mean the frame had been lost. */}
        {back && (
          <img
            src={back}
            alt="lever mound, far half"
            className="absolute"
            style={{ left: propLeft, top: armTop, width: artW, height: artH, imageRendering: ART_IMAGE_RENDERING }}
          />
        )}
        {arm && (
          <img
            src={arm}
            alt="lever arm"
            className="absolute motion-reduce:transition-none"
            style={{
              left: propLeft,
              top: armTop,
              width: artW,
              height: artH,
              imageRendering: ART_IMAGE_RENDERING,
              transform,
              transformOrigin: `${PIVOT_X_PCT}% ${PIVOT_Y_PCT}%`,
              transitionProperty: "transform",
              transitionDuration: noMotion ? "0ms" : `${durationMs}ms`,
              transitionTimingFunction: "ease",
            }}
          />
        )}
        {front && (
          <img
            src={front}
            alt="lever mound, near half"
            className="absolute"
            style={{ left: propLeft, top: armTop, width: artW, height: artH, imageRendering: ART_IMAGE_RENDERING }}
          />
        )}
        {explorer && (
          <img
            src={explorer}
            alt="explorer"
            className="absolute"
            style={{
              left: propLeft + CELL * 1.2 * zoom,
              top: floorLine - EXPLORER_H * zoom,
              width: EXPLORER_W * zoom,
              height: EXPLORER_H * zoom,
              imageRendering: ART_IMAGE_RENDERING,
            }}
          />
        )}
        {showMarkers && (
          <>
            {/* The track's painted ends: x 45 and 67 of 112, scaled to this stage. A vertical guide
                rather than a single row, because only the X is a measured fact here. */}
            {[TRACK_X0, TRACK_X1].map(x => (
              <div
                key={x}
                className="absolute inset-y-0 w-px bg-emerald-400/70"
                style={{ left: propLeft + x * stagePerTile }}
              />
            ))}
            {/* The pivot, `transform-origin` made visible. */}
            <div
              className="absolute size-1.5 -translate-1/2 rounded-full bg-sky-400"
              style={{ left: pivotLeft, top: pivotTop }}
            />
          </>
        )}
      </div>
      <figcaption className="text-[10px] text-white/70">θ={thetaDeg.toFixed(1)}°</figcaption>
    </figure>
  )
}

/** The lever at one state of its own list, thrown to the angle that state's index names. */
const LeverCompare: FC<{
  states: string[]
  stateIndex: number
  throwDeg: number
  durationMs: number
  reducedMotion: boolean
  zoom: number
  showMarkers: boolean
}> = ({ states, stateIndex, throwDeg, durationMs, reducedMotion, zoom, showMarkers }) => {
  const theta = angleForState(stateIndex, states.length, throwDeg)
  return (
    <div className="flex h-screen flex-col gap-4 overflow-auto bg-neutral-900 p-6">
      <h2 className="m-0 text-sm text-white/80">
        lever — state <span className="text-white/40">{states[stateIndex] ?? stateIndex}</span>
        {" of "}
        {states.join(", ")}, throw ±{throwDeg}°
      </h2>
      <div className="flex flex-wrap gap-6">
        <LeverStage
          thetaDeg={theta}
          durationMs={durationMs}
          reducedMotion={reducedMotion}
          zoom={zoom}
          showMarkers={showMarkers}
        />
      </div>
    </div>
  )
}

const meta = {
  title: "Topology/Lever",
  component: LeverCompare,
  parameters: { layout: "fullscreen" },
  argTypes: {
    throwDeg: { control: { type: "range", min: 0, max: 60, step: 1 } },
    durationMs: { control: { type: "range", min: 0, max: 1000, step: 20 } },
    reducedMotion: { control: "boolean" },
    zoom: { control: { type: "range", min: 1, max: 6, step: 1 } },
    showMarkers: { control: "boolean" },
    states: { control: false },
    stateIndex: { control: false },
  },
  args: {
    states: ["left", "right"],
    stateIndex: 0,
    throwDeg: 15,
    durationMs: 260,
    reducedMotion: false,
    zoom: 4,
    showMarkers: true,
  },
} satisfies Meta<typeof LeverCompare>

export default meta
type Story = StoryObj<typeof meta>

/** A binary handle: two states, thrown left and right at the authored ±15°. */
export const Binary: Story = {
  args: { states: ["left", "right"], stateIndex: 1 },
  argTypes: { stateIndex: { control: { type: "inline-radio" }, options: [0, 1] } },
}

/** The same component driving a THREE-state control off the identical index math — proving the
 * renderer was not written for a binary; a wheel is the next N-state control this vocabulary serves. */
export const ThreeState: Story = {
  args: { states: ["low", "mid", "high"], stateIndex: 1 },
  argTypes: { stateIndex: { control: { type: "inline-radio" }, options: [0, 1, 2] } },
}

/*
 * SETTLED HERE, BY LOOKING: a plain `rotate()` at ±15°.
 *
 * The throw was staged at ±36° first, and at that angle the arm visibly leaves the mound whichever
 * transform carries it. ±15° is the throw that reads as a lever being pulled rather than a mast falling
 * over, and it keeps the tip near the painted track without anything having to correct for it.
 */
