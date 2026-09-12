import type { CSSProperties } from "react"

// The two primitives every HTML layer of the map is built from. See docs/instructions/map-html-port.md.

/** One sprite standing in the map: a box with the art as its background.
 *
 * `stretch` is `preserveAspectRatio="none"` by another name — the art fills the box. Off, the sprite is
 * fitted inside it and centred, which is what an `<image>` did by default and what the few sprites drawn
 * in a box of the wrong shape relied on.
 *
 * `clipTo` is a path in MAP coordinates, and taking one changes the shape of the element: a clip resolves
 * in the element's OWN box, so a sprite that must be cut to a room's footprint is laid out as a full-map
 * layer with the art placed by `background-position` instead of by `left`/`top`. Same trick as the stone
 * layers, and the reason a footprint path needs no translating. */
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
  clipTo?: string
  /** Mirrored in x — how a stair is aimed. A reflection is a real oblique view; a rotation is a skew. */
  mirrored?: boolean
} & Record<`data-${string}`, string | undefined>) => {
  const art: CSSProperties = { backgroundImage: `url(${url})`, backgroundRepeat: "no-repeat" }
  const flip = mirrored ? "scaleX(-1)" : undefined
  const both = [transform, flip].filter(Boolean).join(" ") || undefined
  return clipTo ? (
    <div
      {...rest}
      style={{
        position: "absolute",
        inset: 0,
        clipPath: `path("${clipTo}")`,
        backgroundSize: `${w}px ${h}px`,
        backgroundPosition: `${x}px ${y}px`,
        transformOrigin: `${x + w / 2}px ${y + h / 2}px`,
        opacity,
        filter,
        transform: both,
        ...art,
      }}
    />
  ) : (
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

/** A layer the size of the map, cut to a path in map coordinates: the shape is the drawing. */
export const ClipLayer = ({
  path,
  fill,
  opacity,
  className,
  ...rest
}: {
  path: string
  fill: string
  opacity?: number
  className?: string
} & Record<`data-${string}`, string | undefined>) => (
  <div
    {...rest}
    className={className}
    style={{ position: "absolute", inset: 0, clipPath: `path("${path}")`, background: fill, opacity }}
  />
)
