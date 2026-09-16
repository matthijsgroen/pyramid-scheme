import type { FC, ReactNode } from "react"
import type { Difficulty } from "@/data/difficultyLevels"
import { imageMap, WALL_SIZE } from "@/ui/atoms/tombImageMap"

// The frame every encounter (puzzle, trap, shop, gate, chest) is presented in. Scrolls
// vertically so a family can put its rules below the board while the board itself stays within
// the viewport (docs/instructions/puzzle-screens.md §1). Shared with the dev puzzle lab, so what
// is playtested is the real presentation.
//
// `p-safe-edge` (index.css) rather than a plain gap: the page is drawn `viewport-fit=cover`, so `inset-0`
// reaches under the status bar and the home indicator, and this frame — unlike the centred overlays — pins
// its content to the top as soon as that content is taller than the screen.
//
// IT WEARS THE FLOOR'S OWN WALL, which is what makes an encounter part of the pyramid rather than a
// dialogue box over a picture of one. The five rank walls were painted for the tableau and were drawn
// nowhere but behind its board; every family is met in the same tomb, so every family is met against the
// same stone. A rank with no wall art falls back to the card's own colour, and so does an encounter
// opened without a difficulty at all.
//
// A SCRIM OVER IT, because the chrome above and below a board is small stone-coloured text and a painted
// wall is not a background to read against. 0.55 is enough to keep it legible and light enough that the
// courses still show — the wall is meant to be recognised, not just present.
//
// PINNED TO ITS TOP, for the encounters whose panel is wider than it is tall — a chest, a gate, a
// short trap. There `cover` scales the wall to the panel's width and crops the surplus height, and
// centred, a panel that changes height moves that crop at both ends at once, sliding the wall while
// the player is looking at it. Anchored, the ceiling ledge stays put and the change is taken off the
// bottom, where the base of the wall is already past the edge.
//
// This does nothing for a panel TALLER than it is wide, which is every panel with a board on it: there
// `cover` scales to the height instead, the wall spans the panel exactly, and there is no vertical crop
// to anchor. Such a panel changing height rescales the wall rather than repositioning it, and only a
// size that does not depend on the panel's height would hold it still.
//
// The wall keeps that brightness and the BOARD is what pulls away from it: a puzzle and its rules sit on
// their own translucent black block (`PuzzleFamilyShell`), the way the hieroglyph strip under a tableau
// does. Darkening the whole wall instead traded the room the player is standing in for concentration; a
// block gives the concentration back without taking the room away.
export const EncounterModal: FC<{ children: ReactNode; difficulty?: Difficulty }> = ({ children, difficulty }) => {
  const wall = difficulty ? imageMap[difficulty] : undefined
  return (
    <div className="fixed inset-0 z-20 flex justify-center overflow-x-hidden overflow-y-auto bg-black/80 p-safe-edge">
      <div
        className="relative m-auto flex w-full max-w-md flex-col items-center gap-4 overflow-hidden rounded-lg border border-amber-900 bg-stone-900 p-3"
        style={
          wall
            ? { backgroundImage: `url(${wall.image})`, backgroundSize: WALL_SIZE, backgroundPosition: "center top" }
            : undefined
        }
      >
        {wall && <div aria-hidden className="pointer-events-none absolute inset-0 bg-stone-900/55" />}
        {/* Over the scrim, and the only reason this wrapper exists. */}
        <div className="relative flex w-full flex-col items-center gap-4">{children}</div>
      </div>
    </div>
  )
}
