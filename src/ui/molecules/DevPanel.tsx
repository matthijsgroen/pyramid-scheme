import type { FC } from "react"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"

export type DevAction = { label: string; onClick: () => void }

// A tray of developer actions — the render half of the dev cheat menu. Stateless by the ui/ layer
// rule: every action is a caller-supplied callback and every label a caller-supplied string, so this
// knows nothing about journeys, treasures or game state (that lives in src/app/dev/DevActions.tsx).
// Deliberately loud (the red DeveloperButton) so it can never be mistaken for shipping UI.
export const DevPanel: FC<{ title: string; actions: DevAction[] }> = ({ title, actions }) => (
  <div className="mb-4 w-full rounded border-2 border-dashed border-red-500 bg-red-950/40 p-2">
    <h3 className="mb-2 text-center text-xs font-bold tracking-wide text-red-300 uppercase">{title}</h3>
    <div className="flex flex-wrap justify-center gap-2">
      {actions.map(action => (
        <DeveloperButton key={action.label} label={action.label} onClick={action.onClick} />
      ))}
    </div>
  </div>
)
