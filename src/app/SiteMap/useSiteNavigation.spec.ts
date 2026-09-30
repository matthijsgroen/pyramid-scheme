// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { CellState, FloorGrid, GridCell, MechanismRecord, SiteConfig } from "@/game/siteTypes"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { registerFamily } from "@/app/families/familyRegistry"
import { useSiteNavigation } from "./useSiteNavigation"

// A family that keeps its rooms open (FamilyMeta.reEnterable) — declared here as a stub, because which
// families those are is theirs to say and core's only to read.
const RETURNABLE_FAMILY = "stays-open"
registerFamily({
  meta: {
    id: RETURNABLE_FAMILY,
    ownerMod: "test",
    tags: ["puzzle"],
    icon: "",
    color: "",
    rewardPriority: 0,
    reEnterable: true,
  },
  generate: () => null,
  Component: () => null,
})

// A lever family (FamilyMeta.actsOnArrival) — its own room never opens a board at all; taking its
// arrival prompt IS the throw.
const LEVER_FAMILY = "acts-on-arrival"
registerFamily({
  meta: {
    id: LEVER_FAMILY,
    ownerMod: "test",
    tags: ["handle"],
    icon: "",
    color: "",
    rewardPriority: 0,
    reEnterable: true,
    stateIsTheMechanism: true,
    actsOnArrival: true,
  },
  generate: () => null,
  Component: () => null,
})

