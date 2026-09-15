import type { CSSProperties } from "react"
import { boundsOf, rectsToPath, type Rect } from "./tileRegions"

// The two primitives every HTML layer of the map is built from. See docs/instructions/map-rendering.md.

/** One sprite standing in the map: a box with the art as its background.
 *
 * `stretch` is `preserveAspectRatio="none"` by another name — the art fills the box. Off, the sprite is
 * fitted inside it and centred, which is what an `<image>` did by default and what the few sprites drawn
 * in a box of the wrong shape relied on.
 *
 * `clipTo` is the shape the sprite is cut to, as rectangles in MAP coordinates. Taking one changes the
 * element's box: a clip resolves in the element's OWN box, so the sprite is laid out over the CLIP's box —
 * never over the whole map, which is what a phone's renderer cannot afford (see `rectsToPath`) — with the
 * art placed inside it by `background-position`. */
export const Sprite = ({
  url,
  x,
  y,
  w,
  h,
  stretch = true,
  opacity,
  filter,
  transform,
  clipTo,
  mirrored,
  ...rest
}: {
  url: string
  x: number
  y: number
  w: number
  h: number
  stretch?: boolean
  opacity?: number
  filter?: string
  transform?: string
  clipTo?: readonly Rect[]
  /** Mirrored in x — how a stair is aimed. A reflection is a real oblique view; a rotation is a skew. */
  mirrored?: boolean
} & Record<`data-${string}`, string | undefined>) => {
  const art: CSSProperties = { backgroundImage: `url(${url})`, backgroundRepeat: "no-repeat" }
  const flip = mirrored ? "scaleX(-1)" : undefined
  const both = [transform, flip].filter(Boolean).join(" ") || undefined
  if (clipTo && clipTo.length > 0) {
    const box = boundsOf(clipTo)
    return (
      <div
        {...rest}
        style={{
          position: "absolute",
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          clipPath: `path("${rectsToPath(clipTo, [box.x, box.y])}")`,
          backgroundSize: `${w}px ${h}px`,
          backgroundPosition: `${x - box.x}px ${y - box.y}px`,
          transformOrigin: `${x - box.x + w / 2}px ${y - box.y + h / 2}px`,
          opacity,
          filter,
          transform: both,
          ...art,
        }}
      />
    )
  }
  return (
    <div
      {...rest}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundSize: stretch ? "100% 100%" : "contain",
        backgroundPosition: "center",
        opacity,
        filter,
        transform: both,
        ...art,
      }}
    />
  )
}

/** A layer cut to a run of rectangles: the shape is the drawing, and the element is the size of the shape.
 * Never the size of the map — see `rectsToPath`. */
export const ClipLayer = ({
  rects,
  fill,
  opacity,
  className,
  style,
  feather = 0,
  ...rest
}: {
  rects: readonly Rect[]
  fill: string
  opacity?: number
  className?: string
  /** Merged UNDER the box's own geometry, so a caller can hand the element a custom property — the
   * strength an animation fades to, say — without being able to move the layer off its shape. */
  style?: CSSProperties
  /** Soften the cut edge by this many units, instead of ending the layer on the path exactly.
   *
   * A clip is a decision with no middle: every pixel is in the shape or out of it. That is what a wall
   * is, and it is not what LIGHT is — the lit place ended on a rectangle drawn around a room, which read
   * as a bright tile laid on the floor rather than as a lamp burning in the middle of one.
   *
   * THE BLUR CANNOT GO ON THIS ELEMENT. A filter is applied BEFORE the clip (CSS Filter Effects §2.2), so
   * a blurred box cut to a path comes back with the same hard path. It has to go on a PARENT: the child
   * is clipped, the parent rasterises that result and softens it, and the light spills a little past the
   * shape — onto the wall a lamp in the room would be lighting anyway.
   *
   * WHAT IT IS RASTERISED AT IS THIS LAYER'S OWN BOX, never the map's: a filter rasterises its subtree as
   * one layer, which is the same reason `STANDING_RELIEF` is per sprite rather than on the layer holding
   * the sprites (docs/instructions/map-rendering.md). So the element keeps its box, its identity and its
   * animation, and only the PAINT moves down a level to be something the blur can be applied TO. */
  feather?: number
} & Record<`data-${string}`, string | undefined>) => {
  if (rects.length === 0) return null
  const box = boundsOf(rects)
  const cut: CSSProperties = {
    clipPath: `path("${rectsToPath(rects, [box.x, box.y])}")`,
    background: fill,
  }
  const placed: CSSProperties = {
    ...style,
    position: "absolute",
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    opacity,
  }
  // The layer stays the layer — same box, same identity, same animation. Only the PAINT moves down a
  // level, because the softening has to happen to an already-cut shape and cannot happen to this one.
  if (feather)
    return (
      <div {...rest} className={className} style={{ ...placed, filter: `blur(${feather}px)` }}>
        <div style={{ position: "absolute", inset: 0, ...cut }} />
      </div>
    )
  return <div {...rest} className={className} style={{ ...placed, ...cut }} />
}
