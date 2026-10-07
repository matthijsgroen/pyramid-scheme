import { useLayoutEffect, useRef, useState } from "react"
import { headingOf } from "@/game/passages"
import type { Direction } from "@/game/siteTypes"
import { FIGURE_LIT, FOOT_LIFT, TorchGlow } from "./ExplorerDot"
import { CELL, cellCenter } from "./mapScale"
import { squeezeSprite, type Squeeze } from "./useSqueeze"

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

/**
 * THE SQUEEZE: the pose stands on the near side, slides into the wall's cell, then out to the far side, one CSS
 * transition per leg. The second leg's end is the crossing's end. Each leg wears its own heading, so a crack at a
 * corner turns the explorer with it.
 */
export const SqueezeRider = ({ squeeze }: { squeeze: Squeeze }) => {
  const { from, via, to } = squeeze.traversal
  const [leg, setLeg] = useState<Leg>("from")
  const el = useRef<HTMLDivElement>(null)
  // Start on the near side, then move on the next frame so the browser has a start to transition from.
  useLayoutEffect(() => {
    void el.current?.offsetWidth
    const frame = requestAnimationFrame(() => setLeg("via"))
    return () => cancelAnimationFrame(frame)
  }, [squeeze])
  const { x, y } = squeezeFoot(leg === "from" ? from : leg === "via" ? via : to)
  return (
    <div
      ref={el}
      data-squeeze-rider={leg}
      onTransitionEnd={e => {
        if (e.target !== e.currentTarget) return
        if (leg === "via") setLeg("to")
        else if (leg === "to") squeeze.end()
      }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        pointerEvents: "none",
        transition: `left ${squeeze.msPerLeg}ms linear, top ${squeeze.msPerLeg}ms linear`,
      }}
    >
      <SqueezeFigure dir={leg === "to" ? headingOf(via, to) : headingOf(from, via)} />
    </div>
  )
}
