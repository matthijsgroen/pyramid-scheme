import type { EncounterResolution, ResolveEncounter } from "./siteAssembler"

/** The role a mechanism room stands as when its author names no realisation. A role, not a family: which
 * family answers to it is the registry's, and the floor only says a control stands in this room. */
export const DEFAULT_CONTROL_ROLE = "default-control"

/** The role of the family that stands in a door to tell the player what it waits on. */
export const DOOR_FACE_ROLE = "door-face"

// THE ONE FILE CORE NAMES MOD FAMILIES IN: the catalogue a caller with no registry (tests, stories)
// resolves through. Production passes the registry's own resolver, so nothing here reaches a player.
// `.betterer.ts` ratchets the ids named here, per file.
const DEFAULT_TAG_FAMILIES: Record<string, string> = {
  trap: "arithmetic-reflex",
  puzzle: "sumplete",
  "tomb-puzzle": "tableau",
  [DEFAULT_CONTROL_ROLE]: "handle",
  [DOOR_FACE_ROLE]: "gate-face",
}
const DEFAULT_FAMILY_TAGS: Record<string, string[]> = {
  "arithmetic-reflex": ["trap"],
  sumplete: ["puzzle"],
  tableau: ["tomb-puzzle"],
  crocodile: ["tomb-puzzle"],
  "treasure-chest": ["treasure"],
  "fez-shop": ["shop"],
  "key-gate": ["gate"],
  handle: ["handle"],
}

// Fallback for callers that don't inject the real family registry (tests, stories) —
// production always passes familyRegistry.ts's resolveEncounter. Never claims `reEnterable`: this
// fallback's own catalogue holds no family that offers a walk back in, and it has no registry to ask
// about any other id, so a switch resolved through it is refused rather than guessed open. A caller
// that needs a real answer (world-gen's sweep, the runtime) injects a resolver that has one.
export const defaultResolveEncounter: ResolveEncounter = (encounter, defaultTag): EncounterResolution => {
  const value = (Array.isArray(encounter) ? encounter[0] : encounter) ?? defaultTag
  const familyId = DEFAULT_TAG_FAMILIES[value] ?? value
  return { familyId, tags: DEFAULT_FAMILY_TAGS[familyId] ?? [] }
}
