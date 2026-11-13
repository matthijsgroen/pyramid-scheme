/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { TrapFamilyShell } from "@/mods/trap/app/TrapFamilyShell"
import { generate, type ArithmeticQuestion } from "@/mods/trap/game/arithmeticReflex/generate"
import { ARITHMETIC_REFLEX_META } from "@/mods/trap/game/arithmeticReflex/meta"
import { isModEnabled } from "@/mods/registeredMods"
import { ArithmeticReflexChallenge } from "./ArithmeticReflexChallenge"

export type { ArithmeticQuestion }

const ArithmeticReflexFamily: FamilyPlugin<ArithmeticQuestion>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => (
  <TrapFamilyShell
    question={puzzle}
    ctx={ctx}
    onSolved={onSolved}
    onCancel={onCancel}
    ChallengeComponent={ArithmeticReflexChallenge}
  />
)

// Gated on the mod: registerModApps imports this file unconditionally (static side-effect),
// so the enablement check lives here — trap off → no plugin in the registry → a trap-tagged room
// resolves via the family-absence pass-through (SiteMapScreen) instead of rendering a challenge.
if (isModEnabled("trap"))
  registerFamily({
    meta: ARITHMETIC_REFLEX_META,
    generate: (seed, ctx) => generate(seed, ctx.difficulty ?? "starter"),
    Component: ArithmeticReflexFamily,
  })
