import type { CSSProperties } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { CAMP_CATALOGUE } from "./campScene/campCatalogue"
import { layoutCamp, type PlacedPiece, type PlacedPyramid } from "./campScene/campLayout"
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

// The filename is the piece id, so adding a piece's art is dropping its file in. A piece with no file yet
// draws the stand-in; the scenery (sand, dunes, pyramid, pyramidGold) falls back to CSS.
const artUrls = import.meta.glob("../../assets/camp/*.{png,webp,svg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>
const artByKey = new Map(
  Object.entries(artUrls).map(([path, url]) => [path.replace(/^.*\/([^/]+)\.\w+$/, "$1"), url] as const)
)

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

const Piece = ({ placed }: { placed: PlacedPiece }) => {
  const { piece, x, y, scale } = placed
  const url = artByKey.get(piece.id)
  const style: CSSProperties = { left: x, top: y, width: piece.width * scale, height: piece.height * scale }
  if (url) return <img className="camp-piece" src={url} alt="" draggable={false} style={style} />
  return (
    <div className="camp-piece camp-standin" style={{ ...style, fontSize: clamp(scale * 0.17, 8, 13) }}>
      {piece.id}
    </div>
  )
}

/** The painted pyramid when its art exists, else the CSS one; the fifth wears the golden capstone. */
const Pyramid = ({ pyramid, top }: { pyramid: PlacedPyramid; top: number }) => {
  const style: CSSProperties = { left: pyramid.x, top, width: pyramid.width, height: pyramid.height }
  const url = artByKey.get(pyramid.golden ? "pyramidGold" : "pyramid")
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
  const sand = artByKey.get("sand")
  const dunes = artByKey.get("dunes")
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
          <Piece key={placed.key} placed={placed} />
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
                // Offsets keep neighbouring glows out of step with one another.
                animationDelay: `${-(i * 0.73) % 3}s, ${-(i * 1.31) % 5}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="camp-layer camp-entrances">{entranceButtons}</div>
    </div>
  )
}
