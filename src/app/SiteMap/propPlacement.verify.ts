import { describe, expect, it } from "vitest"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { assembleFloor } from "@/game/siteAssembler"
import { revealAll } from "@/game/gridNavigation"
import { portalKindOf } from "@/game/roomFootprint"
import { prefabRoomAt, prefabRoomCells } from "@/game/roomShape"
import { decorationFootprint, type FloorGrid } from "@/game/siteTypes"
import { buildRoomClaims, isOnGrid, propFootprintCells, propStandingCells } from "./roomClaims"
import { wallItemsFor } from "./SiteMapView"

// The pools authored per rank (spec/*.ts) only mean something if props actually land on rooms. This
// is the one check that the whole chain — tier constraint → floor config → assembler → cell — holds.
describe("authored decoration pools reach real rooms", () => {
  it("places props on the generated world's floors", () => {
    let floorsWithPool = 0
    let placed = 0
    const kinds = new Set<string>()

    // A SiteConfig is one site: an array of levels, each an array of floors.
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 8)) {
      levels.flat().forEach((floor, i) => {
        if (floor.decorations?.length) floorsWithPool++
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const row of result.grid.cells) {
          for (const cell of row) {
            if (cell.type === "room" && cell.decoration) {
              placed++
              kinds.add(cell.decoration)
            }
          }
        }
      })
    }

    expect(floorsWithPool).toBeGreaterThan(0)
    expect(placed).toBeGreaterThan(0)
    // More than one kind, and no single kind taking nearly everything: which prop a room draws is
    // picked by where the room is. A per-pool counter passed the first two assertions and still put
    // a crate in every fork in the world, because each section carries its own pool literal.
    expect(kinds.size).toBeGreaterThan(2)
  })

  it("draws the whole pool, not just its first entry", () => {
    const counts = new Map<string, number>()
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 8)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const row of result.grid.cells) {
          for (const cell of row) {
            if (cell.type === "room" && cell.decoration) {
              counts.set(cell.decoration, (counts.get(cell.decoration) ?? 0) + 1)
            }
          }
        }
      })
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    const commonest = Math.max(...counts.values())
    expect(commonest / total).toBeLessThan(0.6)
  })
})

describe("props stay out of the way", () => {
  // A prop stands in the room, never in the way through it. A claimed CORRIDOR is a real passage —
  // the approach to a gate, absorbed into the junction's footprint — and anchoring on the first claim
  // of any kind put 6 props in 142 down the middle of a walkway, for the player to walk through. A designed room's
  // floor is walked by the room's own walk, which goes round every cell the room blocks.
  it("never stands a prop on a cell the player walks", () => {
    const walkedOn: string[] = []
    let props = 0

    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 12)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        const rooms = [...new Set(prefabRoomCells(result.grid).values())].map(owner => {
          const [r, c] = owner.split(",").map(Number)
          return prefabRoomAt(result.grid, r, c)
        })
        // A room's ground object lies flat and is walked over, so the cell it lies on is the room's to walk.
        const onGround = rooms
          .flatMap(room => room?.objects ?? [])
          .filter(object => object.layer === "ground")
          .map(({ top, left }) => `${top},${left}`)
        const roomBlocked = new Set([...rooms.flatMap(room => room?.blocked ?? []), ...onGround])
        // Every cell a prop covers, not only its anchor: a wide prop stands on all of them.
        for (const key of buildRoomClaims(result.grid).decorationCells) {
          props++
          if (roomBlocked.has(key)) continue
          const [r, c] = key.split(",").map(Number)
          // A claim may reach one cell outside the grid; anything off-grid is void by definition.
          const cell = result.grid.cells[r]?.[c] ?? { type: "empty" as const }
          if (cell.type !== "empty") walkedOn.push(`${siteId}:${i} ${key} (${cell.type})`)
        }
      })
    }

    expect(props).toBeGreaterThan(0)
    expect(walkedOn).toEqual([])
  })
})

