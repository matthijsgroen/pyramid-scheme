import { describe, expect, it } from "vitest"
import { carvedFloorDigest } from "@/data/tierFingerprints"
import { parsePrefab } from "../prefabNotation"
import type { Prefab } from "../prefabTypes"
import {
  decorationFootprint,
  type DecorationKind,
  type Direction,
  type FloorConfig,
  type FloorGrid,
  type GridCell,
  type MechanismRecord,
  type RoomCell,
} from "../siteTypes"
import { assembleFloor } from "./assembleFloor"
import { chamberFloor, prepOf } from "./carveFixtures"
import { carveFloor } from "./carveFloor"
import { LATTICE_ENGINE } from "./engines"
import { finish } from "./finish"
import { TAIL_READS } from "./passes"
import { choosePrefabs, fitPrefab, placePrefabs, stampPrefab, webDoorInPrefab } from "./placePrefabs"
import { render } from "./render"
import { requireReads, type Finish, type FloorPrep } from "./state"
import { standPieces } from "./standPieces"
import { validate } from "./validate"

const MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
const LEVER = { states: ["a", "b"], initial: "a", returnsToInitial: true, positions: [] } as MechanismRecord

/** What each letter of a drawn floor stands for; `.` is corridor, a space void. */
const LETTERS: Record<string, Partial<RoomCell>> = {
  F: { roomType: "fork" },
  C: { roomType: "chamber" },
  T: { roomType: "encounter", family: "treasure-chest", tags: ["treasure"] },
  P: { roomType: "encounter", family: "sumplete" },
  S: { roomType: "portal", stairId: "up" },
  L: { roomType: "encounter", plate: { id: "plate" } },
  M: { roomType: "fork", mechanism: LEVER },
  E: { roomType: "portal" },
}

/** A floor drawn as text, each cell open toward every drawn neighbour; `extra` adds fields to the room at "r,c". */
const floorFrom = (rows: string[], extra: Record<string, Partial<RoomCell>> = {}): FloorGrid => {
  const cols = Math.max(...rows.map(row => row.length))
  const drawn = (r: number, c: number) => (rows[r]?.[c] ?? " ") !== " "
  let entrance: [number, number] = [-9, -9]
  const cells = rows.map((_, r) =>
    Array.from({ length: cols }, (_, c): GridCell => {
      const ch = rows[r][c] ?? " "
      if (ch === " ") return { type: "empty" }
      const dirs = new Set((Object.keys(MOVES) as Direction[]).filter(d => drawn(r + MOVES[d][0], c + MOVES[d][1])))
      if (ch === ".") return { type: "corridor", dirs, state: "fogged" }
      if (ch === "E") entrance = [r, c]
      return { type: "room", dirs, state: "fogged", ...LETTERS[ch], ...extra[`${r},${c}`] } as RoomCell
    })
  )
  return { siteId: "site", rows: rows.length, cols, entrancePos: entrance, exitPos: [-9, -9], staircases: {}, cells }
}

const footprintOf = (kind: DecorationKind) =>
  kind === "mat" ? { cols: 1, rows: 1, tall: 0, ground: true as const } : decorationFootprint(kind)
const prefab = (text: string): Prefab => parsePrefab(`tier junior\n${text}`, "room", footprintOf)

const HALL = prefab(`room hall
layout
# # d # #
# p . . #
d . . . d
# . . s #
# # d # #
p floor pillar
s stop`)

const GALLERY = prefab(`room gallery
layout
# # # # #
d . . . d
# . s . #
# # # # #
s stop`)

const WIDE_HALL = prefab(`room wideHall
layout
# # # d # # #
# . . . . . #
# . . . . . #
d . . . s . d
# . . . . . #
# . . . . . #
# # # d # # #
s stop`)

const VAULT = prefab(`room vault
layout
# # # # #
# c . . #
d . . s #
# . . . #
# # # # #
c chest
s stop`)

const DEN = prefab(`room den
layout
# # d # #
# c . . #
d . . . d
# . . s #
# # d # #
c chest
s stop`)

const STORE = prefab(`room store
layout
# # # # # # #
# g . g . g #
d . . s . . d
# # # # # # #
g wall jarRack | shelf | basketStack | bales 2 of 3
s stop`)

const PORCH = prefab(`room porch
mirror
layout
# # # # #
# m . s d
# # # # #
m ground mat
s stop`)

