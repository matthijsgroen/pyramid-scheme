import type { CSSProperties } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { campArt } from "./campScene/campArt"
import { CAMP_CATALOGUE } from "./campScene/campCatalogue"
import {
  CAMP_SHADOW_PARAMS,
  layoutCamp,
  type PlacedPiece,
  type PlacedPyramid,
  type PlacedShadow,
} from "./campScene/campLayout"
import type { CampCatalogue, CampSpotId } from "./campScene/campTypes"
import "./CampScene.css"

/** `label` is the translated name the caller composes, e.g. "Mosaic 61/252". */
export type CampEntrance = { label: string; badge?: number; onOpen: () => void }

export type CampSceneProps = {
  /** The container's size in px; the caller measures it. */
  width: number
  height: number
  chapter: Difficulty
  steps: Partial<Record<CampSpotId, number>>
  insets?: { top: number; bottom: number }
  entrances?: { chest?: CampEntrance; window?: CampEntrance; mapTable?: CampEntrance }
  catalogue?: CampCatalogue
  className?: string
}

// A piece with no art yet draws the stand-in; the scenery (sand, dunes, pyramid, pyramidGold) falls back to CSS.

const NO_INSETS = { top: 0, bottom: 0 }
const MIN_TARGET = 44

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Deterministic, so the stars hold their places across renders and resizes of the same size. */
const starField = (width: number, horizon: number) => {
  let seed = 7
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  return Array.from({ length: 70 }, () => ({ x: rnd() * width, y: rnd() * horizon * 0.9, opacity: 0.35 + rnd() * 0.6 }))
}

const duneSvg = (fill: string, amp: number) => (
  <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 40" aria-hidden="true">
    <path
      d={`M0 ${20 + amp} Q50 ${20 - amp} 100 ${20 + amp * 0.4} T200 20 T300 ${20 + amp * 0.6} T400 ${20 - amp * 0.2} V40 H0Z`}
      fill={fill}
    />
  </svg>
)

/** The screen box around every piece a spot draws: an entrance covers the whole object it opens. */
const boundsOf = (pieces: PlacedPiece[]) => {
  if (pieces.length === 0) return null
  const left = Math.min(...pieces.map(p => p.x - (p.piece.width * p.scale) / 2))
  const right = Math.max(...pieces.map(p => p.x + (p.piece.width * p.scale) / 2))
  const top = Math.min(...pieces.map(p => p.y - p.piece.height * p.scale))
  const bottom = Math.max(...pieces.map(p => p.y))
  return { x: (left + right) / 2, y: bottom, width: right - left, height: bottom - top }
}

/** Offsets keep neighbouring fires out of step; a shadow takes its fire's strength offset to stay in step. */
const flickerDelays = (i: number) => [-(i * 0.73) % 3, -(i * 1.31) % 5]

/** A piece's box: anchored bottom-centre on (left, top) by the `camp-piece` class. */
const boxOf = ({ piece, x, y, scale }: PlacedPiece) => ({
  left: x,
  top: y,
  width: piece.width * scale,
  height: piece.height * scale,
})

/**
 * The art carries its own form shading from a fixed upper-left light, so the self-shade only adds the
 * fire-relative nuance: a faint warmth on the lit side (none from the moon), a capped darkening away from it.
 */
const LIT_TINT = { fire: "rgb(255 176 92 / 0.12)", moon: "transparent" }
const AWAY_SHADE = "rgb(0 0 0 / 0.2)"

/** The contact shadow under the piece's base, shifted away from its light. */
const Shadow = ({
  shadow,
  placed,
  url,
  delay,
}: {
  shadow: PlacedShadow
  placed: PlacedPiece
  url: string
  delay?: string
}) => {
  const a = (shadow.angle * Math.PI) / 180
  return (
    <img
      className={shadow.light ? "camp-shadow camp-firelit" : "camp-shadow"}
      src={url}
      alt=""
      draggable={false}
      style={
        {
          ...boxOf(placed),
          transform: `translate(-50%, -100%) translate(${shadow.offset * Math.cos(a)}px, ${shadow.offset * Math.sin(a)}px)`,
          "--camp-strength": shadow.strength,
          animationDelay: delay,
        } as CSSProperties
      }
    />
  )
}

/**
 * Light on the side facing the light, dark on the side away from it, masked by the piece's own art so it
 * covers only the piece. A plain alpha overlay: no filter and no blend mode.
 */
const SelfShade = ({
  shadow,
  placed,
  url,
  delay,
}: {
  shadow: PlacedShadow
  placed: PlacedPiece
  url: string
  delay?: string
}) => {
  const mask = `url(${url})`
  return (
    <i
      className={shadow.light ? "camp-shade camp-firelit" : "camp-shade"}
      style={
        {
          ...boxOf(placed),
          backgroundImage: `linear-gradient(${shadow.angle + 90}deg, ${shadow.light ? LIT_TINT.fire : LIT_TINT.moon}, transparent 45%, ${AWAY_SHADE})`,
          maskImage: mask,
          WebkitMaskImage: mask,
          "--camp-strength": shadow.strength / CAMP_SHADOW_PARAMS.strengthMax,
          animationDelay: delay,
        } as CSSProperties
      }
    />
  )
}

