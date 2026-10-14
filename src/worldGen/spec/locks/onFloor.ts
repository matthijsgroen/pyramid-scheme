import { freeRegions } from "@/game/lockAuthoring"
import type { PyramidConstraint } from "../../dsl"
import { catalogueLock } from "./catalogue"

// What a catalogue lock's controls look like on the floor: a lever is a handle, a board a lightbeam switch, a drop a
// zipline, an activator or a flame the standing torch, a flood water, a sequence pressure plates. Each lock binds only the
// kinds it uses.
const LOCK_BINDINGS = {
  dropHome: { "fork-switch": "lightbeamSwitch", toggle: "handle", "one-way": "zipline" },
  twoLamps: { "fork-switch": "lightbeamSwitch", toggle: "handle" },
  cellar: { toggle: "handle", activator: "torch", "one-way": "zipline" },
  overlook: { toggle: "handle", "one-way": "zipline" },
  doubleBack: { "fork-switch": "lightbeamSwitch", toggle: "handle", "one-way": "zipline" },
  seesaw: { toggle: "handle", "one-way": "zipline" },
  lamplighter: { "fork-switch": "lightbeamSwitch", toggle: "handle", "one-way": "zipline" },
  sluice: { toggle: "handle", activator: "torch", "region-barrier": "water" },
  tide: { toggle: "handle", activator: "torch", "region-barrier": "water" },
  keyring: { toggle: "handle", activator: "torch" },
  clockwork: { "fork-switch": "lightbeamSwitch", toggle: "handle", "one-way": "zipline" },
  plates: { sequence: "pressure-plate" },
  relay: { toggle: "handle", flame: "torch", "one-way": "zipline" },
  beforeYouJump: { toggle: "handle", "one-way": "zipline" },
} as const

/** A catalogue lock on the main floor of a pyramid, every region `free`: the floor's own content goes where the carve puts it. */
export const lockOnMainFloor = (
  name: keyof typeof LOCK_BINDINGS,
  floor: { packing?: number } = {}
): Pick<PyramidConstraint, "floorLocks"> => ({
  floorLocks: {
    0: { locks: [{ lock: freeRegions(catalogueLock(name)) }], realisations: LOCK_BINDINGS[name], ...floor },
  },
})