const ALCOVE = prefab(`room alcove
mirror
layout
# d # #
d . s d
# d # #
s stop`)

const PREFABS = { hall: HALL, wideHall: WIDE_HALL, gallery: GALLERY, vault: VAULT, den: DEN, store: STORE }

/** The prep `placePrefabs` reads: the site and the floor's rooms. */
const prepFor = (config: Partial<FloorConfig>, siteId = "site"): FloorPrep =>
  ({ input: { siteId }, config: { config: { sideSections: [], prefabs: PREFABS, ...config } } }) as unknown as FloorPrep
const placing = (room: string, min: number, max: number, central = 0.5) => ({
  prefabPlacements: [{ room, min, max, central }],
})
const placed = (result: ReturnType<typeof placePrefabs>): FloorGrid => {
  if ("retry" in result || "fatal" in result) throw new Error(JSON.stringify(result))
  return result
}
const prefabRooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type !== "empty" && cell.prefabRoom ? [{ r, c, room: cell.prefabRoom }] : []))
  )

// A fork at 4,4 with an arm of four each way: the entrance west, treasure at the other three ends.
const CROSS = [
  "    T    ",
  "    .    ",
  "    .    ",
  "    .    ",
  "E...F...T",
  "    .    ",
  "    .    ",
  "    .    ",
  "    T    ",
]

// The same, wider: a fork at 5,5 with an arm of five each way.
const WIDE_CROSS = [
  "     T     ",
  "     .     ",
  "     .     ",
  "     .     ",
  "     .     ",
  "E....F....T",
  "     .     ",
  "     .     ",
  "     .     ",
  "     .     ",
  "     T     ",
]

// A fork at 4,4 between the entrance and a treasure at 4,8 with room east of it, and one more south.
const CHEST_FLOOR = [
  "             ",
  "             ",
  "             ",
  "             ",
  "E...F...T    ",
  "    .",
  "    .",
  "    .",
  "    T",
]

// The fork at 4,6 sits in the middle of the walk; the treasure at 4,18 is its far end.
const LONG_ARM = [
  "                     ",
  "                     ",
  "                     ",
  "                     ",
  "E.....F...........T  ",
  "      .",
  "      .",
  "      .",
  "      T",
]

// Two forks, at 4,4 and 4,12, each with a treasure south of it.
const TWO_FORKS = [
  "                 ",
  "                 ",
  "                 ",
  "                 ",
  "E...F.......F...T",
  "    .       .",
  "    .       .",
  "    .       .",
  "    T       T",
]

describe("fitPrefab", () => {
  it("places a hall over a fork whose arms leave through door places", () => {
    const room = fitPrefab(floorFrom(CROSS), 4, 4, HALL, "site")
    expect(room).toMatchObject({
      name: "hall",
      rect: { top: 3, left: 3, rows: 3, cols: 3 },
      doors: { n: [2, 4], s: [6, 4], w: [4, 2], e: [4, 6] },
      stop: [5, 5],
      objects: [{ kind: "pillar", layer: "floor", top: 3, left: 3, rows: 1, cols: 1 }],
    })
    expect(room?.blocked).toEqual(expect.arrayContaining(["2,2", "3,3", "6,6"]))
    expect(room?.blocked).not.toContain("2,4")
  })

  it("refuses a fit where an arm leaves through a wall", () => {
    expect(fitPrefab(floorFrom(CROSS), 4, 4, GALLERY, "site")).toBeUndefined()
  })

  it("draws unused door places as wall", () => {
    const threeArms = CROSS.map((row, r) => (r === 4 ? "E...F    " : row))
    const room = fitPrefab(floorFrom(threeArms), 4, 4, HALL, "site")
    expect(room?.doors).toEqual({ n: [2, 4], s: [6, 4], w: [4, 2] })
    expect(room?.blocked).toContain("4,6")
  })

  it("never covers another room's 3x3, a stair, a mechanism, a puzzle stop or a foreign corridor", () => {
    const at = (r: number, c: number, ch: string) =>
      WIDE_CROSS.map((row, rr) => (rr === r ? row.slice(0, c) + ch + row.slice(c + 1) : row))
    expect(fitPrefab(floorFrom(WIDE_CROSS), 5, 5, WIDE_HALL, "site")).toBeDefined()
    const blocked = {
      "another room's 3x3": at(1, 8, "C"),
      stair: at(5, 7, "S"),
      mechanism: at(5, 7, "L"),
      "puzzle stop": at(5, 7, "P"),
      "foreign corridor": at(3, 3, "."),
    }
    for (const [what, rows] of Object.entries(blocked))
      expect(fitPrefab(floorFrom(rows), 5, 5, WIDE_HALL, "site"), what).toBeUndefined()
  })

  it("mirrors a room to fit, and flips its ground objects", () => {
    const room = fitPrefab(floorFrom(CHEST_FLOOR), 4, 8, PORCH, "site")
    expect(room?.mirrored).toBe(true)
    expect(room?.objects).toEqual([expect.objectContaining({ kind: "mat", layer: "ground", flip: true })])
  })
})

