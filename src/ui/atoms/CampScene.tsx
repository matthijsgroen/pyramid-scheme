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

/*
 * The camp at night. The night lives in the sky, a vignette over the ground's edges and a cool tone on the far
 * sand; the camp itself keeps its colour, and its lights saturate the sand around them.
 */
const SCENE = [
  "relative size-full animate-camp-settle overflow-hidden",
  "bg-[linear-gradient(#0f1733_0%,#1f2b5c,#3b3466_var(--camp-horizon,62%),#a87245_var(--camp-horizon,62%))]",
].join(" ")
const LAYER = "pointer-events-none absolute inset-0"
const STAR = "absolute size-[2px] rounded-[50%] bg-[#f6efdc]"
const STAR_TWINKLE = [
  "absolute size-[3px] animate-camp-twinkle rounded-[50%] bg-[#f6efdc] motion-reduce:animate-none",
  "shadow-[0_0_4px_1px_rgb(246_239_220/0.6)]",
].join(" ")
const MOON =
  "absolute rounded-[50%] shadow-[inset_calc(var(--camp-moon)*-0.28)_calc(var(--camp-moon)*-0.05)_0_0_#f3ecd6]"
const HAZE = "absolute inset-x-0 bg-[linear-gradient(transparent,rgb(140_90_150/0.55))]"
const PYRAMID = "absolute [transform:translateX(-50%)]"
const PYRAMID_ART = "absolute [transform:translateX(-50%)] object-contain object-[50%_100%] select-none"
const PYRAMID_LIT = [
  "absolute bottom-0 left-0 h-full w-1/2 bg-[#a88a64]",
  "[clip-path:polygon(100%_0,100%_100%,0_100%)]",
].join(" ")
const PYRAMID_SHADE = [
  "absolute right-0 bottom-0 h-full w-1/2 bg-[#7d6447]",
  "[clip-path:polygon(0_0,100%_100%,0_100%)]",
].join(" ")
/** The capstone is the pyramid's own tip: a share of its height is the same share of its width. Lit and shaded
 * halves follow the faces below it. */
const PYRAMID_CAP = [
  "absolute top-0 left-1/2 h-[14%] w-[14%] [transform:translateX(-50%)]",
  "bg-[linear-gradient(90deg,#f4cf5c_50%,#c99a2e_50%)]",
  "[clip-path:polygon(50%_0,100%_100%,0_100%)]",
].join(" ")
/** The trailing `none` keeps the colour a layer of its own, which paints the sand's gradients as the shorthand did. */
const GROUND = [
  "absolute inset-x-0 bottom-0 bg-[#a27552]",
  "bg-[image:radial-gradient(ellipse_at_20%_30%,rgb(255_255_255/0.05),transparent_40%),radial-gradient(ellipse_at_70%_60%,rgb(0_0_0/0.06),transparent_45%),repeating-linear-gradient(172deg,rgb(120_80_40/0.1)_0_2px,transparent_2px_22px),none]",
].join(" ")
/**
 * A tint over the sand, painted art or CSS alike: warm ochre at the camp's middle, darker and cooler toward
 * the edges, and a cool night tone on the far sand at the horizon. Plain alpha, no blend.
 */
const GROUND_TINT = [
  "absolute inset-x-0 bottom-0",
  "bg-[image:linear-gradient(rgb(70_70_120/0.45),rgb(70_70_120/0.15)_22%,transparent_45%),radial-gradient(ellipse_75%_65%_at_var(--camp-cx,50%)_var(--camp-cy,55%),rgb(214_140_60/0.2),rgb(214_140_60/0.05)_55%,rgb(60_30_30/0.25)_100%)]",
].join(" ")
/** The night closing in on the ground's edges, over the pieces too: about 0.35 at the corners. */
const VIGNETTE = [
  "absolute inset-x-0 bottom-0",
  "bg-[image:radial-gradient(farthest-corner_at_var(--camp-cx,50%)_var(--camp-cy,55%),transparent_45%,rgb(20_14_30/0.35))]",
].join(" ")
const DUNE = "absolute inset-x-0"

/** Pieces are anchored bottom-centre on their (left, top) point. */
const PIECE = "absolute [transform:translate(-50%,-100%)] select-none"
const STAND_IN = [
  "flex items-end justify-center overflow-hidden border-[1.5px] border-[rgb(40_25_10/0.7)] bg-[#9a8466] pb-[2px]",
  "rounded-[40%_40%_8%_8%/30%_30%_8%_8%] text-center leading-[1.1] font-bold text-[#f6ecd8]",
].join(" ")

/**
 * One layer per piece, filling the scene, so a piece fades together with its shadow, self-shade and frames.
 * A piece that mounts visible starts from 0; one a later step replaces fades to 0 and takes no input. Steps
 * fade, the opening does not: only a settled scene (`--camp-settled`) fades its pieces.
 */
