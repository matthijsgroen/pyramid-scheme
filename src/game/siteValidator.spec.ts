import { describe, expect, it } from "vitest"
import { armDoor, nodeBeyond, reachableFrom, validateJourney, validateSite } from "./siteValidator"
import type { CellState, CorridorCell, Direction, FloorGrid, GridCell, RoomCell } from "./siteTypes"

// ─── Grid builders ────────────────────────────────────────────────────────────

// Lets test cases below build rooms by kind; translates to the real {roomType, family} shape.
type LegacyRoomKind = "entrance" | "puzzle" | "trap" | "fork" | "gate" | "treasure" | "stairhead" | "exit"

const DEFAULT_FAMILY: Partial<Record<LegacyRoomKind, string>> = {
  puzzle: "sumplete",
  trap: "arithmetic-reflex",
  treasure: "treasure-chest",
  gate: "key-gate",
}

const DEFAULT_TAGS: Partial<Record<LegacyRoomKind, string[]>> = {
  puzzle: ["puzzle"],
  trap: ["trap"],
  treasure: ["treasure"],
  gate: ["gate"],
}

const ENCOUNTER_KINDS: ReadonlySet<LegacyRoomKind> = new Set(["puzzle", "trap", "treasure", "gate"])
const PORTAL_KINDS: ReadonlySet<LegacyRoomKind> = new Set(["entrance", "stairhead", "exit"])

const room = (
  kind: LegacyRoomKind,
  dirs: Direction[],
  opts?: Partial<Omit<RoomCell, "type" | "roomType" | "dirs" | "state">>
): RoomCell => ({
  type: "room",
  roomType: ENCOUNTER_KINDS.has(kind) ? "encounter" : PORTAL_KINDS.has(kind) ? "portal" : "fork",
  dirs: new Set(dirs),
  state: "reachable",
  ...(DEFAULT_FAMILY[kind] ? { family: DEFAULT_FAMILY[kind] } : {}),
  ...(DEFAULT_TAGS[kind] ? { tags: DEFAULT_TAGS[kind] } : {}),
  ...opts,
})

// A way out a switch closed: a gate by its tags and its key, with no family and nothing to enter.
const switchGate = (dirs: Direction[], keyId: string): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "reachable",
  tags: ["gate"],
  requiredKeyId: keyId,
  gateVariant: "floor-key",
  keyIsAuthored: true,
})

const corridor = (dirs: Direction[], state: CellState = "reachable"): CorridorCell => ({
  type: "corridor",
  dirs: new Set(dirs),
  state,
})

const buildGrid = (
  spec: [number, number, GridCell][],
  entrancePos: [number, number],
  exitPos: [number, number],
  siteId = "test"
): FloorGrid => {
  const rows = Math.max(...spec.map(([r]) => r), entrancePos[0], exitPos[0]) + 1
  const cols = Math.max(...spec.map(([, c]) => c), entrancePos[1], exitPos[1]) + 1

  const cells: GridCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): GridCell => ({ type: "empty" }))
  )

  for (const [r, c, cell] of spec) {
    cells[r][c] = cell
  }

  return { cells, rows, cols, entrancePos, exitPos, siteId, staircases: {} }
}

// ─── validateSite ─────────────────────────────────────────────────────────────

