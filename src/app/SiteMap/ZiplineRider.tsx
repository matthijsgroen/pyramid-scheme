import { useLayoutEffect, useRef, useState } from "react"
import { poseFor, RIDE_POSES, type RidePose, type RidePoses } from "./ridePoses"
import { CHAR_H, CHAR_W, FIGURE_LIT, FOOT_LIFT, TorchGlow } from "./ExplorerDot"
import { CELL, cellCenter } from "./mapScale"
import type { Ride } from "./useZiplineRide"

const centre = (cell: readonly [number, number]) => {
  const { cx, cy } = cellCenter(cell[0], cell[1])
  return { x: cx, y: cy }
}

/** The rider's light and sprite, hung from the handle point (the origin of the element they sit in). */
const RiderBody = ({ ride, scale }: { ride: Ride; scale: number }) => {
  const w = CHAR_W * scale
  const h = CHAR_H * scale
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${h - CELL / 2 + FOOT_LIFT}px)` }}>
        <TorchGlow />
      </div>
      <div
        data-zipline-sprite=""
        style={{
          position: "absolute",
          left: -w / 2,
          top: 0,
          width: w,
          height: h,
          transform: ride.mirrored ? "scaleX(-1)" : undefined,
          filter: FIGURE_LIT,
        }}
      >
        <img src={ride.sprite} width={w} height={h} alt="" />
      </div>
    </>
  )
}

/** The rider standing still at one end of the ride: the pose's start or end. */
export const RiderSprite = ({ ride, at, pose }: { ride: Ride; at: "from" | "to"; pose: RidePose }) => {
  const c = centre(ride.traversal[at])
  const p = pose[at]
  return (
    <div
      data-zipline-frame={at}
      style={{ position: "absolute", left: c.x + p.x, top: c.y + p.y, width: 0, height: 0, pointerEvents: "none" }}
    >
      <RiderBody ride={ride} scale={pose.scale} />
    </div>
  )
}

/**
 * THE RIDE, DRAWN: the riding sprite hung at the launch, then slid to the landing by one CSS transition.
 * Its end is the ride's end.
 */
export const ZiplineRider = ({ ride, poses = RIDE_POSES }: { ride: Ride; poses?: RidePoses }) => {
  const pose = poseFor(ride.traversal.dir, poses)
  const at = (end: "from" | "to") => {
    const c = centre(ride.traversal[end])
    return { x: c.x + pose[end].x, y: c.y + pose[end].y }
  }
  const [pos, setPos] = useState(at("from"))
  const el = useRef<HTMLDivElement>(null)
  // Start at the launch, then move on the next frame so the browser has a start to transition from.
  useLayoutEffect(() => {
    // Reading layout makes the browser compute the launch style, so the move to the landing transitions.
    void el.current?.offsetWidth
    const frame = requestAnimationFrame(() => setPos(at("to")))
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
      <RiderBody ride={ride} scale={pose.scale} />
    </div>
  )
}