const FADE = [
  "pointer-events-none absolute inset-0",
  "[@container_style(--camp-settled:1)]:motion-safe:[transition:opacity_0.4s_ease]",
  "[@container_style(--camp-settled:1)]:starting:opacity-0",
].join(" ")
const FADE_SHOWN = `${FADE} opacity-100`
const FADE_HIDDEN = `${FADE} opacity-0 [&_*]:animate-none!`

/**
 * The contact shadow and the self-shade sit in the piece's box. Both are plain alpha layers: the shadow is
 * pre-blurred at import, and only transform and opacity are set here, so nothing filters or repaints at runtime.
 */
const SHADOW = "absolute opacity-[var(--camp-strength,0.3)] select-none"
const FIRELIT = "animate-camp-strength-flicker motion-reduce:animate-none"
const MASKED =
  "[mask-repeat:no-repeat] [mask-size:100%_100%] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:100%_100%]"
/** Sheared about the line the art stands on, set per piece from its measured foot. */
const CAST = `absolute bg-black opacity-[calc(var(--camp-strength,0.3)*0.7)] select-none ${MASKED}`
const SHADE = `absolute [transform:translate(-50%,-100%)] opacity-[var(--camp-strength,0.3)] select-none ${MASKED}`

const FRAME_A = "animate-camp-frame-a motion-reduce:animate-none"
const FRAME_B = "animate-camp-frame-b motion-reduce:hidden"

const GLOW = "absolute [transform:translate(-50%,-50%)] rounded-[50%] opacity-[var(--camp-glow-strength,1)]"
/** The wide pool deepens the warmth and chroma of the sand and the pieces under it. */
const GLOW_POOL = [
  "mix-blend-soft-light",
  "bg-[image:radial-gradient(closest-side,var(--camp-glow-color)_20%,color-mix(in_srgb,var(--camp-glow-color)_55%,transparent)_50%,transparent)]",
].join(" ")
/** The small core brightens toward the source itself. */
const GLOW_CORE = [
  "mix-blend-screen",
  "bg-[image:radial-gradient(closest-side,color-mix(in_srgb,var(--camp-glow-color)_50%,transparent),color-mix(in_srgb,var(--camp-glow-color)_15%,transparent)_45%,transparent)]",
].join(" ")
const GLOW_MODE = {
  flicker: "animate-camp-flicker motion-reduce:animate-none",
  breathe: "animate-camp-breathe motion-reduce:animate-none",
}
const EMBER = [
  "absolute -mt-[1.5px] -ml-[1.5px] size-[3px] rounded-[50%] bg-[#ffd27a] opacity-0 motion-reduce:hidden",
  "shadow-[0_0_3px_1px_rgb(255_150_50/0.7)]",
].join(" ")
const EMBER_RIGHT = `${EMBER} animate-camp-ember`
const EMBER_LEFT = `${EMBER} animate-camp-ember-left`

const ENTRANCE = [
  "pointer-events-auto absolute flex [transform:translate(-50%,-100%)] cursor-pointer flex-col items-center justify-end",
  "border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0b33f]",
].join(" ")
const ENTRANCE_TAG = [
  "translate-y-[calc(100%+4px)] rounded-[10px] border-[1.5px] border-[#2b2118] bg-[#fff6e2] px-[9px] py-[2px]",
  "font-extrabold whitespace-nowrap text-[#2b2118]",
].join(" ")
const ENTRANCE_BADGE = [
  "absolute top-0 right-0 box-border h-[20px] min-w-[20px] rounded-[10px] bg-[#a3401a] px-[4px]",
  "text-center text-[11px] leading-[20px] font-extrabold text-[#fff8ea]",
].join(" ")

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

/** A piece's box: anchored bottom-centre on (left, top) by the `PIECE` classes. */
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
      className={shadow.light ? `camp-shadow ${SHADOW} ${FIRELIT}` : `camp-shadow ${SHADOW}`}
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
      className={shadow.light ? `${CAST} ${FIRELIT}` : CAST}
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
      className={shadow.light ? `camp-shade ${SHADE} ${FIRELIT}` : `camp-shade ${SHADE}`}
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
  <div className={visible ? `camp-fade ${FADE_SHOWN}` : `camp-fade camp-fade--hidden ${FADE_HIDDEN}`}>{children}</div>
)