describe(validateSite, () => {
  it("passes a valid linear grid", () => {
    // entrance(0,0) -e- corridor(0,1) -e- treasure(0,2) mosaic -e- exit(0,3)
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, corridor(["w", "e"])],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("keyBeforeGate: fails when gate's key doesn't exist in the grid", () => {
    // entrance -e- gate(requiredKeyId="nonexistent") -e- exit
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "nonexistent-key", gateVariant: "floor-key" })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "keyAfterGate")).toBe(true)
    }
  })

  it("keyBeforeGate: passes an authored gate with no on-floor key chest", () => {
    // entrance -e- gate(requiredKeyId="authored:east", keyIsAuthored) -e- exit, no chest anywhere
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [
          0,
          1,
          room("gate", ["w", "e"], {
            requiredKeyId: "authored:east",
            gateVariant: "floor-key",
            keyIsAuthored: true,
          }),
        ],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("keyBeforeGate: fails when key node is behind the gate it unlocks", () => {
    // entrance -e- gate(requiredKeyId="key-chest") -e- key-chest(tombKey keyId="key-chest") -e- exit
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "key-chest", gateVariant: "floor-key" })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "tombKey", keyId: "key-chest" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "keyAfterGate")).toBe(true)
    }
  })

  it("keyBeforeGate: passes when key is reachable on a branch before the gate", () => {
    // entrance(0,0) has dirs ["e","s"]
    // key-branch(1,0): tombKey, dirs ["n"]
    // gate(0,1): requiredKeyId="key-branch", dirs ["w","e"]
    // exit(0,2): dirs ["w"]
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e", "s"])],
        [1, 0, room("treasure", ["n"], { reward: { type: "tombKey", keyId: "key-branch" } })],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "key-branch", gateVariant: "floor-key" })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: fails when a fork leads only to puzzle nodes", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("puzzle", ["n"])],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "allBlandFork")).toBe(true)
    }
  })

  // The way a switch shuts is a gate cell with nothing standing in it, and what a branch is worth is
  // read off the tags a cell wears rather than off the family in it — so a branch ending at one is
  // worth walking, exactly as a ward's door is.
  it("noAllBlandFork: passes when a branch ends at a gate holding no encounter", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, switchGate(["n"], "switch:site#0#0#0:main")],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: fails when a fork leads only to a trap, same as only to puzzles", () => {
    // A branch that is nothing but a punishment is the case the rule was written for.
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("trap", ["n"])],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reasons.some(r => r.type === "allBlandFork")).toBe(true)
  })

  it("noAllBlandFork: passes when a trap sits on the way to something worth reaching", () => {
    // A trap is traversed like a puzzle rather than ending the search. Stopping at it judged
    // fork → trap → treasure as bland, which is the opposite of what the rule means — and made a
    // floor's whole layout depend on which family a room was given, since a rejected layout is
    // re-carved at a different seed.
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("trap", ["n", "s"])],
        [2, 1, room("treasure", ["n"], { reward: { type: "money", amount: 1 } })],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: passes when a fork has at least one treasure branch", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("treasure", ["n"], { reward: { type: "money", amount: 1 } })],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: passes when a fork has a gate branch", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("gate", ["n"], { requiredKeyId: "tomb-key-external", gateVariant: "tomb-key" })],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: passes when a fork has a stairhead branch", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, room("stairhead", ["n"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  // A lock's control is a room the player has to stand in to work it, so a branch ending at one is worth walking.
  const lever: RoomCell = {
    type: "room",
    roomType: "encounter",
    dirs: new Set(["n"]),
    state: "reachable",
    mechanism: { states: ["left", "right"], initial: "left", returnsToInitial: true, positions: [] },
  }
  const mechanismRoom = (extra: Partial<RoomCell>): RoomCell => ({
    type: "room",
    roomType: "encounter",
    dirs: new Set(["n"]),
    state: "reachable",
    ...extra,
  })
  it.each<[string, RoomCell]>([
    ["a lever", lever],
    [
      "a plate",
      mechanismRoom({ plate: { id: "made.up" }, worksMechanism: { mechanismId: "made.stones", transition: 0 } }),
    ],
    [
      "a sequence tile",
      mechanismRoom({
        sequenceTile: { id: "made.Sun", step: 0, glyph: 1, entrance: "made.court" },
        worksMechanism: { mechanismId: "made.Sun", transition: 0 },
      }),
    ],
    ["a pipe hole", mechanismRoom({ pipeHole: { pipe: "made.pipe", region: "made.east" } })],
    [
      "a room working a mechanism elsewhere",
      mechanismRoom({ worksMechanism: { mechanismId: "made.x", transition: 0 } }),
    ],
  ])("noAllBlandFork: passes when a fork's only other branch ends at %s", (_name, cell) => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, cell],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid ? [] : result.reasons.filter(r => r.type === "allBlandFork")).toEqual([])
  })

  it("noAllBlandFork: fails when a fork's branches lead to untagged rooms that work nothing", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, mechanismRoom({})],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid ? [] : result.reasons.filter(r => r.type === "allBlandFork")).toEqual([
      { type: "allBlandFork", forkPos: [0, 1] },
    ])
  })

  it("noAllBlandFork: walks through a pass-through chamber to what lies beyond it", () => {
    const chamber: RoomCell = { type: "room", roomType: "chamber", dirs: new Set(["n", "s"]), state: "reachable" }
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, chamber],
        [2, 1, room("treasure", ["n"], { reward: { type: "money", amount: 1 } })],
      ],
      [0, 0],
      [0, 2]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("noAllBlandFork: a branch holding only a chamber that ends in nothing is still bland", () => {
    const chamber: RoomCell = { type: "room", roomType: "chamber", dirs: new Set(["n"]), state: "reachable" }
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("fork", ["w", "e", "s"])],
        [0, 2, room("puzzle", ["w"])],
        [1, 1, chamber],
      ],
      [0, 0],
      [0, 2]
    )
    const result = validateSite(grid)
    expect(result.valid ? [] : result.reasons.filter(r => r.type === "allBlandFork")).toEqual([
      { type: "allBlandFork", forkPos: [0, 1] },
    ])
  })

  it("keyBeforeGate: tomb-key gate is not validated (key lives off-floor)", () => {
    // tomb-key gate with no matching key on this floor — should still pass
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "tomb-key-external", gateVariant: "tomb-key" })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3]
    )
    expect(validateSite(grid)).toEqual({ valid: true })
  })

  it("mosaicReachable: fails when mosaic is unreachable even with all keys", () => {
    // mosaic is in a disconnected cell — not reachable via any path
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("exit", ["w"])],
        [0, 2, room("treasure", [], { reward: { type: "mosaicPiece" } })],
      ],
      [0, 0],
      [0, 1]
    )
    const result = validateSite(grid)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicNotReachable")).toBe(true)
    }
  })

  // Two openers on one barrier and the player cannot tell which door they are looking at, nor which of
  // the two they have just satisfied. The floor stops being readable before it stops being solvable.
  it("boundaryGatedTwice: fails when a switch closes a way out a ward's door already owns", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [
          0,
          1,
          room("fork", ["w", "e"], {
            exits: [
              { dir: "w", kind: "main" },
              { dir: "e", kind: "side", gateKeyId: "switch:test:s0" },
            ],
          }),
        ],
        [0, 2, room("gate", ["w", "e"], { requiredKeyId: "ward:x", gateVariant: "tomb-key" })],
        [0, 3, room("treasure", ["w"], { reward: { type: "mosaicPiece" } })],
      ],
      [0, 0],
      [0, 3]
    )
    expect(validateSite(grid)).toEqual({
      valid: false,
      reasons: [{ type: "boundaryGatedTwice", pos: [0, 2], keyIds: ["switch:test:s0", "ward:x"] }],
    })
  })

  // The opener has to come before the blocker. A fork gives that for nothing — the player is standing in
  // it — right up until a corridor reaches round the back of the door it closed.
  it("switchGateNotBehindSwitch: fails when a corridor reaches a switch's gate around the switch", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, corridor(["w", "e", "s"])],
        [
          0,
          2,
          room("fork", ["w", "e"], {
            exits: [
              { dir: "w", kind: "main" },
              { dir: "e", kind: "side", gateKeyId: "switch:test:s0" },
            ],
          }),
        ],
        [
          0,
          3,
          room("gate", ["w", "e"], {
            requiredKeyId: "switch:test:s0",
            gateVariant: "floor-key",
            keyIsAuthored: true,
          }),
        ],
        [0, 4, room("treasure", ["w"], { reward: { type: "mosaicPiece" } })],
        [1, 1, corridor(["n", "e"])],
        [1, 2, corridor(["w", "e"])],
        [1, 3, corridor(["w", "n"])],
      ],
      [0, 0],
      [0, 4]
    )
    expect(validateSite(grid)).toEqual({
      valid: false,
      reasons: [{ type: "switchGateNotBehindSwitch", switchPos: [0, 2], gatePos: [0, 3] }],
    })
  })
})