describe("a patron place", () => {
  const shrine = (kinds: string) =>
    prefab(`room shrine
layout
# # d # #
# p . . #
d . . . d
# . . s #
# # d # #
p ${kinds}
s stop`)
  const kindOf = (kinds: string, patron?: "anubis") =>
    fitPrefab({ ...floorFrom(CROSS), ...(patron ? { patron } : {}) }, 4, 4, shrine(kinds), "site")?.objects.map(
      ({ kind }) => kind
    )

  it("holds the floor's patron statue on a floor with a patron", () => {
    expect(kindOf("floor patron", "anubis")).toEqual(["statue"])
  })

  it("holds the place's next kind on a floor without, or nothing where the place is optional", () => {
    expect(kindOf("floor patron | pillar | pillar")).toEqual(["pillar"])
    expect(kindOf("floor? patron")).toEqual([])
  })
})

describe("placePrefabs", () => {
  it("takes a lever's room by its mechanism place, never a room whose content is stood on", () => {
    const mill = prefab(`room mill
layout
# # # # #
# m . . #
d . . s d
# # d # #
m mechanism
s stop`)
    const at = (fork: Partial<RoomCell>) =>
      prefabRooms(
        placed(
          placePrefabs(
            prepFor({ ...placing("mill", 0, 9), prefabs: { ...PREFABS, mill } }),
            floorFrom(TWO_FORKS, { "4,4": fork, "4,12": fork })
          )
        )
      )
    const levers = at({ mechanism: LEVER })
    expect(levers.length).toBeGreaterThan(0)
    for (const { room } of levers) expect(room.nodeArt).toEqual([room.rect.top, room.rect.left])
    const stoodOn: Record<string, Partial<RoomCell>> = {
      plate: { plate: { id: "plate" } },
      "pipe hole": { pipeHole: { pipe: "p", region: "r" } },
      "sequence tile": { sequenceTile: { id: "q", step: 0, glyph: 0, entrance: "e" } },
    }
    for (const [what, fork] of Object.entries(stoodOn)) expect(at(fork), what).toEqual([])
  })

  it("takes a chest room only with a chest place, and puts the chest's art there", () => {
    const grid = floorFrom(CHEST_FLOOR)
    const halls = prefabRooms(placed(placePrefabs(prepFor(placing("hall", 0, 9)), grid)))
    expect(halls.map(({ r, c }) => `${r},${c}`)).toEqual(["4,4"])
    const vaults = prefabRooms(placed(placePrefabs(prepFor(placing("vault", 1, 9)), grid)))
    expect(vaults.length).toBeGreaterThan(0)
    for (const { r, c, room } of vaults) {
      expect((grid.cells[r][c] as RoomCell).tags).toContain("treasure")
      expect(room.nodeArt).toEqual([room.rect.top, room.rect.left])
    }
  })

  it("central 1 takes the fork, central 0 the far dead end", () => {
    const grid = floorFrom(LONG_ARM)
    const at = (central: number) =>
      prefabRooms(placed(placePrefabs(prepFor(placing("den", 1, 1, central)), grid))).map(({ r, c }) => `${r},${c}`)
    expect(at(1)).toEqual(["4,6"])
    expect(at(0)).toEqual(["4,18"])
  })

  it("central 0 takes the empty dead end of a long branch", () => {
    const grid = floorFrom(LONG_ARM.map((row, r) => (r === 4 ? "E.....F............  " : row)))
    const rooms = prefabRooms(placed(placePrefabs(prepFor(placing("hall", 1, 1, 0)), grid)))
    expect(rooms.map(({ r, c }) => `${r},${c}`)).toEqual(["4,18"])
    expect(grid.cells[4][18].type).toBe("corridor")
    expect(rooms[0].room.doors).toEqual({ w: [4, 17] })
  })

  it("leaves a dead end holding loot to a prefab with a chest place", () => {
    const rooms = prefabRooms(placed(placePrefabs(prepFor(placing("hall", 1, 1, 0)), floorFrom(LONG_ARM))))
    expect(rooms.map(({ r, c }) => `${r},${c}`)).toEqual(["4,6"])
  })

  it("places up to max", () => {
    const grid = floorFrom(TWO_FORKS)
    expect(prefabRooms(placed(placePrefabs(prepFor(placing("hall", 0, 1)), grid)))).toHaveLength(1)
    expect(prefabRooms(placed(placePrefabs(prepFor(placing("hall", 0, 9)), grid)))).toHaveLength(2)
  })

  it("retries with prefabsNotPlaced when fewer than min fit", () => {
    expect(placePrefabs(prepFor(placing("hall", 3, 3)), floorFrom(TWO_FORKS))).toEqual({
      retry: [{ type: "prefabsNotPlaced", room: "hall", wanted: 3, placed: 2 }],
    })
  })

  it("leaves the entrance, a puzzle stop and a story room no story pinned alone", () => {
    const grid = floorFrom(
      TWO_FORKS.map((row, r) => (r === 4 ? "E...F...P...F...T" : row)),
      { "4,4": { authoredActivity: "storage" } }
    )
    const rooms = prefabRooms(placed(placePrefabs(prepFor(placing("hall", 0, 9)), grid)))
    expect(rooms.map(({ r, c }) => `${r},${c}`)).toEqual(["4,12"])
  })

  it("a pinned prefab lands on its node", () => {
    const grid = floorFrom(
      TWO_FORKS.map((row, r) => (r === 4 ? "E...F...P...F...T" : row)),
      { "4,8": { pinnedPrefab: "hall", authoredActivity: "storage" } }
    )
    const rooms = prefabRooms(placed(placePrefabs(prepFor({}), grid)))
    expect(rooms.map(({ r, c, room }) => `${room.name}@${r},${c}`)).toEqual(["hall@4,8"])
    const nowhere = floorFrom(TWO_FORKS, { "4,4": { pinnedPrefab: "gallery" } })
    expect(placePrefabs(prepFor({}), nowhere)).toEqual({
      retry: [{ type: "prefabsNotPlaced", room: "gallery", wanted: 1, placed: 0 }],
    })
  })

  it("takes the place of the room's dressing, keeping its type, dirs and contents", () => {
    const grid = floorFrom(CROSS, { "4,4": { decoration: "pillar", wallDecoration: "niche", activity: "storage" } })
    const fork = placed(placePrefabs(prepFor(placing("hall", 1, 1)), grid)).cells[4][4] as RoomCell
    expect(fork.prefabRoom?.name).toBe("hall")
    expect(fork).toMatchObject({ type: "room", roomType: "fork", dirs: new Set(["n", "s", "e", "w"]) })
    expect(fork.decoration).toBeUndefined()
    expect(fork.wallDecoration).toBeUndefined()
    expect(fork.activity).toBeUndefined()
  })

  it("the same site and floor place and fill identically twice; two storerooms on one floor fill differently", () => {
    const grid = floorFrom(["                       ", "E.....C.......C.......T", "                       "])
    const prep = prepFor(placing("store", 2, 2))
    const first = placed(placePrefabs(prep, grid))
    expect(placed(placePrefabs(prep, grid))).toEqual(first)
    const fills = prefabRooms(first).map(({ room }) =>
      room.objects.map(({ kind, top, left }) => `${kind}@${top - room.rect.top},${left - room.rect.left}`).join(" ")
    )
    expect(fills).toHaveLength(2)
    expect(fills[0]).not.toEqual(fills[1])
  })
})

