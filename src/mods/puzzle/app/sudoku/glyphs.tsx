import type { FC } from "react"

/**
 * The six signs a scribe's board is played in. Their own module because a file that exports components
 * may export nothing else — fast refresh needs the split, and the skin table next door is not a
 * component.
 *
 * **Drawn rather than typed, and that is not a style choice.** The game bundles no hieroglyph face —
 * only Limelight, a display font — so every hieroglyph anywhere in it depends on the device having a
 * font for the Egyptian Hieroglyphs block. That dependency is not hypothetical: HieroglyphTile already
 * works around how its shadow doubled "on glyphs that render as a simple box (e.g. a hieroglyph
 * missing from the device's font)".
 *
 * **What differs here is the cost of losing that bet.** Telling one sign from another at a glance IS
 * this board's mechanic, so a tile that shows a box is a decoration that failed, while a square that
 * shows one has taken the puzzle with it. Strokes also mean the sign is not at the mercy of whichever
 * face a device happens to have, and let it be drawn as INK: an even reed-pen weight that holds up at
 * a sixth of a phone screen, which a text glyph sized to sit in a line of prose does not.
 *
 * Each is drawn in the same 100-unit box, centred, and inherits its colour from the square it stands
 * in — so a given sign in red and a written one in black are one component.
 *
 * The six are picked for SILHOUETTE rather than for meaning: a zigzag, a disc, an upright cross, a
 * box, a flat lens and a tall plume. Six seated figures would be authentic and unplayable.
 */

const Ink: FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg
    viewBox="-50 -50 100 100"
    // Wider than the em box a figure would take, because a drawn sign fills its own box where a digit
    // fills about half of one: matched at 1em the register read as a whisper next to the carved board.
    className="inline-block size-[1.3em] align-middle"
    aria-hidden
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth={8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

/** Water — the ripple that writes the sound `n`. Flat and jagged, and the only zigzag on the board. */
const Water: FC = () => (
  <Ink>
    <polyline points="-40,10 -24,-10 -8,10 8,-10 24,10 40,-10" />
  </Ink>
)

/** The sun — a disc with its centre marked, and the only round sign here. */
const Sun: FC = () => (
  <Ink>
    <circle cx={0} cy={0} r={30} />
    <circle cx={0} cy={0} r={7} fill="currentColor" stroke="none" />
  </Ink>
)

/** The ankh — a looped cross, upright and symmetric where nothing else is. */
const Ankh: FC = () => (
  <Ink>
    <ellipse cx={0} cy={-24} rx={15} ry={18} />
    <line x1={0} y1={-6} x2={0} y2={44} />
    <line x1={-26} y1={4} x2={26} y2={4} />
  </Ink>
)

/** A house — a plan with its doorway left open, squat and boxy. */
const House: FC = () => (
  <Ink>
    <path d="M -2 26 L -36 26 L -36 -26 L 36 -26 L 36 26 L 20 26" />
  </Ink>
)

/** A mouth — a flat lens, filled, so it never reads as an outline the way the disc does. */
const Mouth: FC = () => (
  <Ink>
    <path d="M -38 0 Q 0 -22 38 0 Q 0 22 -38 0 Z" fill="currentColor" stroke="none" />
  </Ink>
)

/** The feather of truth — a plume, the one sign that leans. */
const Feather: FC = () => (
  <Ink>
    <path d="M 8 46 C -6 18, -10 -14, 2 -46 C 20 -18, 22 12, 8 46 Z" />
    <line x1={4} y1={30} x2={4} y2={-24} strokeWidth={5} />
  </Ink>
)

const SIGNS = [Water, Sun, Ankh, House, Mouth, Feather]

/** The sign standing for a value, 1…6. */
export const Sign: FC<{ value: number }> = ({ value }) => {
  const Drawn = SIGNS[(value - 1) % SIGNS.length]
  return <Drawn />
}

/** A value written as itself, for the board that cuts figures into stone rather than inking signs. */
export const Figure: FC<{ value: number }> = ({ value }) => <>{value}</>
