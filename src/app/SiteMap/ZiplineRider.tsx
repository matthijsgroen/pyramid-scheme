import { useLayoutEffect, useRef, useState } from "react"
import { CHAR_H, CHAR_W, FIGURE_LIT, FOOT_LIFT, TorchGlow } from "./ExplorerDot"
import { CELL, cellCenter } from "./mapScale"
import type { Ride } from "./useZiplineRide"

/** Map units the rider hangs above where a walking figure's feet would be: the handle meets the cable.
 * A look, tuned in the Zipline ride story. */
export const HANG = 18

/**
 * THE RIDE, DRAWN: the riding sprite hung at the launch, then slid to the landing by one CSS transition.
 * Its end is the ride's end.
 */
export const ZiplineRider = ({ ride, hang = HANG }: { ride: Ride; hang?: number }) => {
  const at = (cell: readonly [number, number]) => {
    const { cx, cy } = cellCenter(cell[0], cell[1])
    return { x: cx, y: cy }
  }
  const [pos, setPos] = useState(at(ride.traversal.from))
  const el = useRef<HTMLDivElement>(null)
  // Start at the launch, then move on the next frame so the browser has a start to transition from.
  useLayoutEffect(() => {
    // Reading layout makes the browser compute the launch style, so the move to the landing transitions.
    void el.current?.offsetWidth
    const frame = requestAnimationFrame(() => setPos(at(ride.traversal.to)))
    return () => cancelAnimationFrame(frame)
  }, [ride])
  return (
    <div
      ref={el}
      data-zipline-rider=""
      onTransitionEnd={e => {
        if (e.target === e.currentTarget) ride.end()
      }}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: 0,
        height: 0,
        pointerEvents: "none",
        transition: `left ${ride.ms}ms linear, top ${ride.ms}ms linear`,
      }}
    >
      <TorchGlow />
      <div
        data-zipline-sprite=""
        style={{
          position: "absolute",
          left: -CHAR_W / 2,
          top: CELL / 2 - CHAR_H - FOOT_LIFT - hang,
          width: CHAR_W,
          height: CHAR_H,
          transform: ride.mirrored ? "scaleX(-1)" : undefined,
          filter: FIGURE_LIT,
        }}
      >
        <img src={ride.sprite} width={CHAR_W} height={CHAR_H} alt="" />
      </div>
    </div>
  )
}