describe("webDoorInPrefab", () => {
  it("faults a web door laid inside a designed room, never one on its ring", () => {
    const before = placed(placePrefabs(prepFor(placing("wideHall", 1, 1)), floorFrom(WIDE_CROSS)))
    const doorAt = (r: number, c: number): FloorGrid => ({
      ...before,
      cells: before.cells.map((row, rr) =>
        row.map((cell, cc) => (rr === r && cc === c ? { ...cell, type: "room", roomType: "encounter" } : cell))
      ) as GridCell[][],
    })
    expect(webDoorInPrefab(before, doorAt(5, 6))).toEqual({
      type: "webDoorUnseated",
      where: "5,6",
      why: "it stands inside room wideHall",
    })
    expect(webDoorInPrefab(before, doorAt(5, 8))).toBeUndefined()
  })
})

describe("the carve", () => {
  /** The tail of an attempt with no designed rooms laid. */
  const withoutPrefabs: Finish = (prep, state) => {
    const decided = requireReads("render", TAIL_READS, state)
    const grid = render(prep, decided)
    return validate(prep, decided, grid) ?? standPieces(prep, decided, grid) ?? finish(prep, grid)
  }

  it("a floor with no prefabs carves byte-identically", () => {
    const prep = prepOf(chamberFloor(), 7)
    const plain = carveFloor(prep, { ...LATTICE_ENGINE, finish: withoutPrefabs })
    const laid = carveFloor(prep, LATTICE_ENGINE)
    if (!plain.success || !laid.success) throw new Error("the fixture floor does not carve")
    expect(carvedFloorDigest(laid.grid)).toBe(carvedFloorDigest(plain.grid))
  })

  it("lays a prefab over a carved room without moving a wall", () => {
    const named = { prefabs: { alcove: ALCOVE }, prefabPlacements: [{ room: "alcove", min: 0, max: 9, central: 0.5 }] }
    const plain = assembleFloor("site", chamberFloor({ chambers: 3 }), 7)
    const laid = assembleFloor("site", chamberFloor({ chambers: 3, ...named }), 7)
    if (!plain.success || !laid.success) throw new Error("the fixture floor does not carve")
    const rooms = prefabRooms(laid.grid)
    expect(rooms.length).toBeGreaterThan(0)
    for (const { r, c } of rooms) {
      const before = plain.grid.cells[r][c]
      expect(laid.grid.cells[r][c]).toMatchObject({ type: before.type, dirs: (before as RoomCell).dirs })
    }
    const strip = (grid: FloorGrid): FloorGrid => ({
      ...grid,
      cells: grid.cells.map(row =>
        row.map(cell => {
          if (cell.type !== "room") return cell
          const {
            prefabRoom: _p,
            decoration: _d,
            decorationFallback: _f,
            wallDecoration: _w,
            activity: _a,
            ...rest
          } = cell
          return rest
        })
      ),
    })
    expect(carvedFloorDigest(strip(laid.grid))).toBe(carvedFloorDigest(strip(plain.grid)))
  })
})