// ─── reachableFrom: requiredKeyIds (a tableau needing several hieroglyphs complete) ───────

describe(nodeBeyond, () => {
  it("follows a way out round its bends to the room it leads to", () => {
    const grid = buildGrid(
      [
        [0, 0, room("fork", ["e"])],
        [0, 1, corridor(["w", "e"])],
        [0, 2, corridor(["w", "s"])],
        [1, 2, corridor(["n", "e"])],
        [1, 3, switchGate(["w"], "k")],
      ],
      [0, 0],
      [1, 3]
    )
    expect(nodeBeyond(grid, [0, 0], "e")).toEqual([1, 3])
  })

  it("walks straight through a junction it meets", () => {
    const grid = buildGrid(
      [
        [0, 0, room("fork", ["e"])],
        [0, 1, corridor(["w", "e", "s"])],
        [0, 2, switchGate(["w"], "k")],
        [1, 1, corridor(["n"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(nodeBeyond(grid, [0, 0], "e")).toEqual([0, 2])
  })
})

describe(armDoor, () => {
  it("finds the door past a sequence tile the way out reaches round a bend", () => {
    const grid = buildGrid(
      [
        [0, 0, room("fork", ["e"])],
        [0, 1, corridor(["w", "s"])],
        [1, 1, room("puzzle", ["n", "e"], { sequenceTile: { id: "s", step: 0, glyph: 0, entrance: "start" } })],
        [1, 2, corridor(["w", "e"])],
        [1, 3, switchGate(["w"], "k")],
      ],
      [0, 0],
      [1, 3]
    )
    expect(armDoor(grid, [0, 0], "e")).toEqual([1, 3])
  })
})

describe(reachableFrom, () => {
  it("blocks a room needing several keys until all of them are owned", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("puzzle", ["w", "e"], { requiredKeyIds: ["hieroglyph:a", "hieroglyph:b"] })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(reachableFrom(grid, [0, 0]).has("0,2")).toBe(false)
    expect(reachableFrom(grid, [0, 0], new Set(["hieroglyph:a"])).has("0,2")).toBe(false)
    expect(reachableFrom(grid, [0, 0], new Set(["hieroglyph:a", "hieroglyph:b"])).has("0,2")).toBe(true)
  })

  it("requiredKeyId and requiredKeyIds both gate the same room independently", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "k1", requiredKeyIds: ["hieroglyph:a"] })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(reachableFrom(grid, [0, 0], new Set(["k1"])).has("0,2")).toBe(false)
    expect(reachableFrom(grid, [0, 0], new Set(["hieroglyph:a"])).has("0,2")).toBe(false)
    expect(reachableFrom(grid, [0, 0], new Set(["k1", "hieroglyph:a"])).has("0,2")).toBe(true)
  })

  // An authored key (RoomCell.keyIsAuthored) is minted by a room a player solves, not placed by
  // the world-gen loot solver — reporting it in blockedRequirements would ask placeFragments'
  // winnability guard to prove a fact only gameplay resolves (placeFragments.ts's final check
  // throws on any non-empty discoveredLocks). These two cases pin both halves of the fix:
  // traversal still treats the gate as a real, unopened door either way, but only an unauthored
  // one is reported as a lock the placement worklist needs to satisfy.
  it("an authored gate blocks the walk but is never reported as a discovered lock", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [
          0,
          1,
          room("gate", ["w", "e"], { requiredKeyId: "authored:east", gateVariant: "floor-key", keyIsAuthored: true }),
        ],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    const blockedRequirements = new Set<string>()
    const reachable = reachableFrom(grid, [0, 0], new Set(), { blockedRequirements })
    expect(reachable.has("0,2")).toBe(false)
    expect(blockedRequirements.size).toBe(0)
  })

  it("the same gate without keyIsAuthored blocks the walk AND is reported as a discovered lock", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "authored:east", gateVariant: "floor-key" })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    const blockedRequirements = new Set<string>()
    const reachable = reachableFrom(grid, [0, 0], new Set(), { blockedRequirements })
    expect(reachable.has("0,2")).toBe(false)
    expect(blockedRequirements).toEqual(new Set(["authored:east"]))
  })

  // The plural form is the same rule. No family asks for several authored keys at once today; the one
  // that does must not have to rediscover why the singular branch skips the report.
  it("an authored room asking for SEVERAL keys is reported no differently", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyIds: ["authored:east", "authored:north"], keyIsAuthored: true })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    const blockedRequirements = new Set<string>()
    const reachable = reachableFrom(grid, [0, 0], new Set(), { blockedRequirements })
    expect(reachable.has("0,2")).toBe(false)
    expect(blockedRequirements.size).toBe(0)
  })

  it("authoredKeysHeld walks through an authored gate whose key nobody holds", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [
          0,
          1,
          room("gate", ["w", "e"], { requiredKeyId: "authored:east", gateVariant: "floor-key", keyIsAuthored: true }),
        ],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(reachableFrom(grid, [0, 0], new Set(), { authoredKeysHeld: true }).has("0,2")).toBe(true)
  })

  it("authoredKeysHeld walks through an authored gate asking for SEVERAL keys", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyIds: ["authored:east", "authored:north"], keyIsAuthored: true })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    expect(reachableFrom(grid, [0, 0], new Set(), { authoredKeysHeld: true }).has("0,2")).toBe(true)
  })

  it("authoredKeysHeld leaves an UNAUTHORED gate shut, so it opens doors rather than all of them", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "tomb:ward", gateVariant: "floor-key" })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2]
    )
    const blockedRequirements = new Set<string>()
    expect(reachableFrom(grid, [0, 0], new Set(), { blockedRequirements, authoredKeysHeld: true }).has("0,2")).toBe(
      false
    )
    expect(blockedRequirements).toEqual(new Set(["tomb:ward"]))
  })

  it("walks a hidden cell by default, and leaves it and what lies past it out when hiddenOpen is false", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, { ...corridor(["w", "e"]), hidden: true }],
        [0, 2, room("treasure", ["w"], { hidden: true })],
      ],
      [0, 0],
      [0, 0]
    )
    expect(reachableFrom(grid, [0, 0]).has("0,2")).toBe(true)
    const shut = reachableFrom(grid, [0, 0], new Set(), { hiddenOpen: false })
    expect(shut.has("0,1")).toBe(false)
    expect(shut.has("0,2")).toBe(false)
  })
})