// Wall items are placed like props and drawn nowhere near them, so they need their own check: the
// chain tier constraint → floor config → assembler → cell, and then the render-time anchor that puts
// one in a face band of the room's own footprint.
describe("authored wall-item pools reach real walls", () => {
  const wallItems = (limit: number) => {
    const items: Array<{ item: ReturnType<typeof wallItemsFor>[number]; grid: FloorGrid; owner: string }> = []
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, limit)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        // Fully explored: a wall item hangs in a face band, and an unexplored cell has no band —
        // fog reads as unlit passage. What is being checked here is the placement, not the fog.
        const grid = revealAll(result.grid)
        const claims = buildRoomClaims(grid)
        for (const item of wallItemsFor(grid, claims)) {
          items.push({ item, grid, owner: claims.claimedBy.get(`${item.row},${item.col}`) ?? "" })
        }
      })
    }
    return items
  }

  it("hangs items on the generated world's floors, across the pool", () => {
    const counts = new Map<string, number>()
    for (const { item } of wallItems(12)) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)

    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(0)
    // Which item a room hangs is picked by WHERE the room is, the same as its prop — so a rank's
    // whole pool shows up rather than every room in the world carrying its first entry.
    expect(counts.size).toBeGreaterThan(1)
    expect(Math.max(...counts.values()) / total).toBeLessThan(0.85)
  })

  it("hangs each item inside its own room's footprint", () => {
    const strays: string[] = []
    for (const { item, grid, owner } of wallItems(8)) {
      const own = grid.cells[item.row]?.[item.col]
      const isOwnCell = own?.type === "room" && own.wallDecoration === item.kind
      if (!isOwnCell && !owner) strays.push(`${grid.siteId} ${item.row},${item.col} ${item.kind}`)
    }
    expect(strays).toEqual([])
  })
})

