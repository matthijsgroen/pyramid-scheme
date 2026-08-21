/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { TrapFamilyShell } from "@/mods/trap/app/TrapFamilyShell"
import { generate, type ClockQuestion } from "@/mods/trap/game/clockReflex/generate"
import { CLOCK_REFLEX_META } from "@/mods/trap/game/clockReflex/meta"
import { ClockReflexChallenge } from "./ClockReflexChallenge"

export type { ClockQuestion }

const ClockReflexFamily: FamilyPlugin<ClockQuestion>["Component"] = ({ puzzle, ctx, journeys, onSolved, onCancel }) => (
  <TrapFamilyShell
    question={puzzle}
    ctx={ctx}
    journeys={journeys}
    onSolved={onSolved}
    onCancel={onCancel}
    ChallengeComponent={ClockReflexChallenge}
  />
)

// Gated on the mod: registerModApps imports this file unconditionally (static side-effect), so the
// enablement check lives here — trap off → no plugin in the registry.
if (isModEnabled("trap"))
  registerFamily({
    meta: CLOCK_REFLEX_META,
    generate: (seed, ctx) => generate(seed, ctx.difficulty ?? "starter"),
    Component: ClockReflexFamily,
  })
