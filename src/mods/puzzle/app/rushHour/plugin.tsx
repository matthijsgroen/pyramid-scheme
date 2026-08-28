/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { generatePuzzle } from "@/game/seeds/generatePuzzle"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import type { RushHourPuzzle as RushHourPuzzleData } from "@/mods/puzzle/game/rushHour/rushHour"
import { RUSH_HOUR_META } from "@/mods/puzzle/game/rushHour/meta"
import { RushHourPuzzle as RushHourPuzzleScreen } from "./RushHourPuzzle"

const RushHourComponent: FamilyPlugin<RushHourPuzzleData>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <RushHourPuzzleScreen
    puzzle={puzzle}
    difficulty={ctx.difficulty}
    role={ctx.role}
    theme={ctx.theme}
    onSolved={onSolved}
    onCancel={onCancel}
  />
)

if (isModEnabled("puzzle"))
  registerFamily({
    meta: RUSH_HOUR_META,
    generate: (seed, ctx) => generatePuzzle<RushHourPuzzleData>(RUSH_HOUR_META, seed, ctx),
    Component: RushHourComponent,
  })
