import { Fragment, type CSSProperties, type ReactNode } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { campArt, campFoot } from "./campScene/campArt"
import { CAMP_CATALOGUE } from "./campScene/campCatalogue"
import {
  CAMP_SHADOW_PARAMS,
  entranceAreas,
  layoutCamp,
  type PlacedPiece,
  type PlacedPyramid,
  type PlacedShadow,
} from "./campScene/campLayout"
import type { CampCatalogue, CampFound } from "./campScene/campTypes"
import "./CampScene.css"

/** `label` is the translated name the caller composes, e.g. "Mosaic 61/252". */
export type CampEntrance = { label: string; badge?: number; onOpen: () => void }

export type CampSceneProps = {
  /** The container's size in px; the caller measures it. */
  width: number
  height: number
  chapter: Difficulty
  /** Per spot, the pieces found so far, in any order. */
  found: CampFound
  insets?: { top: number; bottom: number }
  entrances?: { chest?: CampEntrance; window?: CampEntrance; mapTable?: CampEntrance }
  catalogue?: CampCatalogue
  className?: string
  /**
   * Draws a labelled box for a piece whose art is still owed. For Storybook only: the app never passes it,
   * so there a piece without art leaves its spot bare and offers no entrance.
   */
  standIns?: boolean
}

// The scenery (sand, dunes, pyramid, pyramidGold) falls back to CSS when its art is missing.

const NO_INSETS = { top: 0, bottom: 0 }
/** Entrance labels stay readable however far the camera zooms out. */
const TAG_MIN = 11

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Deterministic, so the stars hold their places across renders and resizes of the same size. */
const starField = (width: number, horizon: number) => {
  let seed = 7
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  return Array.from({ length: 70 }, (_, i) => ({
    x: rnd() * width,
    y: rnd() * horizon * 0.9,
    opacity: 0.35 + rnd() * 0.6,
    twinkle: i % TWINKLE_EVERY === 0,
  }))
}

/** One star in seven twinkles: ten of the seventy. */
const TWINKLE_EVERY = 7

/** Embers per burning light: enough to read as sparks, few enough to stay cheap. */
const EMBERS = 7

/** Deterministic per light, so embers keep their paths across renders. */
const embers = (index: number, unit: number) =>
  Array.from({ length: EMBERS }, (_, i) => {
    const t = (i * 0.618 + index * 0.37) % 1
    return {
      dx: (t - 0.5) * unit * 0.35,
      driftLeft: (i * 0.382 + index * 0.21) % 1 < 0.5,
      rise: unit * (0.9 + t * 0.7),
      duration: 2.2 + ((i * 0.29) % 1) * 1.4,
      delay: -((i * 0.47 + index * 0.13) % 1) * 3.6,
    }
  })

/** A light's wide pool reaches past its core and is centred on its piece's foot, where the light lands on the sand. */
const POOL_REACH = 1.5
const CORE_REACH = 0.45

const duneSvg = (fill: string, amp: number) => (
  <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 40" aria-hidden="true">
    <path
      d={`M0 ${20 + amp} Q50 ${20 - amp} 100 ${20 + amp * 0.4} T200 20 T300 ${20 + amp * 0.6} T400 ${20 - amp * 0.2} V40 H0Z`}
      fill={fill}
    />
  </svg>
)

/** Offsets keep neighbouring fires out of step; a shadow takes its fire's strength offset to stay in step. */
const flickerDelays = (i: number) => [-(i * 0.73) % 3, -(i * 1.31) % 5]

/** A piece's box: anchored bottom-centre on (left, top) by the `camp-piece` class. */
const boxOf = ({ x, y, width, height }: PlacedPiece) => ({ left: x, top: y, width, height })

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
 * The piece's own silhouette laid on the sand away from its light, like the decorations beside a pyramid:
 * the art as a black mask, sheared about the line its picture stands on so its top lands `length` of its height
 * away. Opt-in per piece (`cast`), since a silhouette does not suit every object.
 */