const Piece = ({ placed, lightIndex }: { placed: PlacedPiece; lightIndex: number }) => {
  const { piece, scale, shadow } = placed
  const art = campArt(piece.id)
  const style: CSSProperties = boxOf(placed)
  if (!art)
    return (
      <div className="camp-piece camp-standin" style={{ ...style, fontSize: clamp(scale * 0.17, 8, 13) }}>
        {piece.id}
      </div>
    )
  const delay = lightIndex >= 0 ? `${flickerDelays(lightIndex)[1]}s` : undefined
  return (
    <>
      {art.shadow && shadow && <Shadow shadow={shadow} placed={placed} url={art.shadow} delay={delay} />}
      <img
        className={art.frameB ? "camp-piece camp-frame--a" : "camp-piece"}
        src={art.url}
        alt=""
        draggable={false}
        style={style}
      />
      {art.frameB && (
        <img className="camp-piece camp-frame--b" src={art.frameB} alt="" draggable={false} style={style} />
      )}
      {shadow && <SelfShade shadow={shadow} placed={placed} url={art.url} delay={delay} />}
    </>
  )
}

/** The painted pyramid when its art exists, else the CSS one; the fifth wears the golden capstone. */
const Pyramid = ({ pyramid, top }: { pyramid: PlacedPyramid; top: number }) => {
  const style: CSSProperties = { left: pyramid.x, top, width: pyramid.width, height: pyramid.height }
  const url = campArt(pyramid.golden ? "pyramidGold" : "pyramid")?.url
  if (url) return <img className="camp-pyramid camp-pyramid--art" src={url} alt="" draggable={false} style={style} />
  return (
    <div className="camp-pyramid" style={style}>
      <i className="camp-pyramid__lit" />
      <i className="camp-pyramid__shade" />
      {pyramid.golden && <i className="camp-pyramid__cap" />}
    </div>
  )
}

export const CampScene = ({
  width,
  height,
  chapter,
  steps,
  insets = NO_INSETS,
  entrances = {},
  catalogue = CAMP_CATALOGUE,
  className,
}: CampSceneProps) => {
  const rootClass = ["camp-scene", className].filter(Boolean).join(" ")
  const layout = layoutCamp({ width, height, insets, chapter, steps, catalogue })
  if (!layout) return <div className={rootClass} />

  const { unit: u, horizon } = layout
  const stars = starField(width, horizon)
  const moon = Math.max(18, u * 0.55)
  const tagSize = clamp(u * 0.2, 10, 14)
  const sand = campArt("sand")?.url
  const dunes = campArt("dunes")?.url
  const rootStyle = { "--camp-horizon": `${(horizon / height) * 100}%` } as CSSProperties

  const entranceButtons = (["chest", "window", "mapTable"] as const).flatMap(spot => {
    const entrance = entrances[spot]
    if (!entrance) return []
    const box = boundsOf(layout.pieces.filter(p => p.spot === spot))
    if (!box) return []
    const { label, badge, onOpen } = entrance
    return [
      <button
        key={spot}
        type="button"
        className="camp-entrance"
        aria-label={badge === undefined ? label : `${label} (${badge})`}
        onClick={onOpen}
        style={{
          left: box.x,
          top: box.y,
          width: Math.max(MIN_TARGET, box.width),
          height: Math.max(MIN_TARGET, box.height),
        }}
      >
        {badge !== undefined && <span className="camp-entrance__badge">{badge}</span>}
        <span className="camp-entrance__tag" style={{ fontSize: tagSize }}>
          {label}
        </span>
      </button>,
    ]
  })

  return (
    <div className={rootClass} style={rootStyle}>
      <div className="camp-layer" aria-hidden="true">
        {stars.map((star, i) => (
          <i key={i} className="camp-star" style={{ left: star.x, top: star.y, opacity: star.opacity }} />
        ))}
        <i
          className="camp-moon"
          style={
            {
              "--camp-moon": `${moon}px`,
              left: width * 0.2,
              top: insets.top + Math.max(16, (horizon - insets.top) * 0.1),
              width: moon,
              height: moon,
            } as CSSProperties
          }
        />
        <i className="camp-haze" style={{ top: horizon - u * 1.2, height: u * 1.2 }} />
        {layout.pyramids.map((p, i) => (
          <Pyramid key={i} pyramid={p} top={horizon - p.height + u * 0.12} />
        ))}
        <div
          className="camp-ground"
          style={{
            top: horizon,
            ...(sand && { background: `url(${sand}) 0 0 / ${Math.round(u * 3)}px repeat` }),
          }}
        />
        {dunes ? (
          <div
            className="camp-dune"
            style={{
              top: horizon - u * 0.6,
              height: u,
              background: `url(${dunes}) 0 100% / auto 100% repeat-x`,
            }}
          />
        ) : (
          <>
            <div className="camp-dune" style={{ top: horizon - u * 0.18, height: u * 0.5 }}>
              {duneSvg("#a98458", 6)}
            </div>
            <div className="camp-dune" style={{ top: horizon + u * 0.15, height: u * 0.6 }}>
              {duneSvg("#bb9663", 9)}
            </div>
          </>
        )}
      </div>
      <div className="camp-layer">
        {layout.pieces.map(placed => (
          <Piece
            key={placed.key}
            placed={placed}
            lightIndex={layout.glows.findIndex(g => g.key === placed.shadow?.light)}
          />
        ))}
      </div>
      <div className="camp-layer camp-night" aria-hidden="true" />
      <div className="camp-layer" aria-hidden="true">
        {layout.glows.map((glow, i) => (
          <i
            key={glow.key}
            className={`camp-glow camp-glow--${glow.mode}`}
            style={
              {
                left: glow.x,
                top: glow.y,
                width: glow.radius * 2,
                height: glow.radius * 2,
                "--camp-glow-strength": glow.strength,
                "--camp-glow-color": glow.color,
                animationDelay: flickerDelays(i)
                  .map(d => `${d}s`)
                  .join(", "),
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="camp-layer camp-entrances">{entranceButtons}</div>
    </div>
  )
}
