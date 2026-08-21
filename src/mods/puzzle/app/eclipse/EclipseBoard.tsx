import clsx from "clsx"
import type { FC } from "react"
import {
  brokenLinks,
  colOf,
  isGiven,
  rowOf,
  type EclipsePuzzle,
  type EclipseMarks,
  type Link,
  type Mark,
} from "@/mods/puzzle/game/eclipse/eclipse"
import { useDelayedConflicts } from "./useDelayedConflicts"

type Props = {
  puzzle: EclipsePuzzle
  state: EclipseMarks
  /** Cells the current hint reasons FROM — its evidence. */
  highlighted?: ReadonlySet<number>
  /** The one square the current hint is ABOUT, drawn stronger than its evidence. */
  focus?: number
  /** The skin this room was authored to wear; an unknown name draws the default pair. */
  theme?: string
  onTapCell: (cell: number) => void
}

/**
 * The two marks, drawn rather than lettered: a disc with rays, and the same disc bitten into a crescent.
 *
 * They have to differ in shape and not only in colour — a board read by a colour-blind player, or in
 * daylight on a phone, is read by outline.
 */
const Sun: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full">
    <circle r={22} className="fill-amber-300" />
    {Array.from({ length: 8 }, (_unused, ray) => {
      const angle = (ray * Math.PI) / 4
      return (
        <line
          key={ray}
          x1={Math.cos(angle) * 30}
          y1={Math.sin(angle) * 30}
          x2={Math.cos(angle) * 42}
          y2={Math.sin(angle) * 42}
          strokeWidth={7}
          strokeLinecap="round"
          className="stroke-amber-300"
        />
      )
    })}
  </svg>
)

const Moon: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full">
    {/* One path, not a disc with a disc cut out of it: a crescent has to read as a crescent against
        whatever the cell's background happens to be. */}
    <path d="M 14 -34 A 36 36 0 1 0 14 34 A 30 30 0 1 1 14 -34 Z" className="fill-sky-200" />
  </svg>
)

/**
 * The night pair, for a site authored `theme: "night"` (docs/game-design/puzzles/eclipse.md §9).
 *
 * The rule the default pair is drawn to holds here too, and it is the whole reason a second skin is cheap:
 * two marks that differ in OUTLINE, so the board is readable without colour. A star against an empty sky
 * reads the same way a sun against a crescent does.
 */
const Star: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full">
    <path
      d="M 0 -42 L 11 -13 L 42 -13 L 17 6 L 26 36 L 0 18 L -26 36 L -17 6 L -42 -13 L -11 -13 Z"
      className="fill-amber-100"
    />
  </svg>
)

const DarkSky: FC = () => (
  <svg viewBox="-50 -50 100 100" className="size-full">
    {/* Sky with no star in it: a ring rather than a shape, so it reads as the absence the rules give it. */}
    <circle r={30} strokeWidth={8} className="fill-indigo-950 stroke-indigo-300/70" />
  </svg>
)

/**
 * Which pair of glyphs a skin draws. The family emits `Mark`; a skin decides what a mark looks like
 * (docs/instructions/puzzle-screens.md §2), and an unknown skin name silently falls back to the default.
 */
const SKINS: Record<string, Record<Mark, FC>> = {
  default: { sun: Sun, moon: Moon },
  night: { sun: Star, moon: DarkSky },
}

// A sign takes a smaller share of a square as the grid grows (34% at 4 wide, 26% at 6): an equal share is
// not an equal reading, since the gap it sits in shrinks with the squares while a mark that keeps its share
// starts covering them.
const signShare = (size: number) => 34 - (size - 4) * 4

/**
 * A sign on the edge between two squares: two strokes for a matching pair, two crossed for a differing one.
 *
 * Drawn rather than typed, the way futoshiki draws its chevrons: a typeface's `=` and `×` are glyphs sized
 * to sit in a line of prose, so they come out thin against a stone square at arm's length, and a stroked
 * pair takes the weight the board needs at every grid size. It rides on a dark disc because it sits in the
 * gutter, where the two squares behind it would otherwise cut through the strokes.
 */
const Sign: FC<{ puzzle: EclipsePuzzle; link: Link; broken: boolean }> = ({ puzzle, link, broken }) => {
  const { size } = puzzle
  const share = 100 / size
  // Midway between the two cells' centres, which is the shared edge whichever way the pair lies.
  const left = ((colOf(size, link.a) + colOf(size, link.b)) / 2 + 0.5) * share
  const top = ((rowOf(size, link.a) + rowOf(size, link.b)) / 2 + 0.5) * share
  return (
    <span
      className={clsx(
        // No percentage padding here: it would resolve against the whole board rather than this disc, which
        // inflated a 30px mark to 100px. The strokes are inset inside the viewBox instead.
        "absolute z-10 aspect-square -translate-1/2 rounded-full bg-stone-950",
        broken ? "text-red-400" : "text-stone-200"
      )}
      style={{ left: `${left}%`, top: `${top}%`, width: `${signShare(size) / size}%` }}
    >
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden focusable="false">
        <g stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" fill="none">
          {link.kind === "same" ? (
            <>
              <line x1={5} y1={9} x2={19} y2={9} />
              <line x1={5} y1={15} x2={19} y2={15} />
            </>
          ) : (
            <>
              <line x1={6} y1={6} x2={18} y2={18} />
              <line x1={18} y1={6} x2={6} y2={18} />
            </>
          )}
        </g>
      </svg>
    </span>
  )
}

const linkKey = (link: Link) => `${link.a}-${link.b}`

const markGlyph = (value: Mark | undefined, theme: string | undefined) => {
  if (!value) return null
  const Glyph = (theme && SKINS[theme] ? SKINS[theme] : SKINS.default)[value]
  return <Glyph />
}

export const EclipseBoard: FC<Props> = ({ puzzle, state, highlighted, focus, theme, onTapCell }) => {
  const { size } = puzzle
  // Held back a beat: a tap on the way to the other mark is not a mistake (see the hook).
  const conflicts = useDelayedConflicts(puzzle, state)
  const broken = new Set(brokenLinks(puzzle, state).map(linkKey))
  return (
    <div className="relative aspect-square w-full max-w-[min(56vh,26rem)] select-none">
      <div
        className="grid size-full gap-1"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        }}
      >
        {state.marks.map((value, cell) => {
          const given = isGiven(puzzle, cell)
          return (
            <button
              key={cell}
              onClick={() => onTapCell(cell)}
              disabled={given}
              className={clsx(
                "flex aspect-square items-center justify-center rounded p-[12%] transition-colors",
                // A given is part of the board rather than part of the answer, so it sits on stone rather than in a socket.
                given ? "bg-stone-500/70" : "bg-stone-800",
                conflicts.has(cell) && "ring-2 ring-red-500/80",
                // Evidence and conclusion cannot look the same: a hint saying "this square" while six squares
                // wear one ring leaves the player to guess which square it meant.
                highlighted?.has(cell) && cell !== focus && "ring-2 ring-sky-300/60",
                cell === focus && "ring-4 ring-amber-300"
              )}
            >
              {markGlyph(value, theme)}
            </button>
          )
        })}
      </div>
      {puzzle.links.map(link => (
        <Sign key={linkKey(link)} puzzle={puzzle} link={link} broken={broken.has(linkKey(link))} />
      ))}
    </div>
  )
}