const Piece = ({ placed, lightIndex }: { placed: PlacedPiece; lightIndex: number }) => {
  const { piece, scale, shadow } = placed
  const art = campArt(piece.id, placed.layer)
  const style: CSSProperties = boxOf(placed)
  if (!art)
    return (
      <Fade visible={placed.visible}>
        <div
          className={`camp-piece camp-standin ${PIECE} ${STAND_IN}`}
          style={{ ...style, fontSize: clamp(scale * 0.17, 8, 13) }}
        >
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
        className={art.frameB ? `camp-piece camp-frame--a ${PIECE} ${FRAME_A}` : `camp-piece ${PIECE}`}
        src={art.url}
        alt=""
        draggable={false}
        style={style}
      />
      {art.frameB && (
        <img
          className={`camp-piece camp-frame--b ${PIECE} ${FRAME_B}`}
          src={art.frameB}
          alt=""
          draggable={false}
          style={style}
        />
      )}
      {shadow && <SelfShade shadow={shadow} placed={placed} url={art.url} delay={delay} />}
    </Fade>
  )
}

/** The painted pyramid when its art exists, else the CSS one; the fifth wears the golden capstone. */
const Pyramid = ({ pyramid, top }: { pyramid: PlacedPyramid; top: number }) => {
  const style: CSSProperties = { left: pyramid.x, top, width: pyramid.width, height: pyramid.height }
  const url = campArt(pyramid.golden ? "pyramidGold" : "pyramid")?.url
  if (url) return <img className={PYRAMID_ART} src={url} alt="" draggable={false} style={style} />
  return (
    <div className={PYRAMID} style={style}>
      <i className={PYRAMID_LIT} />
      <i className={PYRAMID_SHADE} />
      {pyramid.golden && <i className={PYRAMID_CAP} />}
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
  const rootClass = [SCENE, className].filter(Boolean).join(" ")
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
        className={ENTRANCE}
        aria-label={badge === undefined ? label : `${label} (${badge})`}
        onClick={onOpen}
        style={{ left: area.x, top: area.y + area.height / 2, width: area.width, height: area.height }}
      >
        {badge !== undefined && <span className={ENTRANCE_BADGE}>{badge}</span>}
        <span className={ENTRANCE_TAG} style={{ fontSize: tagSize }}>
          {label}
        </span>
      </button>
    )
  })

  return (
    <div className={rootClass} style={rootStyle}>
      <div className={LAYER} aria-hidden="true">
        {stars.map((star, i) => (
          <i
            key={i}
            className={star.twinkle ? `camp-star camp-star--twinkle ${STAR_TWINKLE}` : `camp-star ${STAR}`}
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
          className={MOON}
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
        <i className={HAZE} style={{ top: horizon - u * 1.2, height: u * 1.2 }} />
        {layout.pyramids.map((p, i) => (
          <Pyramid key={i} pyramid={p} top={horizon - p.height + u * 0.12} />
        ))}
        <div
          className={GROUND}
          style={{
            top: horizon,
            ...(sand && { background: `url(${sand}) 0 0 / ${Math.round(u * 3)}px repeat` }),
          }}
        />
        {dunes ? (
          <div
            className={DUNE}
            style={{
              top: horizon - u * 0.6,
              height: u,
              background: `url(${dunes}) 0 100% / auto 100% repeat-x`,
            }}
          />
        ) : (
          <>
            <div className={DUNE} style={{ top: horizon - u * 0.18, height: u * 0.5 }}>
              {duneSvg("#a98458", 6)}
            </div>
            <div className={DUNE} style={{ top: horizon + u * 0.15, height: u * 0.6 }}>
              {duneSvg("#bb9663", 9)}
            </div>
          </>
        )}
        <div className={GROUND_TINT} style={{ top: horizon, ...centre }} />
      </div>
      <div className={LAYER}>
        {pieces.map(placed => (
          <Piece key={placed.key} placed={placed} lightIndex={glows.findIndex(g => g.key === placed.shadow?.light)} />
        ))}
      </div>
      <div className={LAYER} aria-hidden="true">
        <div className={VIGNETTE} style={{ top: horizon, ...centre }} />
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
                className={`camp-glow camp-glow--pool camp-glow--${glow.mode} ${GLOW} ${GLOW_POOL} ${GLOW_MODE[glow.mode]}`}
                style={glowStyle(POOL_REACH, glow.floor)}
              />
              <i
                className={`camp-glow camp-glow--core camp-glow--${glow.mode} ${GLOW} ${GLOW_CORE} ${GLOW_MODE[glow.mode]}`}
                style={glowStyle(CORE_REACH, glow.y)}
              />
              {glow.mode === "flicker" &&
                embers(i, u).map((ember, j) => (
                  <i
                    key={j}
                    className={
                      ember.driftLeft ? `camp-ember camp-ember--left ${EMBER_LEFT}` : `camp-ember ${EMBER_RIGHT}`
                    }
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
      <div className={`${LAYER} [font-family:inherit]`}>{entranceButtons}</div>
    </div>
  )
}
