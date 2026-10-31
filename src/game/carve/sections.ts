import type { FloorConfig, SideSection, SubSection } from "../siteTypes"

/** The main path's own address, in the same vocabulary boardIndex.ts uses for its chains. */
export const MAIN_SECTION_ADDRESS = "main"

/** The shape the positional addresses take, which an authored label must not imitate — otherwise a
 * label could collide with a sibling that happens to sit at that index. */
const POSITIONAL_ADDRESS = /^(main|s\d+(\.\d+)?)$/

/** What a label may be made of. `#` and `/` are the address's own separators (cellIdentity.ts), so a
 * label carrying either would produce a cell address that reads back as a different section or floor. */
const USABLE_LABEL = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

/** How many levels of section the carve builds: the paths off the main one, and the paths off those.
 * `sectionTooDeep` refuses anything hung below that, and seeds/boardIndex.ts stops at the same depth. */
const CARVED_SECTION_DEPTH = 2

/**
 * What hangs off a section, however deep it was authored.
 *
 * The type stops one level down because that is as deep as the carve goes, while the DSL nests
 * without limit (worldGen/dsl.ts) and the serializer bakes whatever it is given — so a deeper level
 * arrives here as data the type cannot see. Reading it is what lets the floor be refused by name
 * instead of assembled with the deepest sections missing.
 */
export const childSectionsOf = (section: SubSection): SubSection[] => (section as SideSection).sideSections ?? []

/**
 * What each of a floor's sections is called: its authored `label` where it has one, else where it sits.
 *
 * Labelling is opt-in per path, because naming every one of them would be a tax on authoring for the
 * sake of the few that matter. An unlabelled section keeps the positional address and the hazard that
 * comes with it — insert a sidepath ahead of it and it shifts — which is exactly what a label buys off.
 *
 * Walks every authored level, not only the ones the carve reaches: a name is a save key wherever it
 * sits, so one repeated three levels down would share progress exactly as one repeated at the top.
 *
 * Returns the duplicates instead of the addresses when two sections would answer to the same name: a
 * save cannot tell them apart, so their progress would be shared between two places.
 */
export const sectionAddresses = (
  config: FloorConfig
): { ok: true; of: Map<string, string> } | { ok: false; duplicate: string } => {
  const of = new Map<string, string>()
  const taken = new Set<string>([MAIN_SECTION_ADDRESS])
  const claim = (positional: string, label: string | undefined): string | null => {
    const address = label ?? positional
    // A label shaped like a positional address could collide with whichever sibling lands on that
    // index; one carrying an address separator would not survive being read back at all.
    if (label !== undefined && (POSITIONAL_ADDRESS.test(label) || !USABLE_LABEL.test(label))) return null
    if (taken.has(address)) return null
    taken.add(address)
    of.set(positional, address)
    return address
  }
  const walk = (sections: SubSection[], prefix: string): string | null => {
    for (const [idx, section] of sections.entries()) {
      const positional = `${prefix}${idx}`
      if (claim(positional, section.label) === null) return section.label ?? positional
      const deeper = walk(childSectionsOf(section), `${positional}.`)
      if (deeper !== null) return deeper
    }
    return null
  }
  const duplicate = walk(config.sideSections, "s")
  return duplicate === null ? { ok: true, of } : { ok: false, duplicate }
}

/** Every section authored below the depth the carve builds, by the name it answers to. */
export const sectionsTooDeep = (config: FloorConfig, addressOf: ReadonlyMap<string, string>): string[] => {
  const below: string[] = []
  const walk = (sections: SubSection[], prefix: string, depth: number): void => {
    for (const [idx, section] of sections.entries()) {
      const positional = `${prefix}${idx}`
      if (depth > CARVED_SECTION_DEPTH) below.push(addressOf.get(positional) ?? positional)
      // A section already named goes no deeper: its own children are refused along with it, and one
      // name per branch says where the authoring left what the carve builds.
      else walk(childSectionsOf(section), `${positional}.`, depth + 1)
    }
  }
  walk(config.sideSections, "s", 1)
  return below
}

