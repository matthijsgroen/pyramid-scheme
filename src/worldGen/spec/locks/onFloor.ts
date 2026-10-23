import { freeRegions } from "@/game/lockAuthoring"
import type { FloorConstraint, PyramidConstraint } from "../../dsl"
import { catalogueLock } from "./catalogue"

// What a catalogue lock's controls look like on the floor: a lever is a handle, a board a lightbeam switch, a drop a
// zipline, an activator or a flame the standing torch, a region barrier water or sand, a sequence pressure plates, a
// weight a stone plate, a pipe the stone pipe. A procession door binds itself. Each lock binds only the kinds it uses.
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
  festivalProcession: { toggle: "handle" },
  hourglass: { toggle: "handle", flame: "torch", "region-barrier": "sand" },
  highWater: { toggle: "handle", flame: "torch", activator: "torch", "region-barrier": "water" },
  lockChamber: { toggle: "handle", activator: "torch", "region-barrier": "water" },
  scaffold: { weights: "stonePlate" },
  buildersLift: { weights: "stonePlate", pipe: "stonePipe", "one-way": "zipline" },
  caveLevers: { toggle: "handle" },
  pitStair: { toggle: "handle", "one-way": "zipline" },
  throwItBack: { toggle: "handle", "one-way": "zipline" },
} as const

type LockName = keyof typeof LOCK_BINDINGS

/** A catalogue lock for an authored floor, every region `free`: the floor's own content goes where the carve puts it. */
export const lockOnFloor = (name: LockName): Pick<FloorConstraint, "locks" | "realisations"> => ({
  locks: [{ lock: freeRegions(catalogueLock(name)) }],
  realisations: LOCK_BINDINGS[name],
})

/** A catalogue lock standing between the floor's entrance and everything the floor holds: every region but its way
 * out takes nothing, so the floor's own content — a tomb's tableaus, whose hieroglyphs are earned off the floor —
 * lies past the lock and no control of the lock stands behind it. */
export const lockBeforeFloorContent = (name: LockName): Pick<FloorConstraint, "locks" | "realisations"> => {
  const lock = catalogueLock(name)
  return {
    locks: [
      {
        lock: {
          ...lock,
          regions: Object.fromEntries(
            Object.keys(lock.regions).map(region => [region, { takes: region === lock.out ? "free" : "nothing" }])
          ),
        },
      },
    ],
    realisations: LOCK_BINDINGS[name],
  }
}

/** A catalogue lock on the main floor of a pyramid. */
export const lockOnMainFloor = (
  name: LockName,
  floor: { packing?: number } = {}
): Pick<PyramidConstraint, "floorLocks"> => ({ floorLocks: { 0: { ...lockOnFloor(name), ...floor } } })