describe("choosePrefabs", () => {
  it("choosePrefabs skips a node whose exit side has no door place", () => {
    const choices = choosePrefabs(prepFor({ ...placing("gallery", 0, 9) }), floorFrom(CROSS))
    expect(choices).toEqual([])
    const halls = choosePrefabs(prepFor(placing("hall", 0, 9)), floorFrom(CROSS))
    expect(halls).toEqual([expect.objectContaining({ cell: [4, 4], name: "hall" })])
  })

  it("a min the sketch cannot meet refuses naming the room", () => {
    expect(choosePrefabs(prepFor(placing("gallery", 1, 2)), floorFrom(CROSS))).toEqual({
      retry: [{ type: "prefabsNotPlaced", room: "gallery", wanted: 1, placed: 0 }],
    })
  })

  it("chooses a node a room cannot fit over, where placePrefabs passes it by", () => {
    const crowded = CROSS.map((row, r) => (r === 3 ? row.slice(0, 3) + "C" + row.slice(4) : row))
    const grid = floorFrom(crowded)
    expect(choosePrefabs(prepFor(placing("hall", 0, 1)), grid)).toEqual([expect.objectContaining({ name: "hall" })])
  })

  it("stampPrefab draws the room at the rect it is given", () => {
    const grid = floorFrom(CROSS)
    const prep = prepFor({})
    const choice = { cell: [4, 4] as [number, number], name: "hall", layout: 0, mirrored: false, pick: {} }
    const rect = { top: 3, left: 3, rows: 3, cols: 3 }
    const stamped = stampPrefab(grid, choice, rect, prep)
    expect(prefabRooms(stamped)).toEqual([
      expect.objectContaining({
        r: 4,
        c: 4,
        room: expect.objectContaining({ name: "hall", rect, doors: { n: [2, 4], s: [6, 4], w: [4, 2], e: [4, 6] } }),
      }),
    ])
    expect(prefabRooms(grid)).toEqual([])
  })
})
