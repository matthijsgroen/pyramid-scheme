import type { FloorConfig, SideSection, SubSection } from "./types"

// Mod-owned authoring rule (docs/mods/floor-topology-design.md): an authored gate that names its
// owning mod drops — restriction lifts, branch simply opens — when that mod isn't registered.
// Untagged authoring has no owner to check and is never touched. Core compares only the id string
// against the registered set; it names no mod.
const dropIfUnowned = (registeredModIds: ReadonlySet<string>) => {
  const keep = (gate: SubSection["gate"]): SubSection["gate"] =>
    gate?.type === "floor-key" && gate.ownerMod !== undefined && !registeredModIds.has(gate.ownerMod) ? undefined : gate

  const stripSubSection = (section: SubSection): SubSection => ({ ...section, gate: keep(section.gate) })

  const stripSideSection = (section: SideSection): SideSection => ({
    ...stripSubSection(section),
    sideSections: section.sideSections?.map(stripSubSection),
  })

  return stripSideSection
}

export const dropUnownedAuthoring = (floor: FloorConfig, registeredModIds: ReadonlySet<string>): FloorConfig => ({
  ...floor,
  sideSections: floor.sideSections.map(dropIfUnowned(registeredModIds)),
})
