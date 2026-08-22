import type { FC } from "react"

/**
 * What stands in a square once the player has claimed it, per place. Their own module because a file that
 * exports components may export nothing else — fast refresh needs the split, and the skin table next door is
 * not a component.
 *
 * Both are drawn to the same rule: **a shape, not a colour** (design doc §8). The answer has to be readable
 * at arm's length on a phone and by a player who reads no hue at all, so each one is a silhouette that
 * survives being small.
 */

/** The answer over a sky. */
export const Star: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <path
      d="M 0 -42 L 11 -13 L 42 -13 L 17 6 L 26 36 L 0 18 L -26 36 L -17 6 L -42 -13 L -11 -13 Z"
      fill="currentColor"
    />
  </svg>
)

/**
 * The answer over farmland: a sheaf standing in a plot.
 *
 * A building would be the literal reading of "farmstead" and it is the wrong one — at 30px a little house is
 * a box, and a box is what an empty square already looks like. A sheaf is bound at the waist and splayed at
 * both ends, so it keeps a shape nothing else on this board has.
 */
export const Sheaf: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth={9} strokeLinecap="round">
      {/* Three stalks fanning out of one binding, and the ears that make them grain rather than grass. */}
      <path d="M 0 40 L 0 -34" />
      <path d="M 0 24 C -16 6, -22 -12, -22 -30" />
      <path d="M 0 24 C 16 6, 22 -12, 22 -30" />
      {/* The band. Drawn heavier, because it is what says these are gathered rather than growing. */}
      <path d="M -15 22 L 15 22" strokeWidth={11} />
    </g>
  </svg>
)
