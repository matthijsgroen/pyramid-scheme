import type { Meta, StoryObj } from "@storybook/react-vite"
import { type FC, useEffect, useState } from "react"
import { CELL, PROP_H, WALL_H } from "./mapScale"
import { ART_IMAGE_RENDERING, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// The lever's three sprites just landed (`leverBaseBack`, `leverArm`, `leverBaseFront`, all `expert`,
// all 112x168, sharing one frame to the pixel) and nothing in the app draws them yet. This story stages
// them the way the renderer will — a prop on its rank's floor, top overlapping the wall band, the
// explorer beside it for scale (`PropSheet.stories.tsx`'s `Chamber`, reused rather than reinvented,
// because a generation looks fine at 2000px and turns to mud at 56) — and answers the one open question
// a stack of tiles cannot answer by itself: does a naive CSS `rotate()` on the upright arm reproduce the
// true ±36° throw, or does it put the tip outside the track the mound was cut for.

/** The native frame every one of the three sprites shares, to the pixel. */
const TILE_W = 112
const TILE_H = 168

/** The pivot the scaffold defines: inside the mound, not at its crown (`prim_lever`'s docstring).
 * `76.6%` down a 168-tall tile lands 1.5px from the shaft's own last visible row in the landed art
 * (measured off `leverArm.png`: content stops at y=125; the pivot fraction below reproduces `root_z`'s
 * own position in the shared camera frame to three decimals — see the derivation below). */
const PIVOT_X_PCT = 50
const PIVOT_Y_PCT = 76.6

/** The track's painted ends, measured on the landed art: x 45-67 of the 112-wide tile, ±11px from
 * centre — which is what the mesh's own slot geometry predicts at the full ±36° throw (±8.6px,
 * agreeing to within the rim's own width). Do not re-derive this; it is a measurement, not a formula. */
const TRACK_X0 = 45
const TRACK_X1 = 67

/** `renderProp.py`'s shear: `z' = z + k*y`, so a unit of world DEPTH draws into the shared vertical axis
 * at `k` times the rate a unit of world HEIGHT does. The arm's own swing lives at y=0 (`prim_lever`:
 * "THE ARM RUNS IN X, the only axis drawn honestly"), so the shaft's centreline is not itself distorted
 * by the shear — but the flat tile CSS rotates was captured through a camera whose vertical framing
 * (`add_camera`, `scale = max(span_x * height/width, span_z)`) is fit to the object's HEIGHT-dominant
 * span in a tile that is NOT square (112 wide, 168 tall). A plain `rotate()` treats the tile's own pixel
 * grid as isotropic; the render that produced it was not, by the aspect the camera had to reconcile. */
const SHEAR_K = 0.7
const TILE_ASPECT = TILE_W / TILE_H // 2/3 — add_camera's own width/height framing ratio

/** `s`, derived from the shear and the framing rather than fit by eye: the shear's depth-into-height
 * factor, scaled by the tile's own width/height ratio (`add_camera`'s aspect correction, the other half
 * of "the scaffold's projection" this task names). `transform: scaleY(1/s) rotate(θ) scaleY(s)` about
 * the pivot undoes it, rotates in the corrected space, and puts it back — CSS composes this natively
 * because the three functions share one `transform-origin`. */
const CORRECTION_S = SHEAR_K * TILE_ASPECT // 0.7 * (112/168) ≈ 0.4667

/** The tip-check point, R tile-px above the pivot along the vertical: chosen so a plain `rotate(36deg)`
 * reproduces the measured overshoot (naive puts the tip at x≈77 at +36°, so R = (77-56)/sin(36°) ≈
 * 35.7 — a point partway up the plain shaft, below where the grip starts to kick outward, which is
 * where the mound's own crown sits). This is the point the acceptance test judges against the track. */
const TIP_R = (77 - TILE_W / 2) / Math.sin((36 * Math.PI) / 180)

const degToRad = (deg: number) => (deg * Math.PI) / 180

/** A plain 2D rotation of a point given relative to the pivot, in tile-space pixels. */
const rotate = (dx: number, dy: number, thetaDeg: number) => {
  const t = degToRad(thetaDeg)
  const cos = Math.cos(t)
  const sin = Math.sin(t)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

/** Reproduces, in plain arithmetic, what the CSS transform draws — so the marker and the numeric
 * readout below are checking the SAME transform the arm sprite carries, not a second guess at it. CSS
 * composes `scaleY(1/s) rotate(θ) scaleY(s)` right to left: `scaleY(s)` first, then the rotation, then
 * `scaleY(1/s)` last — so only the y-component of the rotated point is ever divided back by `s`. */
const projectTip = (dx: number, dy: number, thetaDeg: number, mode: "naive" | "corrected") => {
  if (mode === "naive") return rotate(dx, dy, thetaDeg)
  const scaled = rotate(dx, dy * CORRECTION_S, thetaDeg)
  return { x: scaled.x, y: scaled.y / CORRECTION_S }
}

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
  mode: "naive" | "corrected"
  thetaDeg: number
  durationMs: number
  reducedMotion: boolean
  zoom: number
  showMarkers: boolean
}> = ({ mode, thetaDeg, durationMs, reducedMotion, zoom, showMarkers }) => {
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

  const transform =
    mode === "naive"
      ? `rotate(${thetaDeg}deg)`
      : `scaleY(${1 / CORRECTION_S}) rotate(${thetaDeg}deg) scaleY(${CORRECTION_S})`

  const tip = projectTip(0, -TIP_R, thetaDeg, mode)
  const tipXTile = TILE_W / 2 + tip.x
  const inTrack = tipXTile >= TRACK_X0 && tipXTile <= TRACK_X1

  const pivotLeft = propLeft + (PIVOT_X_PCT / 100) * artW
  const pivotTop = armTop + (PIVOT_Y_PCT / 100) * artH
  const tipLeft = pivotLeft + tip.x * stagePerTile
  const tipTop = pivotTop + tip.y * stagePerTile

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
            {/* The arm's tip, at the throw's current angle — the marker that makes overshoot visible
                rather than a thing to squint for. */}
            <div
              className={`absolute size-2.5 -translate-1/2 rounded-full border-2 ${
                inTrack ? "border-emerald-400 bg-emerald-400/40" : "border-red-500 bg-red-500/50"
              }`}
              style={{ left: tipLeft, top: tipTop }}
            />
          </>
        )}
      </div>
      <figcaption className="flex flex-col items-center text-[10px] text-white/70">
        <span>
          {mode} · θ={thetaDeg.toFixed(1)}°
        </span>
        <span className={inTrack ? "text-emerald-400" : "text-red-400"}>
          tip x={tipXTile.toFixed(1)} of {TILE_W} ({inTrack ? "in track" : "past track"} {TRACK_X0}-{TRACK_X1})
        </span>
      </figcaption>
    </figure>
  )
}