const CastShadow = ({
  shadow,
  placed,
  url,
  length,
  foot,
  delay,
}: {
  shadow: PlacedShadow
  placed: PlacedPiece
  url: string
  length: number
  foot: number
  delay?: string
}) => {
  const a = (shadow.angle * Math.PI) / 180
  const mask = `url(${url})`
  return (
    <i
      className={shadow.light ? "camp-cast camp-firelit" : "camp-cast"}
      style={
        {
          ...boxOf(placed),
          transform: `translate(-50%, -100%) matrix(1, 0, ${-length * Math.cos(a)}, ${-length * Math.sin(a)}, 0, 0)`,
          transformOrigin: `50% ${foot * 100}%`,
          maskImage: mask,
          WebkitMaskImage: mask,
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

/**
 * A piece and everything drawn with it, as one layer that fades. A step that replaces another mounts
 * visible and fades in from 0 while the replaced one, still mounted, fades out.
 */
const Fade = ({ visible, children }: { visible: boolean; children: ReactNode }) => (
  <div className={visible ? "camp-fade" : "camp-fade camp-fade--hidden"}>{children}</div>
)

const Piece = ({ placed, lightIndex }: { placed: PlacedPiece; lightIndex: number }) => {
  const { piece, scale, shadow } = placed
  const art = campArt(piece.id, placed.layer)
  const style: CSSProperties = boxOf(placed)
  if (!art)
    return (
      <Fade visible={placed.visible}>
        <div className="camp-piece camp-standin" style={{ ...style, fontSize: clamp(scale * 0.17, 8, 13) }}>
          {piece.id}
        </div>
      </Fade>
    )
  const delay = lightIndex >= 0 ? `${flickerDelays(lightIndex)[1]}s` : undefined
  return (
    <Fade visible={placed.visible}>
      {piece.cast && shadow && (
        <CastShadow
          shadow={shadow}
          placed={placed}
          url={art.url}
          length={piece.cast}
          foot={campFoot(piece.id) ?? 1}
          delay={delay}
        />
      )}
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
    </Fade>
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
  found,
  insets = NO_INSETS,
  entrances = {},
  catalogue = CAMP_CATALOGUE,
  className,
  standIns = false,
}: CampSceneProps) => {
  const rootClass = ["camp-scene", className].filter(Boolean).join(" ")
  const layout = layoutCamp({ width, height, insets, chapter, found, catalogue })
  if (!layout) return <div className={rootClass} />

  const { unit: u, horizon } = layout
  const bare = standIns ? [] : layout.pieces.filter(p => !campArt(p.piece.id, p.layer))
  const pieces = layout.pieces.filter(p => !bare.includes(p))
  const glows = layout.glows.filter(g => !bare.some(p => g.key.startsWith(`${p.key}:`)))
  const stars = starField(width, horizon)
  const moon = Math.max(18, u * 0.55)
  const tagSize = clamp(u * 0.2, TAG_MIN, 14)
  const sand = campArt("sand")?.url
  const dunes = campArt("dunes")?.url
  // The camp's middle, as shares of the ground below the horizon: the sand is warmest there.
  const centre = {
    "--camp-cx": `${((layout.frame.x + layout.frame.width / 2) / width) * 100}%`,
    "--camp-cy": `${((layout.frame.y + layout.frame.height / 2 - horizon) / (height - horizon)) * 100}%`,
  } as CSSProperties
  const rootStyle = { "--camp-horizon": `${(horizon / height) * 100}%` } as CSSProperties

  const entranceSpots = (["chest", "window", "mapTable"] as const).filter(spot => entrances[spot])
  const entranceButtons = entranceAreas(pieces, entranceSpots).map(area => {
    const { label, badge, onOpen } = entrances[area.spot as (typeof entranceSpots)[number]]!
    return (
      <button
        key={area.spot}
        type="button"
        className="camp-entrance"
        aria-label={badge === undefined ? label : `${label} (${badge})`}
        onClick={onOpen}
        style={{ left: area.x, top: area.y + area.height / 2, width: area.width, height: area.height }}
      >
        {badge !== undefined && <span className="camp-entrance__badge">{badge}</span>}
        <span className="camp-entrance__tag translate-y-[calc(100%+4px)]" style={{ fontSize: tagSize }}>
          {label}
        </span>
      </button>
    )
  })

  return (
    <div className={rootClass} style={rootStyle}>
      <div className="camp-layer" aria-hidden="true">
        {stars.map((star, i) => (
          <i
            key={i}
            className={star.twinkle ? "camp-star camp-star--twinkle" : "camp-star"}
            style={
              {
                left: star.x,
                top: star.y,
                opacity: star.opacity,
                animationDelay: star.twinkle ? `${-((i * 0.61) % 1) * 4}s` : undefined,
              } as CSSProperties
            }
          />
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
        <div className="camp-ground-tint" style={{ top: horizon, ...centre }} />
      </div>
      <div className="camp-layer">
        {pieces.map(placed => (
          <Piece key={placed.key} placed={placed} lightIndex={glows.findIndex(g => g.key === placed.shadow?.light)} />
        ))}
      </div>
      <div className="camp-layer" aria-hidden="true">
        <div className="camp-vignette" style={{ top: horizon, ...centre }} />
        {glows.map((glow, i) => {
          const glowStyle = (reach: number, top: number) =>
            ({
              left: glow.x,
              top,
              width: glow.radius * reach * 2,
              height: glow.radius * reach * 2,
              "--camp-glow-strength": glow.strength,
              "--camp-glow-color": glow.color,
              animationDelay: flickerDelays(i)
                .map(d => `${d}s`)
                .join(", "),
            }) as CSSProperties
          return (
            <Fragment key={glow.key}>
              <i
                className={`camp-glow camp-glow--pool camp-glow--${glow.mode}`}
                style={glowStyle(POOL_REACH, glow.floor)}
              />
              <i
                className={`camp-glow camp-glow--core camp-glow--${glow.mode}`}
                style={glowStyle(CORE_REACH, glow.y)}
              />
              {glow.mode === "flicker" &&
                embers(i, u).map((ember, j) => (
                  <i
                    key={j}
                    className={ember.driftLeft ? "camp-ember camp-ember--left" : "camp-ember"}
                    style={
                      {
                        left: glow.x + ember.dx,
                        top: glow.y,
                        fontSize: ember.rise,
                        animationDuration: `${ember.duration}s`,
                        animationDelay: `${ember.delay}s`,
                      } as CSSProperties
                    }
                  />
                ))}
            </Fragment>
          )
        })}
      </div>
      <div className="camp-layer camp-entrances">{entranceButtons}</div>
    </div>
  )
}