// A floor-key gate whose keyId is authored gets its key from wherever the author names (a
// family, a room reward) rather than this floor's own rotation — so it needs no host chest
// grown for it and takes no part in the key-host chain.
const needsFloorKeyHost = (s: SubSection): boolean => s.gate?.type === "floor-key" && !s.gate.keyId

/**
 * THE SECTION THE CARVE GROWS ITSELF where a level's floor-key gates have nowhere to put their key,
 * so a floor carries paths its authoring never named — `s2.1` on a shipped floor may be one of these.
 */
export const GROWN_KEY_HOST = { pathPuzzles: 0, difficulty: "starter", end: "treasure" } as const

/** An end with nothing of its own to give: no reward, and not a loot end. A loot end stays one whether or not
 * placement put loot in it, so what placement does never changes which ends are free, and never moves a wall. */
export const isFreeEnd = (s: SubSection): boolean => !s.endReward && !s.lootEnd

/**
 * Whether one level of a floor owes a key a home it does not already have.
 *
 * A floor-key gate's key host is a purely local, structural requirement — every floor-key gate at one
 * level needs exactly one key SOMEWHERE at that same level, decided before any section's own endReward
 * gets treated as competing content. "Available host" means genuinely free capacity: ungated AND not
 * already carrying its own authored reward (a section holding a map piece/mosaic/fragment is not free
 * capacity just because it lacks a gate — see docs/game-design/keys-and-locks-solver.md, "Slots have
 * capacity").
 *
 * Asked of whichever sections may ANSWER it: every level asks only its visible ones, so a hidden
 * section never satisfies a key-holder requirement at any depth.
 */
export const owesAKeyHost = (eligible: readonly SubSection[]): boolean =>
  eligible.some(needsFloorKeyHost) && !eligible.some(s => !s.gate && isFreeEnd(s))

/** Which of one level's sections hold a floor-key gate owing a key, and which are free to host one.
 * A hidden section is never free capacity: its cells are masked until the player finds them, so a key
 * put there is one they may never be shown a way to. */
export const keyHostIdxs = (sections: readonly SubSection[]) => ({
  gatedIdxs: sections.map((_, i) => i).filter(i => needsFloorKeyHost(sections[i])),
  ungatedIdxs: sections
    .map((_, i) => i)
    .filter(i => !sections[i].gate && isFreeEnd(sections[i]) && !sections[i].hidden),
})

/** The sections a handle drives carry its gate, so the rest of the carve meets an ordinary authored
 * floor-key gate: the section is isolated behind it, no host chest is grown for a key nothing on this
 * floor mints, and the gate room is written by the one place that writes gate rooms. */
export const withHandleGates = (
  config: FloorConfig,
  addressOf: ReadonlyMap<string, string>,
  gateKeyByAddress: ReadonlyMap<string, string>
): FloorConfig => {
  // Every authored section has an address (sectionAddresses claims one for each), and a missing one
  // would silently skip a gate the lever is already carrying a position for.
  const gateKeyAt = (positional: string): string | undefined => {
    const address = addressOf.get(positional)
    if (address === undefined) throw new Error(`[carve] section ${positional} has no address`)
    return gateKeyByAddress.get(address)
  }
  return {
    ...config,
    sideSections: config.sideSections.map((side, idx) => {
      const subSections = side.sideSections?.map((sub, subIdx) => {
        const keyId = gateKeyAt(`s${idx}.${subIdx}`)
        return keyId ? { ...sub, gate: { type: "floor-key" as const, keyId } } : sub
      })
      const keyId = gateKeyAt(`s${idx}`)
      return {
        ...side,
        ...(subSections ? { sideSections: subSections } : {}),
        ...(keyId ? { gate: { type: "floor-key" as const, keyId } } : {}),
      }
    }),
  }
}

/** The doors shutting a chain off from the way in: its parent's, plus its own where it has one. */
export const doorsShutting = (
  section: SideSection | SubSection,
  positional: string,
  inherited: readonly string[]
): string[] => (section.gate || section.sealed ? [...inherited, positional] : [...inherited])
