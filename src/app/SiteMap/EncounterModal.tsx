import clsx from "clsx"
import type { FC, ReactNode } from "react"

// The frame every encounter (puzzle, trap, shop, gate, chest) is presented in. Scrolls
// vertically so a family can put its rules below the board while the board itself stays within
// the viewport (docs/instructions/puzzle-screens.md §1). Shared with the dev puzzle lab, so what
// is playtested is the real presentation.
export const EncounterModal: FC<{ children: ReactNode }> = ({ children }) => (
  <div
    className={clsx(
      "fixed inset-0 z-20 flex justify-center overflow-x-hidden overflow-y-auto bg-black/80",
      // The safe area on top of the gap the frame wants anyway, per side. The page is drawn
      // `viewport-fit=cover` (index.html), so `inset-0` reaches under the status bar and the home
      // indicator — and this frame, unlike the centred ones, pins its content to the top as soon as it
      // is taller than the screen, which put the back/reset/hint row under the clock. A sum rather than
      // `p-safe-*` because the inset is zero on most devices and the gap is wanted there too; the same
      // shape `Header` uses for the screens behind this one.
      "pt-[calc(env(safe-area-inset-top,_0)_+_var(--spacing)_*_2)]",
      "pr-[calc(env(safe-area-inset-right,_0)_+_var(--spacing)_*_2)]",
      "pb-[calc(env(safe-area-inset-bottom,_0)_+_var(--spacing)_*_2)]",
      "pl-[calc(env(safe-area-inset-left,_0)_+_var(--spacing)_*_2)]"
    )}
  >
    <div className="relative m-auto flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-3">
      {children}
    </div>
  </div>
)
