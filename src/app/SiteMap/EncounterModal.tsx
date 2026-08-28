import type { FC, ReactNode } from "react"

// The frame every encounter (puzzle, trap, shop, gate, chest) is presented in. Scrolls
// vertically so a family can put its rules below the board while the board itself stays within
// the viewport (docs/instructions/puzzle-screens.md §1). Shared with the dev puzzle lab, so what
// is playtested is the real presentation.
//
// `p-safe-edge` (index.css) rather than a plain gap: the page is drawn `viewport-fit=cover`, so `inset-0`
// reaches under the status bar and the home indicator, and this frame — unlike the centred overlays — pins
// its content to the top as soon as that content is taller than the screen.
export const EncounterModal: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-20 flex justify-center overflow-x-hidden overflow-y-auto bg-black/80 p-safe-edge">
    <div className="relative m-auto flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-3">
      {children}
    </div>
  </div>
)
