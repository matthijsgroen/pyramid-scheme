import { describe, expect, it } from "vitest"
import {
  diamond,
  freshState,
  leverOpening,
  plainFloor,
  prepOf,
  DIR_MOVE,
  offRouteDoubleBackLayout,
  offRouteDoubleBackConfig,
} from "./carveFixtures"
import { seatChainGates } from "./seatChainGates"
import { assembleFloor } from "./assembleFloor"
import { defaultResolveEncounter } from "../siteAssembler"
import type { Cell, Chain } from "./state"
import type { ResolveEncounter } from "../siteAssembler"
import type { FloorConfig, FloorGrid, RoomCell } from "../siteTypes"
import type { StatefulControl } from "../obstacles"
import type { RegionGraph } from "../regions"
const gate = (id: string) => ({
  id,
  kind: "gate" as const,
  at: { on: "connection" as const, between: ["rightLower", "s1Chamber"] as [string, string] },
})
const diamondWith = (ids: string[]) =>
  prepOf(
    plainFloor({
      regionLayout: diamond,
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
      obstacles: ids.map(gate),
      barrierOrder: ids.length > 1 ? [{ between: ["rightLower", "s1Chamber"], barriers: ids }] : [],
      controls: [leverOpening(ids, "lever", "entrance")],
    })
  )

describe("seatChainGates", () => {
  const seated = (ids: string[], length: number) => {
    const prep = diamondWith(ids)
    const chain: Chain = {
      section: prep.sections.sideSections[0],
      cells: Array.from({ length }, (_, i): Cell => [2 + 2 * i, 0]),
      attachedAt: [0, 0],
      positional: "s0",
      idx: 0,
      doors: [],
      hidden: false,
      keyHostColors: [],
    }
    const state = { ...freshState(prep), lay: null, keys: { chains: [chain], hostColors: new Map() } }
    seatChainGates.run(prep, state)
    return state.chainGates!
  }

  it("stands an off-route gate on the chain's first cell of the far region", () => {
    expect(seated(["bars"], 4)).toEqual({ at: new Map([["bars", { idx: 0, cellIndex: 2 }]]) })
  })

  it("notes a run short where its chain leaves no later cell of the far region before the end room", () => {
    expect(seated(["bars", "grille"], 4)).toEqual({
      at: new Map(),
      runShort: { between: ["rightLower", "s1Chamber"], barriers: ["bars", "grille"] },
    })
  })
})