// Every cell carries the section and the ordinal the assembler gives it, because that is what a write
// is filed under now — `${sectionHash}#${floor}/${slot}` for a room, `~${ordinal}` for a corridor
// (cellIdentity.ts). Without them these fixtures would exercise the fallback rather than the real path.
const SECTION = "sec"
const entrance: GridCell = {
  type: "room",
  roomType: "portal",
  dirs: new Set(["e"]),
  state: "completed",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "0",
}
const corridor: GridCell = {
  type: "corridor",
  dirs: new Set(["w", "e"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
}
const leverMechanism: MechanismRecord = {
  states: ["left", "right"],
  initial: "left",
  returnsToInitial: true,
  positions: [],
}
const leverRoom: GridCell = {
  type: "room",
  roomType: "encounter",
  family: LEVER_FAMILY,
  tags: ["handle"],
  dirs: new Set(["w"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
  pathIndex: 0,
  mechanism: leverMechanism,
}
// An ordinary room, and what makes it one is the family standing in it: every encounter the assembler
// writes down names one, and a room naming none is a room with nothing to open.
const puzzleRoom: GridCell = {
  type: "room",
  roomType: "encounter",
  family: "sumplete",
  tags: ["puzzle"],
  dirs: new Set(["w"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
  pathIndex: 0,
}
const exitRoom: GridCell = {
  type: "room",
  roomType: "portal",
  dirs: new Set(["w"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "2",
}
const stairRoom: GridCell = {
  type: "room",
  roomType: "portal",
  stairId: "s1",
  dirs: new Set(["w"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "2",
}
const bareFork: GridCell = {
  type: "room",
  roomType: "fork",
  dirs: new Set(["w", "e"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
}
const switchRoom: GridCell = { ...bareFork, family: "sumplete", tags: ["puzzle"] }
const fogged: GridCell = {
  type: "corridor",
  dirs: new Set(["w"]),
  state: "fogged",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
}
// A one-way's landing (dirs empty — the asymmetry itself) beside its mouth (dirs {w}, pointing back at
// the landing, never reaching "reachable" — `revealOneWayMouth` only ever lifts its fog to "visible").
const oneWayLanding: GridCell = {
  type: "room",
  roomType: "encounter",
  family: "sumplete",
  dirs: new Set([]),
  state: "completed",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "0",
  pathIndex: 0,
}
const oneWayMouth: GridCell = {
  type: "corridor",
  dirs: new Set(["w"]),
  state: "visible",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "1",
}
const gate = (state: CellState = "reachable"): GridCell => ({
  type: "room",
  roomType: "encounter",
  family: "key-gate",
  tags: ["gate"],
  dirs: new Set(["w", "e"]),
  state,
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "2",
})

// The way a switch shut: a gate by its tags and the key it wants, with nothing standing in it.
const switchGate: GridCell = {
  type: "room",
  roomType: "encounter",
  tags: ["gate"],
  requiredKeyId: "switch:j1#0#0#0:sec",
  gateVariant: "floor-key",
  keyIsAuthored: true,
  dirs: new Set(["w", "e"]),
  state: "reachable",
  sectionHash: SECTION,
  sectionAddress: SECTION,
  ordinal: "2",
}

// What each fixture is filed under once it is placed on the grid.
const CORRIDOR_AT_1 = `${SECTION}#0/~1`
const SWITCH_AT_1 = `${SECTION}#0/xsumplete`
const PUZZLE_AT_1 = `${SECTION}#0/p0`
const LEVER_AT_1 = `${SECTION}#0/p0`
const GATE_AT_2 = `${SECTION}#0/xkey-gate`
const EXIT_AT_1 = `${SECTION}#0/exit`

const gridOf = (cells: GridCell[]): FloorGrid => ({
  cells: [cells],
  rows: 1,
  cols: cells.length,
  entrancePos: [0, 0],
  exitPos: [0, cells.length - 1],
  siteId: "test-site",
  staircases: {},
})

const siteConfig: SiteConfig = [
  { pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
]

// Two floors joined by one staircase, so the far side of `stairRoom` is a real cell to be moved to.
const twoFloors: SiteConfig = [
  { pathPuzzles: 1, difficulty: "starter", end: "treasure", exitOrStaircase: { stairId: "s1" }, sideSections: [] },
  {
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    entrance: { stairId: "s1" },
  },
]

const setup = (cells: GridCell[], skipped: string[] = [], config: SiteConfig = siteConfig) => {
  const journeys = {
    markCellExplored: vi.fn(),
    updatePosition: vi.fn(),
    getPurchasedShopSlots: () => new Set<string>(),
    getSkippedConsumables: () => new Set(skipped),
    getMechanismStates: vi.fn(() => new Map<string, string>()),
    setMechanismState: vi.fn(),
  } as unknown as JourneyAPI
  const onEncounter = vi.fn()
  const onSkippedConsumable = vi.fn()
  const onExitReached = vi.fn()
  const hook = renderHook(() =>
    useSiteNavigation({
      journeys,
      journeyId: "j1",
      siteConfig: config,
      seed: 1,
      currentFloor: 0,
      grid: gridOf(cells),
      explorerPos: [0, 0],
      onEncounter,
      onSkippedConsumable,
      onExitReached,
    })
  )
  return { hook, journeys, onEncounter, onSkippedConsumable, onExitReached }
}

// Anything "on arrival" waits out the walk; the tests jump past it.
const arrive = () => act(() => void vi.advanceTimersByTime(2000))

/** The way in the explorer is standing at, or a failure naming what stands there instead. */
const promptOf = (hook: ReturnType<typeof setup>["hook"]) => {
  const prompt = hook.result.current.prompt
  if (!prompt) throw new Error("the explorer is standing at no way in")
  return prompt
}

describe("useSiteNavigation", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("ignores a tap on ground the player can't reach, so fog can't be walked into", () => {
    const { hook, journeys } = setup([entrance, fogged])

    act(() => hook.result.current.onCellClick(0, 1))

    expect(journeys.updatePosition).not.toHaveBeenCalled()
  })

  it("walks into a corridor and marks it explored", () => {
    const { hook, journeys } = setup([entrance, corridor])

    act(() => hook.result.current.onCellClick(0, 1))

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", CORRIDOR_AT_1)
    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", CORRIDOR_AT_1, "0:0,1")
  })

  // The mouth stays "visible", never "reachable" (`revealOneWayMouth`), so a tap on it needs its own
  // proof that the ordinary reachable/completed gate is not the only door in — it is a genuine stopping
  // point, walked onto the same way any other corridor is.
  it("walks a tap on a one-way mouth onto it, from the landing beside it", () => {
    const { hook, journeys } = setup([oneWayLanding, oneWayMouth])

    act(() => hook.result.current.onCellClick(0, 1))

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", CORRIDOR_AT_1)
    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", CORRIDOR_AT_1, "0:0,1")
  })

  it("opens an unsolved room's board on arrival, with nothing to tap first", () => {
    const { hook, onEncounter } = setup([entrance, puzzleRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    expect(onEncounter).not.toHaveBeenCalled()

    arrive()

    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
    expect(hook.result.current.prompt).toBeNull()
  })

  it("walks through a bare junction without opening anything", () => {
    const { hook, journeys, onEncounter } = setup([entrance, bareFork])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", CORRIDOR_AT_1)
    expect(onEncounter).not.toHaveBeenCalled()
  })

  // A switch is a junction with a puzzle standing in it: what the room HOLDS decides what arriving
  // does, not what type of room it is.
  it("opens the encounter of a junction that carries one", () => {
    const { hook, onEncounter } = setup([entrance, switchRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
  })

  // Standing in a junction is what shows the player the junction — the room and the ways out of it —
  // and that write is the only thing that does. A junction with something standing in it is still a
  // junction, so it is written down the same way a bare one is.
  it("writes down a junction that carries a switch, as it does a bare one", () => {
    const { hook, journeys } = setup([entrance, switchRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", SWITCH_AT_1)
  })

  // The consequence of that write: the room reads completed from the second visit on, so walking back
  // into a switch is the re-entry offer — which is the one thing the mechanic cannot do without, since
  // routing the beam elsewhere is how the branch not taken is opened.
  it("offers the way back into a junction whose switch has already been stood in", () => {
    const { hook, onEncounter } = setup([entrance, { ...bareFork, family: RETURNABLE_FAMILY, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook)).toMatchObject({ kind: "room", at: [0, 1], familyId: RETURNABLE_FAMILY })
    expect(onEncounter).not.toHaveBeenCalled()

    act(() => promptOf(hook).take())
    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
  })

  // A gate's bars are drawn across the FAR side of its own square, so the square is ground the player
  // stands on and the gate is walked into like any other room — no case of its own in here.
  it("walks onto a gate the same as any other encounter room", () => {
    const { hook, journeys, onEncounter } = setup([entrance, corridor, gate()])

    act(() => hook.result.current.onCellClick(0, 2))
    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", GATE_AT_2, "0:0,2")

    arrive()
    expect(onEncounter).toHaveBeenCalledWith([0, 2], true)
  })

  // The switch is what opens this one, and there is nothing in it to enter: it is a wall the player
  // can see. A tap on it moves nobody, opens nothing and is written down nowhere.
  it("does not walk onto a gate holding nothing", () => {
    const { hook, journeys, onEncounter } = setup([entrance, corridor, switchGate])

    act(() => hook.result.current.onCellClick(0, 2))
    arrive()

    expect(journeys.updatePosition).not.toHaveBeenCalled()
    expect(journeys.markCellExplored).not.toHaveBeenCalled()
    expect(onEncounter).not.toHaveBeenCalled()
  })

  it("offers the way out on arrival rather than asking about leaving by itself", () => {
    const { hook, onExitReached } = setup([entrance, exitRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook)).toMatchObject({ kind: "exit", at: [0, 1] })
    expect(onExitReached).not.toHaveBeenCalled()
  })

  it("asks about leaving when the way out's prompt is taken", () => {
    const { hook, onExitReached } = setup([entrance, exitRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()
    act(() => promptOf(hook).take())

    expect(onExitReached).toHaveBeenCalled()
    expect(hook.result.current.prompt).toBeNull()
  })

  it("drops the way out's prompt when the player walks off it, leaving the site alone", () => {
    const { hook, onExitReached } = setup([entrance, corridor, { ...exitRoom, dirs: new Set(["w"]) }])

    act(() => hook.result.current.onCellClick(0, 2))
    arrive()
    expect(promptOf(hook).kind).toBe("exit")

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(hook.result.current.prompt).toBeNull()
    expect(onExitReached).not.toHaveBeenCalled()
  })

  // The way out is a cell the player stood on, and the save has to say so. It is the last slot along
  // its chain, so it carries the section's high-water mark with it: without it, every corridor between
  // the last room and the door sits past the mark and comes back fogged on a floor walked to its end.
  it("marks the way out explored, so the walk to it survives a re-carve", () => {
    const { hook, journeys } = setup([entrance, exitRoom])

    act(() => hook.result.current.onCellClick(0, 1))

    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", EXIT_AT_1)
  })

  // Writing the exit down completes it, and a completed cell is otherwise only walked to. The way out
  // has to keep working on every later visit — backing out of the prompt, or re-entering a pyramid
  // already finished — so it is answered before the completed-cell case, as a staircase is.
  it("still offers the way out at one already walked", () => {
    const { hook, onExitReached } = setup([entrance, { ...exitRoom, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook).kind).toBe("exit")
    act(() => promptOf(hook).take())
    expect(onExitReached).toHaveBeenCalled()
  })

  it("offers the stairs on arrival rather than taking the player off the floor", () => {
    const { hook, journeys } = setup([entrance, stairRoom], [], twoFloors)

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook)).toMatchObject({ kind: "stairs", at: [0, 1] })
    // The one write is the walk onto the stairhead itself; a move to the peer floor would be a second.
    expect(journeys.updatePosition).toHaveBeenCalledTimes(1)
  })

  it("moves to the peer floor when the stairs prompt is taken", () => {
    const { hook, journeys } = setup([entrance, stairRoom], [], twoFloors)

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()
    act(() => promptOf(hook).take())

    const moves = vi.mocked(journeys.updatePosition).mock.calls
    expect(moves).toHaveLength(2)
    expect(moves[1][2]).toMatch(/^1:/)
    expect(hook.result.current.prompt).toBeNull()
  })

  it("drops the stairs prompt when the player walks off the stairhead, staying on the floor", () => {
    const { hook, journeys } = setup([entrance, corridor, { ...stairRoom, dirs: new Set(["w"]) }], [], twoFloors)

    act(() => hook.result.current.onCellClick(0, 2))
    arrive()
    expect(promptOf(hook).kind).toBe("stairs")

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(hook.result.current.prompt).toBeNull()
    expect(vi.mocked(journeys.updatePosition).mock.calls.every(call => call[2].startsWith("0:"))).toBe(true)
  })

  it("repositions the player on a completed room without reopening it", () => {
    const { hook, journeys, onEncounter } = setup([entrance, { ...puzzleRoom, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(journeys.updatePosition).toHaveBeenCalledWith("j1", PUZZLE_AT_1, "0:0,1")
    expect(onEncounter).not.toHaveBeenCalled()
  })

  // The sibling of the two reopen cases below, and the one a whole mechanic rests on: a door that hands
  // over one of the two keys it holds is a door the player has to be able to walk back into.
  it("offers the way back into a completed room whose family says it stays re-enterable", () => {
    const { hook, onEncounter } = setup([entrance, { ...puzzleRoom, family: RETURNABLE_FAMILY, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook)).toMatchObject({ kind: "room", at: [0, 1] })
    expect(onEncounter).not.toHaveBeenCalled()

    act(() => promptOf(hook).take())
    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
  })

  it("drops a re-enterable room's prompt when the player walks off it, opening nothing", () => {
    const { hook, onEncounter } = setup([
      entrance,
      corridor,
      { ...puzzleRoom, family: RETURNABLE_FAMILY, state: "completed" },
    ])

    act(() => hook.result.current.onCellClick(0, 2))
    arrive()
    expect(promptOf(hook).kind).toBe("room")

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(hook.result.current.prompt).toBeNull()
    expect(onEncounter).not.toHaveBeenCalled()
  })

  it("reopens a completed chest whose consumable was left behind, once the player is back at it", () => {
    const reward = { type: "consumable", itemId: "bandage" }
    const { hook, onSkippedConsumable } = setup(
      [entrance, { ...puzzleRoom, state: "completed", reward }],
      [PUZZLE_AT_1]
    )

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(onSkippedConsumable).toHaveBeenCalledWith(reward, PUZZLE_AT_1)
  })

  it("offers the stall of a completed shop that still has unbought stock", () => {
    const { hook, onEncounter } = setup([
      entrance,
      { ...puzzleRoom, state: "completed", stock: [{ type: "consumable", itemId: "bandage" }] },
    ])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook)).toMatchObject({ kind: "room", at: [0, 1], familyId: "sumplete" })
    expect(onEncounter).not.toHaveBeenCalled()

    // freshArrival: the player walked here from elsewhere, which is what a shop's stock reset reads.
    act(() => promptOf(hook).take())
    expect(onEncounter).toHaveBeenCalledWith([0, 1], true)
  })
})

// A lever's whole content is where it is thrown to, and finding 1 of the playtest was this room never
// completing on its own: nothing marked it explored until a modal's own exit button was pressed, which
// nothing here ever asked the player to do. Throwing it now IS that write, on the very first arrival.
describe("a lever family (FamilyMeta.actsOnArrival) throws itself, never opening a board", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("offers to throw it on first arrival, opening no board", () => {
    const { hook, onEncounter } = setup([entrance, leverRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook)).toMatchObject({ kind: "room", at: [0, 1], familyId: LEVER_FAMILY })
    expect(onEncounter).not.toHaveBeenCalled()
  })

  // The fix for finding 1: taking the prompt is the only thing that ever marks this room explored, so
  // it has to happen on the very first visit — a lever a player never revisits must still stop blocking
  // the corridor past it (gridNavigation.ts's `walkableFrom` refuses a still-fogged cell).
  it("writes the mechanism's own state and marks the room explored the instant the prompt is taken", () => {
    const { hook, journeys, onEncounter } = setup([entrance, leverRoom])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()
    act(() => promptOf(hook).take())

    expect(journeys.setMechanismState).toHaveBeenCalledWith(LEVER_AT_1, "right")
    expect(journeys.markCellExplored).toHaveBeenCalledWith(SECTION, "0:0,1", LEVER_AT_1)
    expect(onEncounter).not.toHaveBeenCalled()
  })

  it("throws it to the other side on a later visit, off the side it was last left on", () => {
    const { hook, journeys } = setup([entrance, { ...leverRoom, state: "completed" }])
    vi.mocked(journeys.getMechanismStates).mockReturnValue(new Map([[LEVER_AT_1, "right"]]))

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()
    act(() => promptOf(hook).take())

    expect(journeys.setMechanismState).toHaveBeenCalledWith(LEVER_AT_1, "left")
  })

  it("offers to throw a completed lever again rather than reopening a board for it", () => {
    const { hook, onEncounter } = setup([entrance, { ...leverRoom, state: "completed" }])

    act(() => hook.result.current.onCellClick(0, 1))
    arrive()

    expect(promptOf(hook)).toMatchObject({ kind: "room", at: [0, 1], familyId: LEVER_FAMILY })
    act(() => promptOf(hook).take())

    expect(onEncounter).not.toHaveBeenCalled()
  })
})
