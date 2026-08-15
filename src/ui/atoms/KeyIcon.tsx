import type { FC } from "react"
import clsx from "clsx"
import type { KeyColor } from "@/game/siteTypes"
import { keyColorHex } from "@/ui/tokens/keyColors"

type KeyIconProps = {
  color: KeyColor
  /** Rendered pixel size (square). Defaults to a HUD-sized 20. */
  size?: number
  /** Draws the key hollow — a colour the player does not hold yet. */
  outlined?: boolean
  /** Accessible name; the shape is decorative without one. */
  title?: string
  className?: string
}

// A single floor key, drawn in its own hue. Deliberately a drawn key rather than the 🗝 emoji: an
// emoji can't be recoloured, and the colour IS the information here.
export const KeyIcon: FC<KeyIconProps> = ({ color, size = 20, outlined = false, title, className }) => {
  const hex = keyColorHex[color].reachable
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={clsx("shrink-0", className)}
      // Dark halo so a light key stays readable on a light background. drop-shadow follows the drawn
      // shape (unlike box-shadow), so the bow's hole stays open.
      style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.85))" }}
    >
      {title && <title>{title}</title>}
      {/* Bow (the ring you hold) + shaft + two teeth — a stylised warded key, readable at 16px.
          The bow is a stroked ring, so its hole shows the background through. */}
      <circle
        cx={8}
        cy={8}
        r={outlined ? 4.5 : 3.2}
        fill="none"
        stroke={hex}
        strokeWidth={outlined ? 1.75 : 3}
        opacity={outlined ? 0.7 : 1}
      />
      <g stroke={hex} strokeWidth={2} strokeLinecap="round" opacity={outlined ? 0.7 : 1}>
        <line x1={11} y1={11} x2={19} y2={19} />
        <line x1={17} y1={15} x2={14.5} y2={17.5} />
        <line x1={19.5} y1={17.5} x2={17} y2={20} />
      </g>
    </svg>
  )
}
