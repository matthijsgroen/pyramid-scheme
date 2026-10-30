import type { FC } from "react"

/**
 * The two drawings of the mummy rest board. Their own module because a file that exports components may
 * export nothing else, and the skin table is not a component.
 *
 * Both are silhouettes, a shape and not a colour, so they read at arm's length and without any hue.
 */

/**
 * The sarcophagus printed on the board: a lidded stone case seen from above, wide at the shoulders and
 * narrowing to the foot, with a band across the lid.
 *
 * It is an outline with a solid band, where the mummy is solid throughout, so the two never read as the same
 * thing even at a glance.
 */
export const Sarcophagus: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M -17 -42 L 17 -42 L 27 -22 L 21 38 L -21 38 L -27 -22 Z" />
    </g>
    <g fill="currentColor">
      <circle cx={0} cy={-26} r={9} />
      <path d="M -17 -6 L 17 -6 L 16 4 L -16 4 Z" />
      <path d="M -15 14 L 15 14 L 14 24 L -14 24 Z" />
    </g>
  </svg>
)

/**
 * The piece the player places: a wrapped mummy standing upright, a head over a body bound in bands.
 *
 * The wrappings are gaps cut through the shape with a mask, so they show whatever ground the square has and
 * the drawing carries no colour of its own.
 */
export const Mummy: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <mask id="mummy-wrappings" maskUnits="userSpaceOnUse" x={-50} y={-50} width={100} height={100}>
      <rect x={-50} y={-50} width={100} height={100} fill="white" />
      <g fill="none" stroke="black" strokeWidth={5} strokeLinecap="round">
        <path d="M -19 0 L 19 6 M -20 14 L 20 20 M -20 28 L 20 34" />
        <path d="M -8 -34 L 8 -30" />
      </g>
    </mask>
    <g fill="currentColor" mask="url(#mummy-wrappings)">
      <circle cx={0} cy={-30} r={13} />
      <path d="M -17 -14 L 17 -14 L 21 40 L -21 40 Z" />
    </g>
  </svg>
)