describe("a side path seating a chain of regions", () => {
  // doubleBack's own shape (docs/game-design/regions-and-containers.md; the doubleBack fixture at
  // lockWalk.spec.ts's describe(walkLock)): the route runs entrance → leftLower → out, leaving
  // rightLower and s1Chamber off it — one branch two regions deep, not two independent pendants,
  // since s1Chamber hangs off rightLower rather than off the route directly. Every appetite is "free"
  // so this stays a pure seating test: what fills a room is a separate concern (regions.spec.ts).
  const diamondLayout = (): RegionGraph => ({
    regions: [
      { name: "entrance", appetite: "free" },
      { name: "rightLower", appetite: "free" },
      { name: "s1Chamber", appetite: "free" },
      { name: "leftLower", appetite: "free" },
      { name: "out", appetite: "free" },
    ],
    connections: [
      ["entrance", "leftLower"],
      ["entrance", "rightLower"],
      ["rightLower", "s1Chamber"],
      ["leftLower", "out"],
    ],
    in: "entrance",
    out: "out",
  })

  const diamondConfig = (): FloorConfig => ({
    pathPuzzles: 1,
    difficulty: "starter",
    end: "treasure",
    exitOrStaircase: "exit",
    regionLayout: diamondLayout(),
    // One side section is all `rightLower`+`s1Chamber` need to share — offRouteChains groups them
    // into a single chain (regions.spec.ts), which this one chain hosts. `sealed` isolates it from
    // leftover maze edges: without a gate or `sealed` an ungated branch has always allowed a stray
    // tree edge to bypass its own content (unrelated to this task), which would make the "seats in
    // order" test below meaningless — it has to prove the order holds where something actually keeps
    // the player from cutting through.
    sideSections: [{ pathPuzzles: 1, difficulty: "starter", end: "treasure", sealed: true }],
  })

  const regionsOn = (grid: FloorGrid): Set<string> => {
    const seen = new Set<string>()
    for (const row of grid.cells)
      for (const cell of row) if (cell.type !== "empty" && cell.region) seen.add(cell.region)
    return seen
  }

  it("carves every declared region onto some cell", () => {
    const result = assembleFloor("site-diamond", diamondConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const seen = regionsOn(result.grid)
    for (const region of diamondLayout().regions) expect(seen.has(region.name)).toBe(true)
  })

  // The failure this test exists to catch is a chain seated out of order: `s1Chamber` reachable
  // without passing through `rightLower` first, which is a lever's gate (`greenRight`, doubleBack's own
  // fixture) a player could then walk straight past. A test that only asserts both regions appear
  // would pass under that bug — this instead proves the physical order, by sealing `rightLower`'s own
  // cells and checking `s1Chamber` becomes unreachable.
  it("seats the chain in order: the mouth-adjacent region stands between the entrance and the deeper one", () => {
    const result = assembleFloor("site-diamond", diamondConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const reachableWithoutRegion = (excludedRegion: string | undefined): Set<string> => {
      const key = (r: number, c: number) => `${r},${c}`
      const [er, ec] = grid.entrancePos
      const seen = new Set([key(er, ec)])
      const queue: Array<[number, number]> = [[er, ec]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r][c]
        if (cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE[dir]
          const nr = r + dr
          const nc = c + dc
          if (seen.has(key(nr, nc))) continue
          const next = grid.cells[nr]?.[nc]
          if (!next || next.type === "empty") continue
          if (next.region === excludedRegion) continue
          seen.add(key(nr, nc))
          queue.push([nr, nc])
        }
      }
      return seen
    }

    const s1Cells = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type !== "empty" && cell.region === "s1Chamber" ? [`${r},${c}`] : []))
    )
    // Sanity: s1Chamber cells genuinely exist and are reachable at all, so the exclusion check below
    // fails for the right reason rather than because nothing was ever reachable.
    expect(s1Cells.length).toBeGreaterThan(0)
    const reachedFreely = reachableWithoutRegion(undefined)
    for (const cellKey of s1Cells) expect(reachedFreely.has(cellKey)).toBe(true)

    // The real check: with every rightLower cell treated as sealed, no s1Chamber cell is reachable.
    const reachedWithoutRightLower = reachableWithoutRegion("rightLower")
    for (const cellKey of s1Cells) expect(reachedWithoutRightLower.has(cellKey)).toBe(false)
  })

  // Watched failing: a floor with nowhere to seat rightLower/s1Chamber's chain (no side section to
  // match it to) must still be refused by name, not silently drop the content that would have gone
  // there into a region the author never named.
  it("still refuses by name when a region genuinely cannot be seated", () => {
    const config: FloorConfig = { ...diamondConfig(), sideSections: [] }
    const result = assembleFloor("site-diamond-unseatable", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toContainEqual({
      type: "regionNotSeated",
      regions: ["rightLower", "s1Chamber"],
    })
  })

  // A switch's ways out are closed on the grid, so the layout check must read the walls `forks` carved and not
  // the doors a switch minted: a carve's refusals are the same with the switch standing as without it.
  it("answers the layout check the same with a plain switch standing in the reserved junction as without one", () => {
    const resolve: ResolveEncounter = (encounter, defaultTag) => ({
      ...defaultResolveEncounter(encounter, defaultTag),
      reEnterable: true,
    })
    const outcome = (config: FloorConfig, seed: number) => {
      const result = assembleFloor("site-diamond-switch", config, seed, resolve)
      return result.success
        ? "carved"
        : result.reasons.map(reason => reason.type).filter(type => type !== "layoutNotFound")
    }
    const plain: FloorConfig = {
      ...diamondConfig(),
      pathPuzzles: 2,
      regionLayout: {
        regions: [
          { name: "entrance", appetite: "free" },
          { name: "leftLower", appetite: "free" },
          { name: "rightLower", appetite: "free" },
          { name: "leftDeep", appetite: "free" },
          { name: "out", appetite: "free" },
        ],
        connections: [
          ["entrance", "leftLower"],
          ["entrance", "rightLower"],
          ["leftLower", "leftDeep"],
          ["entrance", "out"],
        ],
        in: "entrance",
        out: "out",
      },
      oneWayRealisation: "zipline",
      obstacles: [
        { id: "deepGate", kind: "gate", at: { on: "connection", between: ["leftLower", "leftDeep"] } },
        { id: "mouthGate", kind: "gate", at: { on: "connection", between: ["entrance", "leftLower"] } },
        { id: "dropHome", kind: "oneWay", at: { on: "connection", between: ["leftDeep", "entrance"] } },
      ],
      controls: [
        {
          id: "L",
          in: "entrance",
          states: ["unset", "open"],
          initial: "unset",
          returnsToInitial: false,
          opens: { unset: [], open: ["deepGate", "mouthGate"] },
        },
      ],
      sideSections: [
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", sealed: true },
        { pathPuzzles: 1, difficulty: "starter", end: "treasure", sealed: true },
      ],
      forks: [{ exits: 2, count: 1 }],
    }
    const switched: FloorConfig = { ...plain, switches: { encounter: "sumplete", min: 1, max: 1 } }
    const differing: string[] = []
    let carved = 0
    for (let seed = 1; seed <= 40; seed++) {
      const without = outcome(plain, seed)
      if (without === "carved") carved++
      const withSwitch = outcome(switched, seed)
      if (JSON.stringify(without) !== JSON.stringify(withSwitch))
        differing.push(`seed ${seed}: ${JSON.stringify(without)} vs ${JSON.stringify(withSwitch)}`)
    }
    expect(carved).toBeGreaterThan(0)
    expect(differing).toEqual([])
  }, 120_000)
})