// ─── validateJourney ──────────────────────────────────────────────────────────

describe(validateJourney, () => {
  const gridWithMapPiece = (siteId: string): FloorGrid =>
    buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("treasure", ["w", "e"], { reward: { type: "mapPiece", tombId: "test_tomb" } })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3],
      siteId
    )

  const gridWithoutMapPiece = (siteId: string): FloorGrid =>
    buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("puzzle", ["w", "e"])],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 3],
      siteId
    )

  it("passes when exactly one site has a map piece and all have mosaic", () => {
    const grids = [gridWithMapPiece("site-1"), gridWithoutMapPiece("site-2")]
    expect(validateJourney(grids)).toEqual({ valid: true })
  })

  it("mapPieceMissing: fails when no site has a map piece", () => {
    const grids = [gridWithoutMapPiece("site-1"), gridWithoutMapPiece("site-2")]
    const result = validateJourney(grids)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceMissing")).toBe(true)
    }
  })

  it("mapPieceDuplicate: fails when two sites have a map piece", () => {
    const grids = [gridWithMapPiece("site-1"), gridWithMapPiece("site-2")]
    const result = validateJourney(grids)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceDuplicate")).toBe(true)
    }
  })

  it("mapPieceNotSealReachable: fails when map piece is behind a gate", () => {
    const grid = buildGrid(
      [
        [0, 0, room("puzzle", ["e", "s"])],
        [0, 1, room("gate", ["w", "e"], { requiredKeyId: "tomb-key" })],
        [0, 2, room("treasure", ["w"], { reward: { type: "mapPiece", tombId: "test_tomb" } })],
        [1, 0, room("treasure", ["n", "e"], { reward: { type: "mosaicPiece" } })],
        [1, 1, room("exit", ["w"])],
      ],
      [0, 0],
      [1, 1],
      "site-1"
    )
    const result = validateJourney([grid])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceNotSealReachable")).toBe(true)
    }
  })

  it("mosaicMissing: fails when a site has no primary reward (neither mosaicPiece nor mapPiece)", () => {
    const noPrimary = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("treasure", ["w", "e"], { reward: { type: "money", amount: 1 } })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2],
      "site-1"
    )
    const result = validateJourney([noPrimary])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicMissing")).toBe(true)
    }
  })

  it("mapPiece is valid as a primary reward (no mosaicMissing)", () => {
    const mapPieceOnly = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("treasure", ["w", "e"], { reward: { type: "mapPiece", tombId: "test_tomb" } })],
        [0, 2, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 2],
      "site-1"
    )
    const result = validateJourney([mapPieceOnly])
    // mapPiece counts as a primary reward — mosaicMissing should NOT fire
    // (mapPieceMissing will fire since there's no mosaicPiece journey-wide, but that's separate)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicMissing")).toBe(false)
    }
  })

  it("mosaicDuplicate: fails when a site has two mosaic rooms", () => {
    const twoMosaics = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, room("treasure", ["w", "e"], { reward: { type: "mapPiece", tombId: "test_tomb" } })],
        [0, 2, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 3, room("treasure", ["w", "e"], { reward: { type: "mosaicPiece" } })],
        [0, 4, room("exit", ["w"])],
      ],
      [0, 0],
      [0, 4],
      "site-1"
    )
    const result = validateJourney([twoMosaics])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicDuplicate")).toBe(true)
    }
  })
})

