import type { FC } from "react"
import clsx from "clsx"

type GearIconProps = {
  /** Rendered pixel size (square). Defaults to 20 — the size the icon font rendered at. */
  size?: number
  /** Accessible name. Omit when a labelled control already names the action; the shape is then decorative. */
  title?: string
  className?: string
}

const TOOTH_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

// The settings gear, drawn rather than pulled from an icon font: `settings` was the only glyph the app
// ever used out of a 391K Material Icons .otf, loaded on every page. Eight teeth on a stroked ring, so
// the hub is simply the hole in the middle. Strokes use currentColor, so the header's text colour and
// its hover state carry over exactly as they did when this was a character in a font.
export const GearIcon: FC<GearIconProps> = ({ size = 20, title, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    role={title ? "img" : "presentation"}
    aria-label={title}
    aria-hidden={title ? undefined : true}
    className={clsx("inline-block shrink-0 align-middle", className)}
  >
    {title && <title>{title}</title>}
    {/* Eight teeth radiating from the rim, each the same spoke rotated about the centre. */}
    <g strokeWidth={3} strokeLinecap="round">
      {TOOTH_ANGLES.map(angle => (
        <line key={angle} x1={12} y1={2.75} x2={12} y2={6} transform={`rotate(${angle} 12 12)`} />
      ))}
    </g>
    {/* The body: a stroked circle, so the hub is the hole in the middle. */}
    <circle cx={12} cy={12} r={5.5} strokeWidth={3.5} />
  </svg>
)
