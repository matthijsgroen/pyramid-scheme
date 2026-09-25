import type { ResolveEncounter } from "../game/siteAssembler"
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

// A switch names no owner of its own: its owner is whichever mod contributed the family that stands
// in the junction, and only the injected resolver can name that. The resolver answers out of the
// families the REGISTERED mods contribute, so an encounter it can put no owner to is one whose mod
// left the build — the switch drops with it and the junction stands bare, every way out open and
// nothing in it. Asked with the same "puzzle" default tag the assembler's own switch guard uses, so
// the drop and that guard cannot disagree about which family a switch stands on; an `encounter`
// listing several families resolves the way the assembler resolves it, so the one the player would
// actually meet is the one whose ownership decides this. No resolver ⇒ no owner can be named ⇒
// nothing drops.
//
// `forks` is NOT touched. It is core's statement about the shape of the floor, and dropping it with
// the switch would move walls under every save written against that floor for no reason but a mod
// leaving the build.
const keepSwitches = (
  switches: FloorConfig["switches"],
  resolveEncounter: ResolveEncounter | undefined
): FloorConfig["switches"] => {
  if (!switches || !resolveEncounter) return switches
  return resolveEncounter(switches.encounter, "puzzle").ownerMod === undefined ? undefined : switches
}

// The resolver is passed explicitly even where there is none, so a caller that has one and forgets to
// hand it over is a type error rather than a floor whose switch quietly survives its mod.
export const dropUnownedAuthoring = (
  floor: FloorConfig,
  registeredModIds: ReadonlySet<string>,
  resolveEncounter: ResolveEncounter | undefined
): FloorConfig => ({
  ...floor,
  switches: keepSwitches(floor.switches, resolveEncounter),
  sideSections: floor.sideSections.map(dropIfUnowned(registeredModIds)),
})