describe("reachableFrom across a drop", () => {
  const drop = (dir: Direction): CorridorCell & { obstacle: { dir: Direction; kind: string } } => ({
    ...corridor([]),
    obstacle: { dir, kind: "zipline" },
  })
  // start(0,0) -e- launch(0,1) [span (0,2),(0,3)] landing(0,4) -e- far(0,5)
  const grid = buildGrid(
    [
      [0, 0, room("puzzle", ["e"])],
      [0, 1, corridor(["w"])],
      [0, 2, drop("e")],
      [0, 3, drop("e")],
      [0, 4, corridor(["e"])],
      [0, 5, room("treasure", ["w"], { reward: { type: "mosaicPiece" } })],
    ],
    [0, 0],
    [0, 5]
  )

  it("reaches a room only a drop leads to", () => {
    expect(reachableFrom(grid, [0, 0]).has("0,5")).toBe(true)
  })

  it("never walks a drop back from its landing", () => {
    const reached = reachableFrom(grid, [0, 5])
    expect(reached.has("0,4")).toBe(true)
    expect(reached.has("0,0")).toBe(false)
  })

  it("crosses every drop launched from one cell", () => {
    // launch(0,1) drops east onto (0,4) and south onto (3,1)
    const twoDrops = buildGrid(
      [
        [0, 0, room("puzzle", ["e"])],
        [0, 1, corridor(["w"])],
        [0, 2, drop("e")],
        [0, 3, drop("e")],
        [0, 4, room("treasure", [], { reward: { type: "mosaicPiece" } })],
        [1, 1, drop("s")],
        [2, 1, drop("s")],
        [3, 1, room("exit", [])],
      ],
      [0, 0],
      [3, 1]
    )
    const reached = reachableFrom(twoDrops, [0, 0])
    expect(reached.has("0,4")).toBe(true)
    expect(reached.has("3,1")).toBe(true)
  })
})
