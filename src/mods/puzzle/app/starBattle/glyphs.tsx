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
 * The answer over farmland: a farmstead standing in a plot — a domed mud-brick granary with its doorway.
 *
 * **It is a dwelling and not a crop, because the words are about dwellings**: the rules say no two may touch
 * since that close they would share one well, and a well is something a household draws from. A board that drew
 * a plant here would be asking the player to sow rather than to settle, and every sentence around it says
 * settle.
 *
 * A square little house would be the obvious drawing and it is the wrong one — at 30px a house is a box, and a
 * box is what an empty square already looks like. A dome over an arched door keeps a curve nothing else on
 * this board has: the answer is round where a star is spiky and the player's own mark is a dot.
 */
export const Farmstead: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
      {/* The dome, closed along its own base so the shape reads as solid rather than as an arch. It fills the
          square nearly top to bottom: drawn shorter it read as a mound with a notch in it rather than as
          somewhere anybody lives. */}
      <path d="M -31 34 A 34 46 0 0 1 31 34 Z" />
      {/* The doorway, which is what makes the dome a building rather than a hill. Wide enough to still be a
          door at 30px, where a slit closes up. */}
      <path d="M -12 34 L -12 2 A 12 12 0 0 1 12 2 L 12 34" />
      {/* The ground it stands on. Drawn heavier than the rest, because it is what sets the farmstead IN the
          plot rather than floating in it. */}
      <path d="M -38 34 L 38 34" strokeWidth={11} />
    </g>
  </svg>
)
