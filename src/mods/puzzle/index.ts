import type { ModDescriptor } from "../modDescriptor"
import { SUMPLETE_META } from "./game/sumplete/meta"
import { SUMPLETE_MIRROR_META } from "./game/sumpleteMirror/meta"
import { CROCODILE_META } from "./game/crocodile/meta"

// The puzzle mod descriptor. Owns the general math-puzzle families (sumplete + the sumplete-mirror
// demo) and the crocodile capstone. A root mod: it stays on in production (turning it off leaves
// puzzle/capstone rooms with no family, so they only auto-resolve via the family-absence
// pass-through — a degenerate world, not a playable one). It is a real REGISTERED_MODS entry
// anyway so its family metadata flows through MOD_FAMILY_META like every other mod's — adding a
// new puzzle family is then a pure plugin, with no edit to core's family list. Toggle-off is the
// isolation TEST (no core residue), not a shipping mode.
//
// Game-side only (no React). The puzzle room Components register via the puzzle app entrypoint
// (src/mods/puzzle/app, pulled in by registerModApps), each gated on this mod being enabled.
export const puzzleMod: ModDescriptor = {
  id: "puzzle",
  families: [SUMPLETE_META, SUMPLETE_MIRROR_META, CROCODILE_META],
}