describe("a gate on a connection off the threaded route", () => {
  // Every gate room the carve wrote, keyed by which obstacle id its `requiredKeyId` names —
  // `gateKeyOf` mints `obstacle:<journey>#<level>#<floor>:<id>`, so `.includes(id)` is enough to tell
  // them apart without depending on that format here too.
  const gateRoomsOf = (grid: FloorGrid): Array<{ id: string; pos: [number, number]; region?: string }> => {
    const found: Array<{ id: string; pos: [number, number]; region?: string }> = []
    for (const id of ["forkRight", "greenRight", "greenLeft"]) {
      grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.type === "room" && cell.requiredKeyId?.includes(`:${id}`)) {
            found.push({ id, pos: [r, c], region: (cell as RoomCell).region })
          }
        })
      )
    }
    return found
  }

  it("carves with a gate on the chain's own mouth and on a boundary within it", () => {
    const result = assembleFloor("site-doubleback", offRouteDoubleBackConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const gateRooms = gateRoomsOf(result.grid)
    const idsFound = gateRooms.map(g => g.id)
    for (const id of ["forkRight", "greenRight", "greenLeft"]) expect(idsFound).toContain(id)
  })

  // Each gate stands at the seam `seamIndexFor` names: the first cell of the FAR region — the region
  // the player has not yet earned when arriving from the near side.
  it("stands each gate room in the region past its own seam", () => {
    const result = assembleFloor("site-doubleback-boundary", offRouteDoubleBackConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    const byId = new Map(gateRoomsOf(result.grid).map(g => [g.id, g]))
    expect(byId.get("forkRight")?.region).toBe("rightLower")
    expect(byId.get("greenRight")?.region).toBe("s1Chamber")
    expect(byId.get("greenLeft")?.region).toBe("s2Chamber")
  })

  // THE PROPERTY THAT MATTERS: a gate's whole purpose is that it cannot be walked around. `greenRight`
  // stands between `rightLower` and `s1Chamber` — a boundary WITHIN the chain, not at its mouth — so
  // this proves no leftover maze edge lets a player reach `s1Chamber` without crossing that seam. A
  // test that only asserted the gate room exists would pass under that bug; excluding the gate room's
  // OWN cell (not the whole region) and finding `s1Chamber` unreachable is what proves it is the
  // choke point, not merely somewhere nearby it.
  it("cannot be bypassed: every path to the region behind a within-chain gate passes through its gate room", () => {
    const result = assembleFloor("site-doubleback-bypass", offRouteDoubleBackConfig(), 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)
    const { grid } = result

    const greenRightRoom = gateRoomsOf(grid).find(g => g.id === "greenRight")
    if (!greenRightRoom) throw new Error("greenRight gate room not found")
    const [excludedR, excludedC] = greenRightRoom.pos

    const reachableExcluding = (exclude: [number, number] | undefined): Set<string> => {
      const key = (r: number, c: number) => `${r},${c}`
      const [er, ec] = grid.entrancePos
      const seen = new Set([key(er, ec)])
      const queue: Array<[number, number]> = [[er, ec]]
      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = grid.cells[r][c]
        if (cell.type === "empty") continue
        for (const dir of cell.dirs) {
          const [dr, dc] = DIR_MOVE[dir]
          const nr = r + dr
          const nc = c + dc
          if (seen.has(key(nr, nc))) continue
          if (exclude && nr === exclude[0] && nc === exclude[1]) continue
          const next = grid.cells[nr]?.[nc]
          if (!next || next.type === "empty") continue
          seen.add(key(nr, nc))
          queue.push([nr, nc])
        }
      }
      return seen
    }

    // ROOM cells only, and not the gate room itself: the CONNECTOR immediately before the gate room
    // inherits `s1Chamber`'s region label too (a corridor answers to one of the two nodes it joins —
    // an arbitrary pick at a region's own boundary), so it is reachable from the near side without
    // needing the gate at all, same as standing right outside a locked door. That is not a bypass —
    // no *room* stands there — so this checks only cells the region actually holds content in.
    const s1Cells = grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) =>
        cell.type === "room" && cell.region === "s1Chamber" && !(r === excludedR && c === excludedC)
          ? [`${r},${c}`]
          : []
      )
    )
    // Sanity: s1Chamber cells genuinely exist and are reachable at all, so the exclusion check below
    // fails for the right reason rather than because nothing was ever reachable.
    expect(s1Cells.length).toBeGreaterThan(0)
    const reachedFreely = reachableExcluding(undefined)
    for (const cellKey of s1Cells) expect(reachedFreely.has(cellKey)).toBe(true)

    // The real check: with only the gate room itself taken away — not the whole region — no
    // s1Chamber cell is still reachable.
    const reachedWithoutGateRoom = reachableExcluding([excludedR, excludedC])
    for (const cellKey of s1Cells) expect(reachedWithoutGateRoom.has(cellKey)).toBe(false)
  })

  // Watched failing against the pre-fix carve/obstacles.ts: `obstacleOffRoute` refused `forkRight`
  // and `greenRight` outright, before a single wall was carved.
  it("still refuses an obstacle on a connection the carve produces no seam for", () => {
    // `s1Chamber` touches the route a second time here (in addition to hanging off `entrance` via
    // `rightLower`) — the same "genuinely absent" shape obstacles.spec.ts's own unit test names.
    // `offRouteChains` still takes `entrance` as the chain's mouth (declared first), so this second
    // touch is a real graph connection the carve never turns into a physical adjacency.
    const layout = offRouteDoubleBackLayout()
    const config: FloorConfig = {
      ...offRouteDoubleBackConfig(),
      regionLayout: { ...layout, connections: [...layout.connections, ["s1Chamber", "s2Chamber"]] },
      obstacles: [{ id: "nowhere", kind: "gate", at: { on: "connection", between: ["s1Chamber", "s2Chamber"] } }],
      controls: [
        { ...(offRouteDoubleBackConfig().controls![0] as StatefulControl), opens: { unset: [], open: ["nowhere"] } },
      ],
    }
    const result = assembleFloor("site-doubleback-nowhere", config, 42)

    expect(result.success).toBe(false)
    expect(result.success === false && result.reasons).toEqual([
      { type: "obstacleOffRoute", id: "nowhere" },
      { type: "gateBypassed", id: "nowhere", between: ["s1Chamber", "s2Chamber"] },
    ])
  })

  // A gate a control owns carries no family: nothing stands in it to enter, so the interaction is at
  // the control alone.
  it("writes every obstacle gate without a family", () => {
    const result = assembleFloor("site-doubleback-familyless", offRouteDoubleBackConfig(), 42)
    if (!result.success) throw new Error("doubleBack did not assemble")

    const gates = gateRoomsOf(result.grid)
    expect(gates.map(g => g.id).sort()).toEqual(["forkRight", "greenLeft", "greenRight"])
    for (const { pos } of gates) {
      const cell = result.grid.cells[pos[0]][pos[1]]
      expect(cell.type === "room" && cell.family).toBeUndefined()
      expect(cell.type === "room" && cell.tags).toContain("gate")
    }
  })

  // The other shape stays fine: a gate WITHIN the chain (not at its mouth) never lands on `cells[0]`,
  // so it never collides with a floor-key gate there — the two vocabularies really are independent
  // once the mouth case is the only one refused.
  it("does not refuse a within-chain gate alongside the section's own mouth gate", () => {
    const config: FloorConfig = {
      ...offRouteDoubleBackConfig(),
      obstacles: offRouteDoubleBackConfig().obstacles!.filter(o => o.id !== "forkRight"),
      controls: [
        {
          ...(offRouteDoubleBackConfig().controls![0] as StatefulControl),
          opens: { unset: [], open: ["greenRight", "greenLeft"] },
        },
      ],
      sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure", gate: { type: "floor-key" } }],
    }
    const result = assembleFloor("site-doubleback-no-collision", config, 42)

    expect(result.success).toBe(true)
  })

  // A SUB-CHAIN'S OWN `idx` NUMBERS ITS POSITION AMONG ITS PARENT'S SUB-SECTIONS, starting from 0 the
  // same as a top-level chain's own `idx` does — so a gate belonging to top-level chain `idx: 0`
  // (`s0`) must not also land on an unrelated sub-chain that happens to share that same number
  // (`s1.0`, the first sub-section of a SECOND, unrelated top-level section). `s0` here hosts an
  // off-route pocket with a mouth gate; `s1` is an ordinary section whose own sub-section (`s1.0`)
  // shares `idx: 0` purely by coincidence of position.
  it("does not let a top-level chain's gate land on an unrelated sub-chain sharing its idx", () => {
    const layout: RegionGraph = {
      regions: [
        { name: "entrance", appetite: "free" },
        { name: "pocket", appetite: "free" },
        { name: "out", appetite: "free" },
      ],
      connections: [
        ["entrance", "out"],
        ["entrance", "pocket"],
      ],
      in: "entrance",
      out: "out",
    }
    const config: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "starter",
      end: "treasure",
      exitOrStaircase: "exit",
      regionLayout: layout,
      sideSections: [
        // s0: matched to the "pocket" chain (offRouteChains' only component) — its mouth gate always
        // resolves to `cells[0]`.
        { pathPuzzles: 0, difficulty: "starter", end: "treasure" },
        // s1: an ordinary, unrelated section whose own sub-section (s1.0) shares `idx: 0` with s0.
        {
          pathPuzzles: 0,
          difficulty: "starter",
          end: "treasure",
          sideSections: [{ pathPuzzles: 0, difficulty: "starter", end: "treasure" }],
        },
      ],
      obstacles: [{ id: "mouthGate", kind: "gate", at: { on: "connection", between: ["entrance", "pocket"] } }],
      controls: [
        {
          id: "Y",
          in: "entrance",
          states: ["unset", "open"],
          initial: "unset",
          returnsToInitial: false,
          opens: { unset: [], open: ["mouthGate"] },
        },
      ],
    }
    const result = assembleFloor("site-idx-collision", config, 42)
    if (!result.success) throw new Error(`assembly failed: ${JSON.stringify(result.reasons)}`)

    // Every room on the grid, so a stray write anywhere (not just where it was expected) is caught.
    const rooms = result.grid.cells.flat().filter((cell): cell is RoomCell => cell.type === "room")
    const mouthGateRooms = rooms.filter(cell => cell.requiredKeyId?.includes(":mouthGate"))
    // Exactly one room carries the gate — s0's own mouth cell — never a second one on s1.0.
    expect(mouthGateRooms).toHaveLength(1)
    expect(mouthGateRooms[0].sectionAddress).toBe("s0")
  })
})