/** The story's main job: the naive and corrected transforms, staged side by side at the same angle and
 * state, so the difference is compared directly rather than toggled from memory. */
const LeverCompare: FC<{
  states: string[]
  stateIndex: number
  throwDeg: number
  view: "both" | "naive" | "corrected"
  durationMs: number
  reducedMotion: boolean
  zoom: number
  showMarkers: boolean
}> = ({ states, stateIndex, throwDeg, view, durationMs, reducedMotion, zoom, showMarkers }) => {
  const theta = angleForState(stateIndex, states.length, throwDeg)
  return (
    <div className="flex h-screen flex-col gap-4 overflow-auto bg-neutral-900 p-6">
      <h2 className="m-0 text-sm text-white/80">
        lever — state <span className="text-white/40">{states[stateIndex] ?? stateIndex}</span>
        {" of "}
        {states.join(", ")}, throw ±{throwDeg}°
      </h2>
      <div className="flex flex-wrap gap-6">
        {(view === "both" || view === "naive") && (
          <LeverStage
            mode="naive"
            thetaDeg={theta}
            durationMs={durationMs}
            reducedMotion={reducedMotion}
            zoom={zoom}
            showMarkers={showMarkers}
          />
        )}
        {(view === "both" || view === "corrected") && (
          <LeverStage
            mode="corrected"
            thetaDeg={theta}
            durationMs={durationMs}
            reducedMotion={reducedMotion}
            zoom={zoom}
            showMarkers={showMarkers}
          />
        )}
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
    view: { control: { type: "inline-radio" }, options: ["both", "naive", "corrected"] },
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
    throwDeg: 36,
    view: "both",
    durationMs: 260,
    reducedMotion: false,
    zoom: 4,
    showMarkers: true,
  },
} satisfies Meta<typeof LeverCompare>

export default meta
type Story = StoryObj<typeof meta>

/** Naive vs corrected, at the authored ±36° throw — the story's main job. */
export const Compare: Story = {
  argTypes: { stateIndex: { control: { type: "inline-radio" }, options: [0, 1] } },
}

/** A binary handle: two states, thrown left and right. */
export const Binary: Story = {
  args: { states: ["left", "right"], stateIndex: 1, view: "corrected" },
  argTypes: { stateIndex: { control: { type: "inline-radio" }, options: [0, 1] } },
}

/** The same component driving a THREE-state control off the identical index math — proving the
 * renderer was not written for a binary; a wheel is the next N-state control this vocabulary serves. */
export const ThreeState: Story = {
  args: { states: ["low", "mid", "high"], stateIndex: 1, view: "corrected" },
  argTypes: { stateIndex: { control: { type: "inline-radio" }, options: [0, 1, 2] } },
}

/*
 * MEASURED IN THIS STORY (the tip-check point at radius `TIP_R ≈ 35.7` tile-px above the pivot, the
 * point a naive `rotate()` puts at x≈77 — see `TIP_R`'s derivation above), against the track's 45-67:
 *
 *   angle   naive tip x     corrected tip x (s ≈ 0.4667)
 *   +36°    77.0  (past 67 by 10.0px)     65.8  (inside, 1.2px of margin)
 *   -36°    35.0  (past 45 by 10.0px)     46.2  (inside, 1.2px of margin)
 *
 * The correction does not merely shrink the overshoot, it clears the rim on both extremes — reported
 * from the arithmetic `projectTip` above, which is the exact function the arm's `transform` uses.
 */
