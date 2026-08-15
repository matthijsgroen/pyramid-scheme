import type { FC, ReactNode } from "react"

// The frame every encounter (puzzle, trap, shop, gate, chest) is presented in. Scrolls
// vertically so a family can put its rules below the board while the board itself stays within
// the viewport (docs/instructions/puzzle-screens.md §1). Shared with the dev puzzle lab, so what
// is playtested is the real presentation.
export const EncounterModal: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-20 flex justify-center overflow-x-hidden overflow-y-auto bg-black/80 p-2">
    <div className="relative m-auto flex w-full max-w-md flex-col items-center gap-4 rounded-lg border border-amber-900 bg-stone-900 p-3">
      {children}
    </div>
  </div>
)
