import { useLayoutEffect, useRef, useState } from "react"
import { headingOf } from "@/game/passages"
import type { Direction } from "@/game/siteTypes"
import { FIGURE_LIT, FOOT_LIFT, TorchGlow } from "./ExplorerDot"
import { OCCLUDER_FADE } from "./htmlLayers"
import { CELL, cellCenter } from "./mapScale"
import { SQUEEZE_HEAD_ON_SLIDE, squeezeSprite, type Squeeze } from "./useSqueeze"

/** Where the explorer's feet are on a cell: its centre, down to the line he stands on. */
// eslint-disable-next-line react-refresh/only-export-components -- pure function, exported so tests can assert where the rider stands
export const squeezeFoot = (at: readonly [number, number]) => {
  const { cx, cy } = cellCenter(at[0], at[1])
  return { x: cx, y: cy + CELL / 2 - FOOT_LIFT }
}

/**
 * THE EXPLORER SQUEEZING, one heading, hung from the point his feet stand on. The pose is painted at twice map scale,
 * so it is drawn at half its own size, bottom-centred on the foot line, whatever size it was imported at. The torch's
 * light is his as on every other pose.
 */
export const SqueezeFigure = ({ dir }: { dir: Direction }) => {
  const sprite = squeezeSprite(dir)
  if (!sprite) return null
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${FOOT_LIFT - CELL / 2}px)` }}>
        <TorchGlow />
      </div>
      <div
        data-squeeze-sprite={dir}
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          lineHeight: 0,
          transform: `translateX(-50%) scale(${sprite.mirrored ? -0.5 : 0.5}, 0.5)`,
          transformOrigin: "50% 100%",
          filter: FIGURE_LIT,
        }}
      >
        {/* At its own pixel size: the box it sits in is zero wide, so the stylesheet's `max-width: 100%` would
            draw it at nothing. */}
        <img src={sprite.url} alt="" style={{ maxWidth: "none" }} />
      </div>
    </>
  )
}

type Leg = "from" | "via" | "to"
type Pose = { x: number; y: number; opacity: number; dir: Direction }

/** Where the squeeze stands on a leg, how much of him shows, and which way he faces. Head-on he stays in the wall's
 * cell: in front of its face fully seen, a little north of it half seen; north-going he starts in front, south-going
 * behind. Sideways and round a corner he stands on each cell in turn, fully seen. */
const poseOf = ({ traversal: { from, via, to }, way }: Squeeze, leg: Leg): Pose => {
  if (way === "headOn") {
    const dir = headingOf(from, via)
    const face = squeezeFoot(via)
    const behind = leg === "from" ? dir === "s" : dir === "n"
    return behind
      ? { x: face.x, y: face.y - SQUEEZE_HEAD_ON_SLIDE, opacity: OCCLUDER_FADE, dir }
      : { ...face, opacity: 1, dir }
  }
  const { x, y } = squeezeFoot(leg === "from" ? from : leg === "via" ? via : to)
  return { x, y, opacity: 1, dir: leg === "to" ? headingOf(via, to) : headingOf(from, via) }
}

/**
 * THE SQUEEZE, one CSS transition per leg. Sideways and round a corner the pose stands on the near side, slides into
 * the wall's cell, then out to the far side, each leg in its own heading; the second leg's end is the crossing's end.
 * Head-on it is one slide inside the wall's cell, as long as both legs, fading as he goes behind the wall or coming
 * clear of it as he comes out; that slide's end is the crossing's end.
 */
export const SqueezeRider = ({ squeeze }: { squeeze: Squeeze }) => {
  const [leg, setLeg] = useState<Leg>("from")
  const el = useRef<HTMLDivElement>(null)
  // Start on the near side, then move on the next frame so the browser has a start to transition from.
  useLayoutEffect(() => {
    void el.current?.offsetWidth
    const frame = requestAnimationFrame(() => setLeg("via"))
    return () => cancelAnimationFrame(frame)
  }, [squeeze])
  const headOn = squeeze.way === "headOn"
  const ms = headOn ? squeeze.msPerLeg * 2 : squeeze.msPerLeg
  const { x, y, opacity, dir } = poseOf(squeeze, leg)
  return (
    <div
      ref={el}
      data-squeeze-rider={leg}
      onTransitionEnd={e => {
        if (e.target !== e.currentTarget) return
        if (leg === "via" && !headOn) setLeg("to")
        else if (leg !== "from") squeeze.end()
      }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        pointerEvents: "none",
        transition: `left ${ms}ms linear, top ${ms}ms linear`,
      }}
    >
      {/* The fade on a child of its own, so its transition's end bubbles up and is ignored. */}
      <div data-squeeze-figure="" style={{ opacity, transition: `opacity ${ms}ms linear` }}>
        <SqueezeFigure dir={dir} />
      </div>
    </div>
  )
}
