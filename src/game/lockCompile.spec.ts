import { describe, expect, expectTypeOf, it } from "vitest"
import { CORE_MECHANICS, mechanicRegistry, resolveMechanicKind } from "./mechanics"
import type { Activator, ForkSwitch, Lock, LockMechanic, LockOneWay, Sequence, Toggle } from "./lockAuthoring"
import { checkLock, compileLock, type LockFragment, type RealisationBinding } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { BINDING, doubleBackLock, sluiceLock } from "./testSupport/lockFixtures"

const kinds = resolveMechanicKind
const compile = (lock: Lock, binding: RealisationBinding = BINDING, namespace?: string) =>
  compileLock(lock, binding, { kinds, namespace })
const fragmentOf = (lock: Lock, binding: RealisationBinding = BINDING, namespace?: string): LockFragment => {
  const result = compile(lock, binding, namespace)
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.faults)}`)
  return result.fragment
}

describe("a lock stands on its own", () => {
  it("is checked with no floor, no binding and no seed", () => {
    expect(checkLock(doubleBackLock(), kinds)).toEqual([])
    expect(checkLock(sluiceLock(), kinds)).toEqual([])
  })

  it("compiles with no floor to place it on", () => {
    expect(compile(doubleBackLock()).ok).toBe(true)
    expect(compile(sluiceLock()).ok).toBe(true)
  })

  it("gives two clones of one lock no id in common", () => {
    const ids = (f: LockFragment) => [
      ...f.regionLayout.regions.map(r => r.name),
      ...f.obstacles.map(o => o.id),
      ...f.controls.map(c => c.id),
    ]
    const left = ids(fragmentOf(doubleBackLock(), BINDING, "left"))
    const right = ids(fragmentOf(doubleBackLock(), BINDING, "right"))
    expect(left.filter(id => right.includes(id))).toEqual([])
    expect(left.every(id => id.startsWith("left."))).toBe(true)
  })
})

describe("a lock refuses what contradicts itself, naming it", () => {
  const d = doubleBackLock()
  const refused = (lock: Lock) => checkLock(lock, kinds)
  const connectionsWith = (last: Lock["connections"][number]) => [...d.connections.slice(0, 4), last]
  const withMechanic = (id: string, mechanic: LockMechanic): Lock => ({
    ...d,
    mechanics: { ...d.mechanics, [id]: mechanic },
  })

  it("names a region that does not exist", () => {
    expect(refused({ ...d, out: "nowhere" })).toEqual([{ type: "namesNoRegion", at: "port out", region: "nowhere" }])
    expect(refused(withMechanic("S2", { ...(d.mechanics.S2 as Toggle), in: "nowhere" }))).toEqual([
      { type: "namesNoRegion", at: "mechanic S2", region: "nowhere" },
    ])
    expect(refused({ ...d, gates: { ...d.gates, "in-out": { from: "in", to: "nowhere", owners: ["S2"] } } })).toEqual([
      { type: "barrierOffItsConnection", barrier: "in-out", between: ["in", "out"] },
      { type: "namesNoRegion", at: "gate in-out", region: "nowhere" },
      { type: "gateOnNoConnection", barrier: "in-out" },
    ])
  })

  it("refuses a barrier named on a connection that was never defined", () => {
    expect(
      refused({ ...d, connections: connectionsWith({ between: ["in", "out"], barriers: ["in-out", "ghost"] }) })
    ).toEqual([{ type: "barrierUndefined", between: ["in", "out"], barrier: "ghost" }])
  })

  it("refuses an edge gate no connection names", () => {
    expect(refused({ ...d, connections: connectionsWith(["in", "out"]) })).toEqual([
      { type: "edgeGateUnnamed", barrier: "in-out" },
    ])
  })

  it("refuses an edge gate standing between regions no connection joins", () => {
    const extra = { ...d.gates, extra: { from: "in", to: "s1", owners: ["S2"] } }
    expect(
      refused({
        ...d,
        gates: extra,
        mechanics: { ...d.mechanics, S2: { ...(d.mechanics.S2 as Toggle), opens: { a: [], b: ["in-out", "extra"] } } },
      })
    ).toEqual([{ type: "gateOnNoConnection", barrier: "extra" }])
  })

  it("refuses a barrier named on two connections, or twice on one", () => {
    expect(
      refused({ ...d, connections: connectionsWith({ between: ["in", "out"], barriers: ["in-out", "in-out"] }) })
    ).toEqual([{ type: "barrierNamedTwice", barrier: "in-out" }])
    expect(
      refused({ ...d, connections: connectionsWith({ between: ["in", "out"], barriers: ["in-out", "rightLower-s1"] }) })
    ).toEqual([
      { type: "barrierOffItsConnection", barrier: "rightLower-s1", between: ["in", "out"] },
      { type: "barrierNamedTwice", barrier: "rightLower-s1" },
    ])
  })

  it("refuses one connection declared twice", () => {
    expect(refused({ ...d, connections: [...d.connections, ["leftLower", "in"]] })).toEqual([
      { type: "connectionRepeated", between: ["leftLower", "in"] },
    ])
  })

  it("refuses a gate and a one-way sharing an id", () => {
    expect(refused({ ...d, oneWays: { ...d.oneWays, "in-out": { from: "s1", to: "in" } } })).toEqual([
      { type: "barrierIdRepeated", id: "in-out" },
    ])
  })

  it("refuses a one-way standing on a connection beside a gate, which the floor cannot say", () => {
    expect(
      refused({
        ...d,
        connections: [
          { between: ["in", "leftLower"], barriers: ["in-leftLower", "dropToIn"] },
          ...d.connections.slice(1),
        ],
      })
    ).toEqual([
      { type: "oneWaySharesConnection", between: ["in", "leftLower"], barriers: ["in-leftLower", "dropToIn"] },
    ])
  })

  it("refuses an owner no mechanic answers to, and one whose opens never names the gate", () => {
    expect(
      refused({ ...d, gates: { ...d.gates, "in-out": { from: "in", to: "out", owners: ["S2", "ghost"] } } })
    ).toEqual([{ type: "gateOwnerUnknown", barrier: "in-out", owner: "ghost" }])
    expect(refused(withMechanic("S2", { ...(d.mechanics.S2 as Toggle), opens: { a: [], b: [] } }))).toEqual([
      { type: "ownerNamesNoGate", barrier: "in-out", owner: "S2" },
    ])
  })

  it("reads a name as unknown when only Object.prototype has it: an owner or an opens named `constructor`", () => {
    expect(
      refused({ ...d, gates: { ...d.gates, "in-out": { from: "in", to: "out", owners: ["S2", "constructor"] } } })
    ).toEqual([{ type: "gateOwnerUnknown", barrier: "in-out", owner: "constructor" }])
    const S1 = d.mechanics.S1 as Toggle
    expect(refused(withMechanic("S1", { ...S1, opens: { a: ["constructor"], b: ["leftLower-s2"] } }))).toContainEqual({
      type: "opensUnknownBarrier",
      mechanic: "S1",
      state: "a",
      barrier: "constructor",
    })
  })

  it("refuses an opens naming a barrier nothing defines, or a one-way", () => {
    const S1 = d.mechanics.S1 as Toggle
    expect(refused(withMechanic("S1", { ...S1, opens: { a: ["nope"], b: ["leftLower-s2"] } }))).toEqual([
      { type: "opensUnknownBarrier", mechanic: "S1", state: "a", barrier: "nope" },
      { type: "ownerNamesNoGate", barrier: "rightLower-s1", owner: "S1" },
    ])
    expect(
      refused(withMechanic("S1", { ...S1, opens: { a: ["rightLower-s1", "dropToIn"], b: ["leftLower-s2"] } }))
    ).toEqual([{ type: "opensNotAGate", mechanic: "S1", state: "a", barrier: "dropToIn" }])
  })

  it("refuses a mechanic opening a gate that does not list it as an owner", () => {
    expect(refused({ ...d, gates: { ...d.gates, "in-out": { from: "in", to: "out", owners: [] } } })).toEqual([
      { type: "opensGateNotOwned", mechanic: "S2", barrier: "in-out" },
    ])
  })

  it("refuses a start that is not one of the mechanic's states, and a toggle without two", () => {
    const S2 = d.mechanics.S2 as Toggle
    expect(refused(withMechanic("S2", { ...S2, starts: "c" }))).toEqual([
      { type: "startsNotAState", mechanic: "S2", starts: "c" },
    ])
    expect(refused(withMechanic("S2", { ...S2, opens: { a: [], b: ["in-out"], c: [] } }))).toEqual([
      { type: "statesNotTwo", mechanic: "S2", states: ["a", "b", "c"] },
    ])
  })

  it("refuses two fork-switches in one junction", () => {
    expect(refused(withMechanic("Z", { control: "fork-switch", in: "in" }))).toEqual([
      { type: "forkRegionShared", region: "in", mechanics: ["Y", "Z"] },
    ])
  })

  it("refuses a fork-switch's gate that is not a seam leaving its region", () => {
    const S1 = d.mechanics.S1 as Toggle
    expect(
      refused({
        ...d,
        gates: { ...d.gates, "rightLower-s1": { from: "rightLower", to: "s1", owners: ["Y"] } },
        mechanics: { ...d.mechanics, S1: { ...S1, opens: { a: [], b: ["leftLower-s2"] } } },
      })
    ).toEqual([{ type: "topology", fault: { type: "gateOwnedOffSeam", id: "rightLower-s1", owner: "Y" } }])
  })

  it("refuses a fork-switch's gate that is not first on its connection", () => {
    const S2 = d.mechanics.S2 as Toggle
    expect(
      refused({
        ...d,
        connections: [{ between: ["in", "leftLower"], barriers: ["extra", "in-leftLower"] }, ...d.connections.slice(1)],
        gates: { ...d.gates, extra: { from: "in", to: "leftLower", owners: ["S2"] } },
        mechanics: { ...d.mechanics, S2: { ...S2, opens: { a: [], b: ["in-out", "extra"] } } },
      })
    ).toEqual([
      {
        type: "topology",
        fault: { type: "forkGateNotFirst", id: "in-leftLower", owner: "Y", between: ["in", "leftLower"] },
      },
    ])
  })

  describe("over a region", () => {
    const s = sluiceLock()
    const sluice = s.mechanics.sluice as Toggle

    it("refuses a region gate named on a connection", () => {
      expect(
        refused({
          ...s,
          connections: [
            s.connections[0],
            { between: ["pumpRoom", "hall"], barriers: ["floodedHall"] },
            ...s.connections.slice(2),
          ],
        })
      ).toEqual([{ type: "regionGateOnConnection", barrier: "floodedHall", between: ["pumpRoom", "hall"] }])
    })

    it("refuses a region gate over the lock's way in", () => {
      expect(
        refused({
          ...s,
          gates: { ...s.gates, floodedPump: { region: "pumpRoom", owners: ["sluice"] } },
          mechanics: {
            sluice: { ...sluice, in: "annex", opens: { dry: ["floodedVault", "floodedPump"], wet: ["floodedHall"] } },
          },
        })
      ).toEqual([
        {
          type: "topology",
          fault: { type: "regionBarrierHoldsPort", id: "floodedPump", region: "pumpRoom", port: "in" },
        },
      ])
    })

    it("refuses a region gate over the lock's way out", () => {
      expect(
        refused({
          ...s,
          gates: { ...s.gates, floodedGallery: { region: "gallery", owners: ["sluice"] } },
          mechanics: {
            sluice: { ...sluice, opens: { dry: ["floodedVault", "floodedGallery"], wet: ["floodedHall"] } },
          },
        })
      ).toEqual([
        {
          type: "topology",
          fault: { type: "regionBarrierHoldsPort", id: "floodedGallery", region: "gallery", port: "out" },
        },
      ])
    })

    it("refuses a mechanic standing in the region it bars", () => {
      expect(refused({ ...s, mechanics: { sluice: { ...sluice, in: "hall" } } })).toEqual([
        {
          type: "topology",
          fault: { type: "mechanicStandsInBarredRegion", id: "sluice", region: "hall", barrier: "floodedHall" },
        },
      ])
    })
  })
})

describe("a lock names roles, never realisations", () => {
  it("has no realisation field in any of its parts", () => {
    type Parts = keyof Toggle | keyof Activator | keyof Sequence | keyof ForkSwitch | keyof LockOneWay | keyof Lock
    expectTypeOf<Extract<Parts, "encounter" | "realisation" | "oneWayRealisation">>().toEqualTypeOf<never>()
  })

  it("takes every realisation from the binding: two bindings differ in the realisation fields and nowhere else", () => {
    const other: RealisationBinding = {
      toggle: "switchPuzzle",
      activator: "brazier",
      sequence: "tiles",
      "fork-switch": "mirrors",
      "one-way": "headwind",
    }
    const bare = ({ controls, oneWayRealisation: _unused, ...rest }: LockFragment) => ({
      ...rest,
      controls: controls.map(({ encounter: _encounter, ...control }) => control),
    })
    const one = fragmentOf(doubleBackLock(), BINDING)
    const two = fragmentOf(doubleBackLock(), other)

    expect(bare(two)).toEqual(bare(one))
    expect(one.controls.map(c => [c.id, c.encounter])).toEqual([
      ["Y", "lightbeamSwitch"],
      ["S1", "handle"],
      ["S2", "handle"],
    ])
    expect(two.controls.map(c => [c.id, c.encounter])).toEqual([
      ["Y", "mirrors"],
      ["S1", "switchPuzzle"],
      ["S2", "switchPuzzle"],
    ])
    expect([one.oneWayRealisation, two.oneWayRealisation]).toEqual(["zipline", "headwind"])
  })

  it("refuses a kind the binding leaves out, naming the kind and who uses it, with no default", () => {
    expect(compile(doubleBackLock(), {})).toEqual({
      ok: false,
      faults: [
        { type: "unboundRole", kind: "fork-switch", mechanics: ["Y"] },
        { type: "unboundRole", kind: "toggle", mechanics: ["S1", "S2"] },
        { type: "unboundRole", kind: "one-way", mechanics: ["dropToLeft", "dropToIn"] },
      ],
    })
    const { toggle: _toggle, ...withoutToggle } = BINDING
    expect(compile(doubleBackLock(), withoutToggle)).toEqual({
      ok: false,
      faults: [{ type: "unboundRole", kind: "toggle", mechanics: ["S1", "S2"] }],
    })
  })

  it("asks no realisation of a kind the lock does not use", () => {
    expect(compile(sluiceLock(), { toggle: "handle" }).ok).toBe(true)
    expect(fragmentOf(sluiceLock(), { toggle: "handle" }).oneWayRealisation).toBeUndefined()
  })
})

describe("a lock using a mechanic that is not built yet", () => {
  const withPressureTiles = (): Lock => {
    const s = sluiceLock()
    return {
      ...s,
      gates: { ...s.gates, floodedHall: { region: "hall", owners: ["sluice", "tiles"] } },
      mechanics: {
        ...s.mechanics,
        tiles: { control: "pressure-tiles", in: "annex", opens: { done: ["floodedHall"] } },
      } as unknown as Lock["mechanics"],
    }
  }
  const declared = (built: boolean) => (control: string) =>
    control === "pressure-tiles" ? { control, built, gates: "opens" as const } : resolveMechanicKind(control)

  it("is written and checked, and passes", () => {
    expect(checkLock(withPressureTiles(), declared(false))).toEqual([])
  })

  it("is refused at the bake, naming the mechanic and its kind", () => {
    expect(compileLock(withPressureTiles(), BINDING, { kinds: declared(false) })).toEqual({
      ok: false,
      faults: [{ type: "unbuiltMechanic", mechanic: "tiles", control: "pressure-tiles" }],
    })
  })

  it("is refused when its kind is declared built but nothing here can translate it, rather than dropped", () => {
    const bind = { ...BINDING, "pressure-tiles": "plates" }
    expect(compileLock(withPressureTiles(), bind, { kinds: declared(true) })).toEqual({
      ok: false,
      faults: [{ type: "kindNotCompilable", mechanic: "tiles", control: "pressure-tiles" }],
    })
  })

  it("is refused as unknown where core has no plug-in for its kind", () => {
    expect(checkLock(withPressureTiles(), resolveMechanicKind)).toEqual([
      { type: "unknownControlKind", mechanic: "tiles", control: "pressure-tiles" },
    ])
  })

  it("is honoured once a plug-in for its kind is registered in the core registry", () => {
    const registry = mechanicRegistry([...CORE_MECHANICS, { control: "pressure-tiles", built: false, gates: "opens" }])
    expect(checkLock(withPressureTiles(), registry)).toEqual([])
    expect(compileLock(withPressureTiles(), BINDING, { kinds: registry })).toEqual({
      ok: false,
      faults: [{ type: "unbuiltMechanic", mechanic: "tiles", control: "pressure-tiles" }],
    })
  })

  it("refuses every kind the registry no longer holds, naming each mechanic", () => {
    expect(checkLock(doubleBackLock(), () => undefined).map(fault => fault.type)).toEqual([
      "unknownControlKind",
      "unknownControlKind",
      "unknownControlKind",
      "unknownControlKind",
      "unknownControlKind",
    ])
  })

  it("refuses only the mechanics of the kind removed from the registry", () => {
    const withoutToggle = mechanicRegistry(CORE_MECHANICS.filter(kind => kind.control !== "toggle"))
    const faults = checkLock(sluiceLock(), withoutToggle)
    expect(faults.length).toBeGreaterThan(0)
    expect(faults.every(fault => fault.type === "unknownControlKind" && fault.control === "toggle")).toBe(true)
  })

  it("carries no mod: the kinds are the same with every mod removed from the build", () => {
    expect(CORE_MECHANICS.map(kind => kind.control)).toEqual([
      "toggle",
      "activator",
      "sequence",
      "fork-switch",
      "one-way",
      "weights",
      "unladen",
    ])
    expect(CORE_MECHANICS.every(kind => kind.built)).toBe(true)
  })
})

describe("a lock compiles into the floor's vocabulary", () => {
  it("writes the doubleBack as layout, drops, fork and controls", () => {
    expect(fragmentOf(doubleBackLock())).toEqual({
      regionLayout: {
        regions: ["in", "leftLower", "rightLower", "s1", "s2", "out"].map(name => ({ name, appetite: "free" })),
        connections: [
          ["in", "leftLower"],
          ["in", "rightLower"],
          ["rightLower", "s1"],
          ["leftLower", "s2"],
          ["in", "out"],
        ],
        in: "in",
        out: "out",
      },
      forks: [{ in: "in" }],
      obstacles: [
        { id: "in-leftLower", kind: "gate", at: { on: "connection", between: ["in", "leftLower"] }, owners: ["Y"] },
        { id: "in-rightLower", kind: "gate", at: { on: "connection", between: ["in", "rightLower"] }, owners: ["Y"] },
        { id: "rightLower-s1", kind: "gate", at: { on: "connection", between: ["rightLower", "s1"] } },
        { id: "leftLower-s2", kind: "gate", at: { on: "connection", between: ["leftLower", "s2"] } },
        { id: "in-out", kind: "gate", at: { on: "connection", between: ["in", "out"] } },
        { id: "dropToLeft", kind: "oneWay", at: { on: "connection", between: ["s1", "leftLower"] } },
        { id: "dropToIn", kind: "oneWay", at: { on: "connection", between: ["leftLower", "in"] } },
      ],
      controls: [
        { id: "Y", in: "in", control: "fork-switch", encounter: "lightbeamSwitch" },
        {
          id: "S1",
          in: "s1",
          states: ["a", "b"],
          initial: "a",
          returnsToInitial: true,
          opens: { a: ["rightLower-s1"], b: ["leftLower-s2"] },
          encounter: "handle",
        },
        {
          id: "S2",
          in: "s2",
          states: ["a", "b"],
          initial: "a",
          returnsToInitial: true,
          opens: { a: [], b: ["in-out"] },
          encounter: "handle",
        },
      ],
      barrierOrder: [],
      oneWayRealisation: "zipline",
    })
  })

  const hallLock = (): Lock => ({
    name: "braziers",
    regions: {
      in: { takes: "free" },
      hall: { takes: "free" },
      annex: { takes: "free" },
      vault: { takes: "free" },
    },
    connections: [["in", "hall"], ["hall", "annex"], { between: ["hall", "vault"], barriers: ["door", "grate"] }],
    gates: {
      door: { from: "hall", to: "vault", owners: ["one", "two"], mode: "any" },
      grate: { from: "hall", to: "vault", owners: ["plates"] },
    },
    mechanics: {
      one: { control: "activator", in: "hall", starts: "unlit", opens: { unlit: [], lit: ["door"] } },
      two: { control: "activator", in: "annex", starts: "unlit", opens: { unlit: [], lit: ["door"] } },
      plates: {
        control: "sequence",
        steps: [{ in: "hall" }, { in: "annex" }, { in: "hall" }],
        resetAt: "grate",
        opens: { done: ["grate"] },
      },
    },
    in: "in",
    out: "vault",
  })

  it("makes an activator a two-state control with no way back, and keeps a gate's mode", () => {
    const { controls, obstacles } = fragmentOf(hallLock())
    expect(controls[0]).toEqual({
      id: "one",
      in: "hall",
      states: ["unlit", "lit"],
      initial: "unlit",
      returnsToInitial: false,
      opens: { unlit: [], lit: ["door"] },
      encounter: "torch",
    })
    expect(obstacles[0]).toEqual({
      id: "door",
      kind: "gate",
      at: { on: "connection", between: ["hall", "vault"] },
      mode: "any",
    })
  })

  it("makes a sequence a sequence control dressed as the realisation the binding names", () => {
    expect(fragmentOf(hallLock()).controls[2]).toEqual({
      id: "plates",
      control: "sequence",
      steps: [{ in: "hall" }, { in: "annex" }, { in: "hall" }],
      resetAt: "grate",
      opens: { done: ["grate"] },
      encounter: "plates",
    })
    expect(fragmentOf(hallLock(), { ...BINDING, sequence: "tiles" }).controls[2].encounter).toBe("tiles")
  })

  it("refuses a sequence the binding leaves without a realisation, naming the kind", () => {
    const { sequence: _sequence, ...withoutSequence } = BINDING

    expect(compile(hallLock(), withoutSequence)).toEqual({
      ok: false,
      faults: [{ type: "unboundRole", kind: "sequence", mechanics: ["plates"] }],
    })
  })

  it("states the order of a connection's barriers, from its first region to its second", () => {
    expect(fragmentOf(hallLock()).barrierOrder).toEqual([{ between: ["hall", "vault"], barriers: ["door", "grate"] }])
  })

  it("makes a region gate a region obstacle", () => {
    expect(fragmentOf(sluiceLock()).obstacles).toEqual([
      { id: "floodedHall", kind: "gate", at: { on: "region", region: "hall" } },
      { id: "floodedVault", kind: "gate", at: { on: "region", region: "vault" } },
    ])
  })

  it("takes a connection a one-way stands on out of the layout and drops from its first region to its second", () => {
    const slide: Lock = {
      name: "slide",
      regions: { a: { takes: "free" }, b: { takes: "free" }, c: { takes: "free" } },
      connections: [["a", "c"], { between: ["a", "b"], barriers: ["chute"] }],
      gates: {},
      oneWays: { chute: { from: "a", to: "b" } },
      mechanics: {},
      in: "a",
      out: "c",
    }
    const fragment = fragmentOf(slide, { "one-way": "zipline" })
    expect(fragment.regionLayout.connections).toEqual([["a", "c"]])
    expect(fragment.obstacles).toEqual([{ id: "chute", kind: "oneWay", at: { on: "connection", between: ["a", "b"] } }])
  })
})

describe("a lock with stones", () => {
  const plateLock = (overrides: Partial<Lock> = {}): Lock => ({
    name: "plate",
    regions: { in: { takes: "free" }, out: { takes: "free" } },
    connections: [{ between: ["in", "out"], barriers: ["door"] }],
    gates: { door: { from: "in", to: "out", owners: ["p"] } },
    mechanics: {},
    weights: {
      plates: {
        p: { in: "in", stone: false, opens: { weighted: ["door"], empty: [] } },
        shelf: { in: "in", stone: true, opens: { weighted: [], empty: [] } },
      },
    },
    in: "in",
    out: "out",
    ...overrides,
  })

  it("takes a plate as a gate's owner, and is checked whole", () => {
    expect(checkLock(plateLock())).toEqual([])
  })

  it("compiles its stones into one weights control, every name in the lock's namespace", () => {
    const fragment = fragmentOf(plateLock(), { ...BINDING, weights: "stonePlate" }, "a")
    const control = fragment.controls.find(c => c.control === "weights")
    expect(control).toMatchObject({
      id: "a.stones",
      control: "weights",
      plates: [
        { id: "a.p", in: "a.in", stone: false },
        { id: "a.shelf", in: "a.in", stone: true },
      ],
      initial: "a.shelf",
      encounter: "stonePlate",
    })
    expect(control!.opens["a.p"]).toEqual(["a.door"])
  })

  it("refuses stones in a build whose registry has no weights kind", () => {
    const withoutWeights = mechanicRegistry(CORE_MECHANICS.filter(kind => kind.control !== "weights"))
    expect(checkLock(plateLock(), withoutWeights)).toEqual([
      { type: "unknownControlKind", mechanic: "stones", control: "weights" },
    ])
  })

  it("asks a binding for the stones like any built kind", () => {
    const result = compile(plateLock(), BINDING)
    expect(result).toEqual({ ok: false, faults: [{ type: "unboundRole", kind: "weights", mechanics: ["stones"] }] })
  })

  it("refuses a plate standing in a region the lock does not have", () => {
    const lock = plateLock()
    const weights = { plates: { ...lock.weights!.plates, p: { ...lock.weights!.plates.p, in: "cellar" } } }
    expect(checkLock({ ...lock, weights })).toContainEqual({ type: "plateNamesNoRegion", plate: "p", region: "cellar" })
  })

  it("refuses unladen on a lock without stones", () => {
    const lock = plateLock({ gates: { door: { from: "in", to: "out", owners: ["unladen"] } }, weights: undefined })
    expect(checkLock(lock)).toContainEqual({ type: "carryWithoutStones", barrier: "door" })
  })
})

describe("empty hands written on a drop", () => {
  const STONES = "in -- yard\nyard -- out\nshelf plate @yard stone"

  it.each([
    ["before", "out -[unladen]- >> in"],
    ["after", "out >> -[unladen]- in"],
  ])("is refused by name, written %s the drop: a drop already takes empty hands", (_, line) => {
    expect(checkLock(parseLock(`${STONES}\n${line}`, "drop").lock)).toEqual([
      { type: "unladenOnDrop", barrier: "out-in", oneWay: "out>in" },
    ])
  })
})

describe("a mechanic of an effect-only kind", () => {
  const asMechanic = (control: string): Lock => {
    const s = sluiceLock()
    return {
      ...s,
      mechanics: { ...s.mechanics, x: { control, in: "annex" } } as unknown as Lock["mechanics"],
    }
  }

  it.each(["unladen", "one-way"])("is refused when a lock declares %s as a mechanic", control => {
    expect(checkLock(asMechanic(control))).toContainEqual({ type: "effectOnlyMechanic", mechanic: "x", control })
  })

  it("leaves the gate owner unladen and the drop one-way alone", () => {
    const lock = parseLock("in -- yard\nyard -[unladen]- out\nout >> in\nshelf plate @yard stone", "drop").lock
    expect(checkLock(lock).map(fault => fault.type)).not.toContain("effectOnlyMechanic")
  })
})
