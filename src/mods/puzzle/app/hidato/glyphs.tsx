import type { FC } from "react"
import { hieroglyphs } from "@/data/hieroglyphs"

/**
 * What the completion run leaves behind on each cell it passes. Their own module because a file that
 * exports components may export nothing else — fast refresh needs the split, and the skin table next
 * door is not a component.
 *
 * Each one is drawn in a 24-unit box with its feet on the bottom edge, so the board can place them all
 * the same way whatever they are.
 */

/** What comes up out of watered ground. */
export const Sprout: FC = () => (
  <g fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
    <line x1={12} y1={24} x2={12} y2={9} />
    <path d="M12 16 C 7 15, 5 12, 5 8" />
    <path d="M12 13 C 17 12, 19 9, 19 5" />
  </g>
)

/**
 * What a scribe leaves over a figure once the line is finished — one sign per space, and the same sign
 * every time for a given number, so the finished sheet reads as something written rather than sprinkled.
 *
 * Drawn from the collection's own alphabet rather than a second list: they are the signs this game
 * writes in, and inventing a parallel set would be two things to keep looking like one.
 */
export const Sign: FC<{ value: number }> = ({ value }) => (
  <text x={12} y={22} textAnchor="middle" fontSize={24} fill="currentColor">
    {hieroglyphs[value % hieroglyphs.length]}
  </text>
)