// A prop sprite is a cell plus a face band tall, so it leans a band into the cell to its north. That
// headroom is what gives a statue height, and it belongs on WALL: over floor it hangs above ground the
// player walks, and the explorer dot — drawn later — passes in front of the statue's head instead of
// behind it. So the prop cell is chosen for having void above it (buildRoomClaims).
describe("a prop stands against a wall", () => {
  // Measured PER ROOM KIND, because the two kinds of room have different amounts of wall to offer and
  // one bound over both hides that. A dead end is a pocket with stone on three sides; a FORK is a
  // junction with passages leaving in three directions, so it often has no claimed cell with void above
  // it at all. Lumped together they read 6.2%, which says nothing about either. An entrance a side
  // section hangs off forks too, so it counts as a fork here, not as a portal. A stairhead is tallied on its own
  // whatever its ways out: the player crosses its room to the stair.
  // `chose` counts the leaning props whose room still had a stone-backed fit on the floor the claimer chose from:
  // its claimed empty cells inside the grid (all of them when none is), less what an earlier prop of the room took.
  type Tally = { props: number; open: number; chose: number }
  const openBehindByOwner = (): Map<string, Tally> => {
    const tally = new Map<string, Tally>()
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs).slice(0, 12)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        const grid = revealAll(result.grid)
        const claims = buildRoomClaims(grid)
        const takenByOwner = new Map<string, Set<string>>()
        for (const [key, prop] of claims.decorationAt) {
          const ownerKey = claims.claimedBy.get(key) ?? key
          const [or, oc] = ownerKey.split(",").map(Number)
          const owner = grid.cells[or]?.[oc]
          // A way in or out the player can leave more than one way is a junction: it is tallied with the forks.
          const kind =
            owner?.type !== "room"
              ? "unknown"
              : owner.roomType !== "portal"
                ? owner.roomType
                : portalKindOf(grid, or, oc, owner) === "stairhead"
                  ? "stairhead"
                  : owner.dirs.size > 1
                    ? "fork"
                    : "portal"
          const [r, c] = key.split(",").map(Number)
          const north = grid.cells[r - 1]?.[c]
          const leans = north !== undefined && north.type !== "empty"
          const taken = takenByOwner.get(ownerKey) ?? new Set<string>()
          const free = (claims.propCandidates.get(ownerKey) ?? []).filter(k => !taken.has(k))
          const inside = free.filter(k => isOnGrid(grid, k))
          const hadStone = propStandingCells(grid, prop, inside.length ? inside : free, "stone") !== undefined
          for (const k of propFootprintCells(key, decorationFootprint(prop))) taken.add(k)
          takenByOwner.set(ownerKey, taken)
          const row = tally.get(kind) ?? { props: 0, open: 0, chose: 0 }
          tally.set(kind, {
            props: row.props + 1,
            open: row.open + (leans ? 1 : 0),
            chose: row.chose + (leans && hadStone ? 1 : 0),
          })
        }
      })
    }
    return tally
  }

  it("stands a pocket's prop against stone, all but never otherwise", () => {
    const tally = openBehindByOwner()
    const ends = tally.get("encounter")!
    expect(ends.props).toBeGreaterThan(0)
    // The claimer takes a stone-backed fit whenever the room has one, for the leader and the god's second statue
    // alike, and still places the prop when it has none: a prop is better than a bare chamber. So a pocket's prop
    // leans over floor only when nothing in its room was backed by stone, and how often that happens is the
    // world's shape, not the rule.
    expect(ends.chose).toBe(0)
  })

  it("never leans a stairhead's prop over floor, where the player crosses the room to the stair", () => {
    const stairheads = openBehindByOwner().get("stairhead")!
    expect(stairheads.props).toBeGreaterThan(0)
    expect(stairheads.open).toBe(0)
  })

  // A floor's way in or out is a dead end nobody walks past, so a prop with floor behind it is allowed there and
  // carries no bound: 4 of 46 measured, most of them portals on the floor's edge with no stone left to lean on.
  it("still dresses a floor's ways in and out", () => {
    expect(openBehindByOwner().get("portal")!.props).toBeGreaterThan(0)
  })

  it("still leans most of a junction's props on stone, though it has less to lean on", () => {
    const f = openBehindByOwner().get("fork")!
    expect(f.props).toBeGreaterThan(0)
    // 41.7% measured, and the series matters more than the value: 14.9%, then 24.4%, then 37%, now
    // 41.7%. Every rise had a good reason and none was a placement change — furniture kept inside the
    // grid, corridors compacted, carve seeds searched — but the bound has been raised each time, so the
    // preference is eroding by increments nobody chose. A junction has the least stone of any room to
    // begin with and a compact floor leaves it less still, which is why it erodes here first.
    // Bounded so a placement change that gave up on the preference altogether shows as a failure
    // rather than as art; the series is here so the next rise is a decision rather than a reflex.
    // Abandoning the preference outright reads 48.2% of 199, so this bound has little teeth left: it
    // sits 3.3 points above the measurement and 3.2 below the abandoned reading. It would still catch
    // giving the preference up, and would not catch the next two increments of erosion.
    expect(f.open / f.props).toBeLessThan(0.45)
  })
})

describe("a hole and a way down are not the same room", () => {
  // A `pit` is a shaft cut in the floor; a staircase is a way to the floor below. Drawn in one room they
  // say the same thing and only one of them is real — the player can take the stair and cannot take the
  // pit. Seven rooms in the world stood one beside the other before this.
  it("never stands a pit in a room that holds a staircase", () => {
    const offenders: string[] = []
    for (const [siteId, levels] of Object.entries(generatedWorldConfigs)) {
      levels.flat().forEach((floor, i) => {
        const result = assembleFloor(`${siteId}:${i}`, floor, 7)
        if (!result.success) return
        for (const [r, row] of result.grid.cells.entries())
          for (const [c, cell] of row.entries())
            if (cell.type === "room" && cell.stairId && cell.decoration === "pit")
              offenders.push(`${siteId} floor ${i} (${r},${c})`)
      })
    }
    expect(offenders).toEqual([])
  })
})
