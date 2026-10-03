import { describe, expect, it } from "vitest"
import type { Lock } from "../lockAuthoring"
import { compileLock } from "../lockCompile"
import type { Control, Obstacle } from "../obstacles"
import { topologyFaults } from "../obstacles"
import { BINDING, sluiceLock } from "../testSupport/lockFixtures"
import { CORE_MECHANICS, mechanicRegistry } from "./index"

const without = (control: string) => mechanicRegistry(CORE_MECHANICS.filter(kind => kind.control !== control))

// A kind no core file names, standing in the registry the way a sixth plug-in would.
const plates = { control: "plates", built: true, gates: "opens" as const }
const withPlates = (): Lock => {
  const lock = sluiceLock()
  return {
    ...lock,
    gates: { ...lock.gates, floodedHall: { region: "hall", owners: ["sluice", "plates"] } },
    mechanics: {
      ...lock.mechanics,
      plates: { control: "plates", in: "annex", starts: "up", opens: { up: [], down: ["floodedHall"] } },
    } as unknown as Lock["mechanics"],
  }
}

describe("the core mechanic registry, read by lockCompile", () => {
  it("compiles a kind a test registered through that kind's own compile rule", () => {
    const registry = mechanicRegistry([
      ...CORE_MECHANICS,
      {
        ...plates,
        compile: (id, _mechanic, { name }) => ({
          controls: [
            {
              id: name(id),
              in: name("annex"),
              states: ["up", "down"],
              initial: "up",
              returnsToInitial: true,
              opens: { down: [name("floodedHall")] },
            },
          ],
        }),
      },
    ])
    const result = compileLock(withPlates(), { ...BINDING, plates: "plate" }, { kinds: registry })

    expect(result.ok && result.fragment.controls.map(control => control.id)).toEqual(["sluice", "plates"])
  })

  it("refuses a kind declared built that has no compile rule, rather than dropping it", () => {
    const result = compileLock(
      withPlates(),
      { ...BINDING, plates: "plate" },
      { kinds: mechanicRegistry([...CORE_MECHANICS, plates]) }
    )

    expect(result).toEqual({
      ok: false,
      faults: [{ type: "kindNotCompilable", mechanic: "plates", control: "plates" }],
    })
  })

  it("refuses with unknownControlKind a mechanic whose core kind was removed", () => {
    const result = compileLock(sluiceLock(), BINDING, { kinds: without("toggle") })

    expect(result).toEqual({
      ok: false,
      faults: [{ type: "unknownControlKind", mechanic: "sluice", control: "toggle" }],
    })
  })
})

describe("the core mechanic registry, read by topologyFaults", () => {
  const layout = {
    regions: [
      { name: "mouth", appetite: "free" as const },
      { name: "hall", appetite: "free" as const },
    ],
    connections: [["mouth", "hall"]] as [string, string][],
    in: "mouth",
    out: "hall",
  }
  const door: Obstacle = { id: "door", kind: "gate", at: { on: "connection", between: ["mouth", "hall"] } }
  const lever = (returnsToInitial: boolean): Control => ({
    id: "lever",
    in: "mouth",
    states: ["off", "on"],
    initial: "off",
    returnsToInitial,
    opens: { off: [], on: ["door"] },
  })

  it("accepts a floor whose controls are all core kinds", () => {
    expect(topologyFaults(layout, [door], [lever(true)])).toEqual([])
  })

  it("refuses a back-and-forth control once the toggle kind is removed, and an activator once that is", () => {
    expect(topologyFaults(layout, [door], [lever(true)], [], [], without("toggle"))).toContainEqual({
      type: "unknownControlKind",
      id: "lever",
      control: "toggle",
    })
    expect(topologyFaults(layout, [door], [lever(false)], [], [], without("activator"))).toContainEqual({
      type: "unknownControlKind",
      id: "lever",
      control: "activator",
    })
  })

  it("refuses a one-way once the one-way kind is removed", () => {
    const drop: Obstacle = { id: "drop", kind: "oneWay", at: { on: "connection", between: ["hall", "mouth"] } }
    expect(topologyFaults(layout, [drop], [], [], [], without("one-way"))).toEqual([
      { type: "unknownControlKind", id: "drop", control: "one-way" },
    ])
  })
})
