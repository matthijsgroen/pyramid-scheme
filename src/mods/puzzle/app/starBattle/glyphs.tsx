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

/**
 * The answer over a lit floor: an oil lamp — a round clay bowl with a pinched spout and a flame standing above it.
 *
 * The flame is the part that reads at 30px, so it is the tallest thing in the square and a teardrop; the bowl
 * under it is a flat-bottomed half-round, which is a shape no wall block or square already is.
 */
export const OilLamp: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="currentColor">
      {/* The flame. */}
      <path d="M 2 -44 C 16 -26 18 -14 9 -6 C 4 -2 -4 -2 -9 -6 C -17 -14 -10 -28 2 -44 Z" />
      {/* The bowl, with the spout drawn out to the right. */}
      <path d="M -30 4 L 26 4 L 44 -4 L 36 12 C 30 30 16 38 0 38 C -18 38 -30 26 -30 4 Z" />
    </g>
    {/* The foot it stands on. */}
    <path d="M -16 44 L 16 44" stroke="currentColor" strokeWidth={8} strokeLinecap="round" />
  </svg>
)

/**
 * The answer over a market square: a stall — a striped awning over a counter on two posts.
 *
 * The awning is a scalloped band wider than the counter, so the silhouette is a roof and not a box; the gap
 * between the posts keeps the floor showing through and stops it reading as a house.
 */
export const MarketStall: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="currentColor">
      {/* The awning, scalloped along its front edge. */}
      <path d="M -44 -6 L -36 -38 L 36 -38 L 44 -6 A 11 11 0 0 1 22 -6 A 11 11 0 0 1 0 -6 A 11 11 0 0 1 -22 -6 A 11 11 0 0 1 -44 -6 Z" />
      {/* The counter. */}
      <rect x={-36} y={14} width={72} height={12} rx={2} />
    </g>
    <g stroke="currentColor" strokeWidth={8} strokeLinecap="round">
      <path d="M -30 12 L -30 42 M 30 12 L 30 42" />
    </g>
  </svg>
)

/**
 * The answer over a pond: a lotus in flower — five pointed petals fanned out above a flat pad.
 *
 * The middle petal is the tallest and the outer two lie down toward the water, which is what makes it a
 * flower seen from the side rather than a star.
 */
export const Lotus: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="currentColor">
      <path d="M 0 -44 C 14 -30 14 -8 0 14 C -14 -8 -14 -30 0 -44 Z" />
      <path d="M -10 12 C -22 -4 -30 -22 -36 -30 C -48 -14 -46 6 -26 20 Z" />
      <path d="M 10 12 C 22 -4 30 -22 36 -30 C 48 -14 46 6 26 20 Z" />
      <path d="M -26 22 C -40 18 -48 14 -48 14 C -42 30 -30 34 -14 28 Z" />
      <path d="M 26 22 C 40 18 48 14 48 14 C 42 30 30 34 14 28 Z" />
    </g>
    {/* The pad it floats on. */}
    <ellipse cx={0} cy={40} rx={34} ry={7} fill="currentColor" />
  </svg>
)

/**
 * The answer over a temple floor: a cat asleep, curled into a loaf with its ears up and its tail round its feet.
 *
 * The two triangular ears are what say cat at 30px — everything else is a smooth mound — so they are drawn
 * larger than a real cat's.
 */
export const Cat: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full" aria-hidden focusable="false">
    <g fill="currentColor">
      {/* The body, a loaf. */}
      <path d="M -44 34 C -46 6 -30 -6 -12 -6 L 14 -6 C 36 -6 46 10 44 34 Z" />
      {/* The head with its two ears. */}
      <path
        d="M -40 -4 L -38 -40 L -22 -26 L -6 -26 L 10 -40 L 12 -4 C 10 12 -38 12 -40 -4 Z"
        transform="translate(-4 0) scale(0.8) translate(-4 -2)"
      />
    </g>
    {/* The tail curling round the front. */}
    <path d="M 44 30 C 30 42 6 42 -14 38" fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
  </svg>
)
