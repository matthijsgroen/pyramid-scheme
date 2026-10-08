import { describe, expect, it } from "vitest"
import { expandFloorLocks } from "./floorLocks"
import type { PlacedLock } from "./floorLocks"
import type { Lock } from "./lockAuthoring"
import { planLockFloor } from "./lockPlan"
import type { LockPlan } from "./lockPlan"
import type { FloorConfig } from "./siteTypes"
import { leverLock, strandingLock } from "./testSupport/floorLockFixtures"
import { BINDING, sluiceLock } from "./testSupport/lockFixtures"

const floorOf = (locks: PlacedLock[]): FloorConfig => ({
  pathPuzzles: 2,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  realisations: BINDING,
  locks,
})

const planOf = (locks: PlacedLock[]): LockPlan | undefined => {
  const result = expandFloorLocks(floorOf(locks))
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.reasons)}`)
  return planLockFloor(result)
}

/** Tiles in the hall, an annex off it and the hall again; the sequence opens the way on to the vault. */
const platesLock = (): Lock => ({
  name: "plates",
  regions: {
    mouth: { takes: "free" },
    hall: { takes: "free" },
    annex: { takes: "free" },
    vault: { takes: "free" },
  },
  connections: [["mouth", "hall"], ["hall", "annex"], { between: ["hall", "vault"], barriers: ["vaultDoor"] }],
  gates: { vaultDoor: { from: "hall", to: "vault", owners: ["plates"] } },
  mechanics: {
    plates: {
      control: "sequence",
      steps: [{ in: "hall" }, { in: "annex" }, { in: "hall" }],
      resetAt: "vaultDoor",
      opens: { done: ["vaultDoor"] },
    },
  },
  in: "mouth",
  out: "vault",
})

describe("the plan of a lock floor", () => {
  it("is absent for a floor that places no locks, even one that lays out regions longhand", () => {
    const longhand: FloorConfig = {
      ...floorOf([]),
      regionLayout: {
        regions: [
          { name: "mouth", appetite: "free" },
          { name: "vault", appetite: "free" },
        ],
        connections: [["mouth", "vault"]],
        in: "mouth",
        out: "vault",
      },
    }
    const result = expandFloorLocks(longhand)
    if (!result.ok) throw new Error("refused")
    expect(planLockFloor(result)).toBeUndefined()
  })

  it("gives a region barrier a door, and so a node, from each entrance", () => {
    expect(planOf([{ lock: sluiceLock() }])).toEqual({
      route: ["entrance", "sluice.pumpRoom", "sluice.gallery", "exit"],
      regions: [
        { id: "entrance", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "sluice.pumpRoom",
          owner: "sluice",
          onRoute: true,
          seats: [{ for: "control", control: "sluice.sluice" }],
          minNodes: 1,
        },
        { id: "sluice.gallery", owner: "sluice", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "sluice.hall",
          owner: "sluice",
          onRoute: false,
          mouth: "sluice.pumpRoom",
          seats: [
            { for: "door", barrier: "sluice.floodedHall", entrance: "sluice.pumpRoom" },
            { for: "door", barrier: "sluice.floodedHall", entrance: "sluice.annex" },
          ],
          minNodes: 2,
        },
        { id: "sluice.annex", owner: "sluice", onRoute: false, mouth: "sluice.pumpRoom", seats: [], minNodes: 1 },
        {
          id: "sluice.vault",
          owner: "sluice",
          onRoute: false,
          mouth: "sluice.pumpRoom",
          seats: [{ for: "door", barrier: "sluice.floodedVault", entrance: "sluice.pumpRoom" }],
          minNodes: 1,
        },
        { id: "exit", onRoute: true, seats: [], minNodes: 1 },
      ],
      corridors: [
        {
          id: "entrance>sluice.pumpRoom",
          from: "entrance",
          to: "sluice.pumpRoom",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "sluice.pumpRoom>sluice.gallery",
          from: "sluice.pumpRoom",
          to: "sluice.gallery",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "sluice.pumpRoom>sluice.hall",
          from: "sluice.pumpRoom",
          to: "sluice.hall",
          onRoute: false,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "sluice.hall>sluice.annex",
          from: "sluice.hall",
          to: "sluice.annex",
          onRoute: false,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "sluice.pumpRoom>sluice.vault",
          from: "sluice.pumpRoom",
          to: "sluice.vault",
          onRoute: false,
          barriers: [],
          minNodes: 0,
        },
        { id: "sluice.gallery>exit", from: "sluice.gallery", to: "exit", onRoute: true, barriers: [], minNodes: 0 },
      ],
      junctions: [],
      drops: [],
      nested: [],
    })
  })

  it("puts a barrier door on its corridor and a seat on the mechanic that works it", () => {
    expect(planOf([{ lock: leverLock() }])).toEqual({
      route: ["entrance", "lever.foyer", "lever.hall", "lever.landing", "exit"],
      regions: [
        { id: "entrance", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "lever.foyer",
          owner: "lever",
          onRoute: true,
          seats: [{ for: "control", control: "lever.lever" }],
          minNodes: 1,
        },
        { id: "lever.hall", owner: "lever", onRoute: true, seats: [], minNodes: 1 },
        { id: "lever.landing", owner: "lever", onRoute: true, seats: [], minNodes: 1 },
        { id: "exit", onRoute: true, seats: [], minNodes: 1 },
      ],
      corridors: [
        { id: "entrance>lever.foyer", from: "entrance", to: "lever.foyer", onRoute: true, barriers: [], minNodes: 0 },
        {
          id: "lever.foyer>lever.hall",
          from: "lever.foyer",
          to: "lever.hall",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "lever.hall>lever.landing",
          from: "lever.hall",
          to: "lever.landing",
          onRoute: true,
          barriers: ["lever.hallDoor"],
          minNodes: 0,
        },
        { id: "lever.landing>exit", from: "lever.landing", to: "exit", onRoute: true, barriers: [], minNodes: 0 },
      ],
      junctions: [],
      drops: [],
      nested: [],
    })
  })

  it("seats one tile per step of a sequence, two in a region where it steps there twice", () => {
    expect(planOf([{ lock: platesLock() }])).toEqual({
      route: ["entrance", "plates.mouth", "plates.hall", "plates.vault", "exit"],
      regions: [
        { id: "entrance", onRoute: true, seats: [], minNodes: 1 },
        { id: "plates.mouth", owner: "plates", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "plates.hall",
          owner: "plates",
          onRoute: true,
          seats: [
            { for: "tile", control: "plates.plates", step: 0 },
            { for: "tile", control: "plates.plates", step: 2 },
          ],
          minNodes: 2,
        },
        {
          id: "plates.annex",
          owner: "plates",
          onRoute: false,
          mouth: "plates.hall",
          seats: [{ for: "tile", control: "plates.plates", step: 1 }],
          minNodes: 1,
        },
        { id: "plates.vault", owner: "plates", onRoute: true, seats: [], minNodes: 1 },
        { id: "exit", onRoute: true, seats: [], minNodes: 1 },
      ],
      corridors: [
        { id: "entrance>plates.mouth", from: "entrance", to: "plates.mouth", onRoute: true, barriers: [], minNodes: 0 },
        {
          id: "plates.mouth>plates.hall",
          from: "plates.mouth",
          to: "plates.hall",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "plates.hall>plates.annex",
          from: "plates.hall",
          to: "plates.annex",
          onRoute: false,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "plates.hall>plates.vault",
          from: "plates.hall",
          to: "plates.vault",
          onRoute: true,
          barriers: ["plates.vaultDoor"],
          minNodes: 0,
        },
        { id: "plates.vault>exit", from: "plates.vault", to: "exit", onRoute: true, barriers: [], minNodes: 0 },
      ],
      junctions: [],
      drops: [],
      nested: [],
    })
  })

  it("lays two locks in sequence on one route, the first's out joined to the second's in", () => {
    expect(planOf([{ lock: leverLock() }, { lock: strandingLock() }])).toEqual({
      route: [
        "entrance",
        "lever.foyer",
        "lever.hall",
        "lever.landing",
        "stranding.foyer",
        "stranding.hall",
        "stranding.landing",
        "exit",
      ],
      regions: [
        { id: "entrance", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "lever.foyer",
          owner: "lever",
          onRoute: true,
          seats: [{ for: "control", control: "lever.lever" }],
          minNodes: 1,
        },
        { id: "lever.hall", owner: "lever", onRoute: true, seats: [], minNodes: 1 },
        { id: "lever.landing", owner: "lever", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "stranding.foyer",
          owner: "stranding",
          onRoute: true,
          seats: [{ for: "control", control: "stranding.torch" }],
          minNodes: 1,
        },
        { id: "stranding.hall", owner: "stranding", onRoute: true, seats: [], minNodes: 1 },
        { id: "stranding.landing", owner: "stranding", onRoute: true, seats: [], minNodes: 1 },
        { id: "exit", onRoute: true, seats: [], minNodes: 1 },
      ],
      corridors: [
        { id: "entrance>lever.foyer", from: "entrance", to: "lever.foyer", onRoute: true, barriers: [], minNodes: 0 },
        {
          id: "lever.foyer>lever.hall",
          from: "lever.foyer",
          to: "lever.hall",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "lever.hall>lever.landing",
          from: "lever.hall",
          to: "lever.landing",
          onRoute: true,
          barriers: ["lever.hallDoor"],
          minNodes: 0,
        },
        {
          id: "lever.landing>stranding.foyer",
          from: "lever.landing",
          to: "stranding.foyer",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "stranding.foyer>stranding.hall",
          from: "stranding.foyer",
          to: "stranding.hall",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "stranding.hall>stranding.landing",
          from: "stranding.hall",
          to: "stranding.landing",
          onRoute: true,
          barriers: ["stranding.hallDoor"],
          minNodes: 0,
        },
        {
          id: "stranding.landing>exit",
          from: "stranding.landing",
          to: "exit",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
      ],
      junctions: [],
      drops: [],
      nested: [],
    })
  })

  it("lays a nested lock in its host's nest spot, between the spot's two regions", () => {
    expect(planOf([{ lock: leverLock() }, { lock: leverLock(), as: "inner", inside: { instance: "lever" } }])).toEqual({
      route: [
        "entrance",
        "lever.foyer",
        "inner.foyer",
        "inner.hall",
        "inner.landing",
        "lever.hall",
        "lever.landing",
        "exit",
      ],
      regions: [
        { id: "entrance", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "lever.foyer",
          owner: "lever",
          onRoute: true,
          seats: [{ for: "control", control: "lever.lever" }],
          minNodes: 1,
        },
        { id: "lever.hall", owner: "lever", onRoute: true, seats: [], minNodes: 1 },
        { id: "lever.landing", owner: "lever", onRoute: true, seats: [], minNodes: 1 },
        {
          id: "inner.foyer",
          owner: "inner",
          onRoute: true,
          seats: [{ for: "control", control: "inner.lever" }],
          minNodes: 1,
        },
        { id: "inner.hall", owner: "inner", onRoute: true, seats: [], minNodes: 1 },
        { id: "inner.landing", owner: "inner", onRoute: true, seats: [], minNodes: 1 },
        { id: "exit", onRoute: true, seats: [], minNodes: 1 },
      ],
      corridors: [
        { id: "entrance>lever.foyer", from: "entrance", to: "lever.foyer", onRoute: true, barriers: [], minNodes: 0 },
        {
          id: "lever.foyer>inner.foyer",
          from: "lever.foyer",
          to: "inner.foyer",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "inner.landing>lever.hall",
          from: "inner.landing",
          to: "lever.hall",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "lever.hall>lever.landing",
          from: "lever.hall",
          to: "lever.landing",
          onRoute: true,
          barriers: ["lever.hallDoor"],
          minNodes: 0,
        },
        {
          id: "inner.foyer>inner.hall",
          from: "inner.foyer",
          to: "inner.hall",
          onRoute: true,
          barriers: [],
          minNodes: 0,
        },
        {
          id: "inner.hall>inner.landing",
          from: "inner.hall",
          to: "inner.landing",
          onRoute: true,
          barriers: ["inner.hallDoor"],
          minNodes: 0,
        },
        { id: "lever.landing>exit", from: "lever.landing", to: "exit", onRoute: true, barriers: [], minNodes: 0 },
      ],
      junctions: [],
      drops: [],
      nested: [{ host: "lever", between: ["lever.foyer", "lever.hall"], instance: "inner" }],
    })
  })
})
