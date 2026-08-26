import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { configHash } from "@/game/seeds/configHash"
import { puzzleSeeds } from "@/data/puzzleSeeds"
import { hashString } from "@/support/hashString"
import { boardIndexesForFloor } from "./boardIndexes"
import { encodeEdge } from "./useAssembledFloor"
import type { Difficulty } from "@/data/difficultyLevels"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
// Populate the family registry, exactly as the app does — a room resolves its family through it.
import "@/mods/registerModApps"

// Mirror useAssembledFloor's own resolver, so this walks the identical code path.
const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

type Floor = {
  label: string
  config: FloorConfig
  seed: number
  floorIndex: number
  journeyId: string
  levelIndex: number
}

// Every floor a player can be sent into, at the exact seed the runtime will use.
// Mirrors PyramidExpedition: one site per level number (1-based), falling back to the first
// site config when a journey has more levels than site configs, and SiteMapScreen's own
// per-floor seed offset.
const allFloors = (): Floor[] => {
  const floors: Floor[] = []
  for (const journey of journeys) {
    const siteConfigs = journey.siteConfigs
    if (!siteConfigs?.length) continue
    const siteSeed = persistentInteriorSeed(journey.id)
    for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
      const levelIndex = levelNr - 1
      const site = siteConfigs[levelIndex] ?? siteConfigs[0]
      site.forEach((config, floorIndex) => {
        floors.push({
          label: `${journey.id} level ${levelNr} floor ${floorIndex}`,
          config,
          seed: floorAssemblySeed(siteSeed, levelNr, floorIndex),
          floorIndex,
          journeyId: journey.id,
          levelIndex,
        })
      })
    }
  }
  return floors
}

// The guard that was missing when 17 authored floors (expert_1, expert_4, master_1/2/4, and ten
// wizard floors) shipped unenterable: their layout could not be carved at the one seed the
// runtime ever hands them, so the interior rendered "Site layout unavailable." for every player,
// permanently. Nothing else covers this — worldGen/reachability.ts assembles with its own seeds,
// and no other spec walks the whole baked world. Run standalone via `yarn verify-floors`.
describe("every authored floor assembles at its runtime seed", () => {
  it("has floors to check at all (a silent empty sweep would prove nothing)", () => {
    expect(allFloors().length).toBeGreaterThan(100)
  })

  // Assembling the whole world is a few hundred maze carves — well past the default 5s budget.
  it("assembles all of them", () => {
    const failures = allFloors()
      .map(floor => {
        const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
          resolveKeyRequirements,
          floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex },
        })
        return result.success ? null : `${floor.label} (seed ${floor.seed}): ${JSON.stringify(result.reasons)}`
      })
      .filter((f): f is string => f !== null)

    expect(failures, `${failures.length} floor(s) cannot be assembled:\n${failures.join("\n")}`).toEqual([])
  }, 60_000)

  // `SubSection.difficulty` is authored off-tier on purpose — a gentle pocket on a hard floor, a ward
  // section pitched above the rest — and for a long while none of that reached a board: every room
  // generated at its floor's tier. This asks the baked world to prove the seam is live, and asks it
  // of the one case that is entirely invisible if the floor wins: a starter section on a wizard floor.
  it("serves a wizard floor's starter-authored section starter boards", () => {
    const stamped = allFloors().flatMap(floor => {
      if (floor.config.difficulty !== "wizard") return []
      const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
        resolveKeyRequirements,
        floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex },
      })
      if (!result.success) return []
      return result.grid.cells.flat().filter(c => c.type === "room" && c.difficulty === "starter")
    })

    expect(stamped.length).toBeGreaterThan(0)
  }, 60_000)
})

// Encounters are authored per pyramid and re-authored constantly — a new puzzle family, a journey
// that asks for a different pool, a trap dropped onto a floor. None of that may move a wall, because
// a run's explored cells and found corridors are filed under section hashes, and a hash moves when
// the layout does. The rule: a floor forgets what a player did on it only when its corridors really
// changed — their number or their length.
//
// Nothing about an encounter reaches the layout any more. Isolating a trap's stretch from leftover
// maze edges is the one thing that ever did, and world-gen now writes that down as `sealed`
// (placeEncounters), a structural field, so the assembler lays out a floor without ever asking what
// lives in it. This sweep is what keeps it that way.
describe("no encounter can move a wall", () => {
  const shape = (g: FloorGrid) =>
    JSON.stringify(
      g.cells.map(row =>
        row.map(c => (c.type === "empty" ? "." : `${c.type[0]}${[...c.dirs].sort().join("")}${c.hidden ? "H" : ""}`))
      )
    )
  const sectionHashes = (g: FloorGrid) =>
    JSON.stringify(
      [
        ...new Set(
          g.cells
            .flat()
            .filter(c => c.type !== "empty")
            .map(c => (c as { sectionHash?: string }).sectionHash)
        ),
      ].sort()
    )

  // Rewrite every authored encounter on a floor to one family, touching nothing structural.
  const rethemed = (config: FloorConfig, family: string): FloorConfig => {
    const floor = structuredClone(config) as unknown as Record<string, unknown>
    const walk = (node: Record<string, unknown>) => {
      if (node.encounter !== undefined || (node.pathPuzzles as number) > 0) node.encounter = family
      if (node.encountersByIndex) {
        const byIndex = node.encountersByIndex as Record<string, unknown>
        for (const k of Object.keys(byIndex)) byIndex[k] = family
      }
      for (const sub of (node.sideSections as Record<string, unknown>[]) ?? []) walk(sub)
    }
    walk(floor)
    return floor as unknown as FloorConfig
  }

  // A plain puzzle, a tomb puzzle, and a TRAP — the last one is the case that used to carve
  // differently, and the reason this sweep exists.
  it.each(["sumplete", "arithmetic-reflex"])(
    "survives every room becoming %s",
    family => {
      const moved: string[] = []
      for (const floor of allFloors()) {
        const opts = {
          resolveKeyRequirements,
          floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex },
        }
        const before = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, opts)
        const after = assembleFloor(floor.journeyId, rethemed(floor.config, family), floor.seed, resolveEncounter, opts)
        if (!before.success || !after.success) continue
        if (shape(before.grid) !== shape(after.grid)) moved.push(`${floor.label}: walls moved`)
        else if (sectionHashes(before.grid) !== sectionHashes(after.grid))
          moved.push(`${floor.label}: section hash moved`)
      }
      expect(moved, `${moved.length} floor(s) changed on an encounter swap:\n${moved.slice(0, 10).join("\n")}`).toEqual(
        []
      )
    },
    120_000
  )
})

// Which world-spec settings may move a floor, and which may not. Two rules, and this sweep is what
// holds authors to them — see docs/game-design/world-spec-stability.md for the lists in prose.
//
//   1. A setting that is not about the shape of the place must move nothing.
//   2. A setting that DOES re-carve must also rehash. A floor re-shaped while its hashes held still
//      is the worst case of all: a run restores its explored cells onto a maze that is gone, and
//      rooms it never entered read as looted.
//
// Sampled every third floor. Each mutation is applied to ~70 real authored floors, which is plenty
// to catch a rule being broken, and keeps the sweep off the critical path of a test run.
describe("what a world-spec setting may and may not move", () => {
  const sampled = () => allFloors().filter((_, i) => i % 3 === 0)

  const shape = (g: FloorGrid) =>
    JSON.stringify(
      g.cells.map(row => row.map(c => (c.type === "empty" ? "." : `${c.type[0]}${[...c.dirs].sort().join("")}`)))
    )
  const sectionHashes = (g: FloorGrid) =>
    JSON.stringify(
      [
        ...new Set(
          g.cells
            .flat()
            .filter(c => c.type !== "empty")
            .map(c => (c as { sectionHash?: string }).sectionHash)
        ),
      ].sort()
    )

  type Node = Record<string, unknown>
  const eachNode = (floor: Node, fn: (n: Node, isFloor: boolean) => void) => {
    const walk = (n: Node, isFloor: boolean) => {
      fn(n, isFloor)
      for (const sub of (n.sideSections as Node[]) ?? []) walk(sub, false)
    }
    walk(floor, true)
  }
  const edited = (config: FloorConfig, fn: (n: Node, isFloor: boolean) => void): FloorConfig => {
    const floor = structuredClone(config) as unknown as Node
    eachNode(floor, fn)
    return floor as unknown as FloorConfig
  }

  const compare = (mutate: (c: FloorConfig) => FloorConfig) => {
    const wallsMoved: string[] = []
    const reshapedWithoutRehashing: string[] = []
    for (const floor of sampled()) {
      const opts = { resolveKeyRequirements, floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex } }
      // A mutation can be unauthorable on a given floor — an extra room on a tomb floor asks for a
      // tableau nobody wrote, and that family throws rather than inventing one. Not a finding; skip.
      let before, after
      try {
        before = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, opts)
        after = assembleFloor(floor.journeyId, mutate(floor.config), floor.seed, resolveEncounter, opts)
      } catch {
        continue
      }
      if (!before.success || !after.success) continue
      if (shape(before.grid) === shape(after.grid)) continue
      wallsMoved.push(floor.label)
      if (sectionHashes(before.grid) === sectionHashes(after.grid)) reshapedWithoutRehashing.push(floor.label)
    }
    return { wallsMoved, reshapedWithoutRehashing }
  }

  // Rule 1 — content, dressing and key assignment are not the shape of the place.
  const INERT: Array<[string, (c: FloorConfig) => FloorConfig]> = [
    [
      "what a chest holds",
      c =>
        edited(c, n => {
          if (n.endReward) n.endReward = { type: "money", amount: 1 }
          if (n.mainEndReward) n.mainEndReward = { type: "money", amount: 1 }
          if (Array.isArray(n.rewards))
            n.rewards = (n.rewards as unknown[]).map(r => (r ? { type: "money", amount: 1 } : r))
        }),
    ],
    [
      "which key opens a gate, and its colour",
      c =>
        edited(c, n => {
          const gate = n.gate as Node | undefined
          if (gate?.wardKeyId) gate.wardKeyId = "some_other_key"
          if (gate?.color) gate.color = "purple"
        }),
    ],
    [
      "the decoration pool",
      c =>
        edited(c, n => {
          if (n.decorations) n.decorations = ["rubble"]
        }),
    ],
    [
      "the skin and the role a room was drawn for",
      c =>
        edited(c, n => {
          n.theme = "elsewhere"
          n.role = "puzzle"
        }),
    ],
  ]

  it.each(INERT)(
    "%s moves nothing",
    (_label, mutate) => {
      const { wallsMoved } = compare(mutate)
      expect(wallsMoved, `${wallsMoved.length} floor(s) moved:\n${wallsMoved.slice(0, 5).join("\n")}`).toEqual([])
    },
    120_000
  )

  // Rule 2 — these are all allowed to re-carve, but never silently.
  const STRUCTURAL: Array<[string, (c: FloorConfig) => FloorConfig]> = [
    ["pathPuzzles", c => ({ ...structuredClone(c), pathPuzzles: c.pathPuzzles + 1 })],
    ["packing", c => ({ ...structuredClone(c), packing: (c.packing ?? 1) + 0.5 })],
    ["corridorStraightness", c => ({ ...structuredClone(c), corridorStraightness: 0.2 })],
    ["difficulty", c => ({ ...structuredClone(c), difficulty: c.difficulty === "wizard" ? "starter" : "wizard" })],
    [
      "sealed",
      c =>
        edited({ ...structuredClone(c), sealed: !c.sealed }, (n, isFloor) => {
          if (!isFloor) n.sealed = !n.sealed
        }),
    ],
    [
      "a gate",
      c =>
        edited(c, n => {
          delete n.gate
        }),
    ],
    [
      "hidden",
      c =>
        edited(c, (n, isFloor) => {
          if (!isFloor) n.hidden = !n.hidden
        }),
    ],
    [
      "whether a node holds anything at all",
      c =>
        edited(c, n => {
          delete n.endReward
          delete n.mainEndReward
          if (Array.isArray(n.rewards)) n.rewards = (n.rewards as unknown[]).map(() => undefined)
        }),
    ],
  ]

  it.each(STRUCTURAL)(
    "%s never re-carves without rehashing",
    (_label, mutate) => {
      const { reshapedWithoutRehashing } = compare(mutate)
      expect(
        reshapedWithoutRehashing,
        `${reshapedWithoutRehashing.length} floor(s) were re-carved while their section hashes held still:\n` +
          reshapedWithoutRehashing.slice(0, 5).join("\n")
      ).toEqual([])
    },
    120_000
  )
})

// Boards are DEALT, not drawn: every room in the world takes a different entry of its family's seed
// list (src/game/seeds/boardIndex.ts). The scheme it replaced indexed the list by a hash of the room's
// identity — an independent draw per room, so a journey with fourteen balance rooms over a fourteen-board
// list handed one board out three times and left five boards unused, and a player met the same puzzle in
// pyramid 1, pyramid 2 and pyramid 3. This is the sweep that says it cannot happen again: it assembles
// the world the runtime assembles and asks which board every room actually serves.
describe("no two rooms in the world serve the same board", () => {
  // What a room really builds: the family's own list entry, or its identity hash where a bucket has no
  // list yet (generatePuzzle's fallback, which draws with replacement and so may legitimately repeat).
  const boardOf = (
    familyId: string,
    difficulty: Difficulty | undefined,
    boardIndex: number | undefined,
    seed: number
  ): { bucket: string; board: string; listed: boolean } | null => {
    const seedable = getFamilyPlugin(familyId)?.meta.seedable
    if (!seedable) return null
    const bucket = configHash(seedable.resolveOptions({ difficulty }))
    const list = puzzleSeeds[bucket]
    if (!list?.length) return { bucket, board: `unlisted:${seed}`, listed: false }
    return { bucket, board: String(list[(boardIndex ?? seed) % list.length]), listed: true }
  }

  const seedableRooms = () =>
    allFloors().flatMap(floor => {
      const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
        resolveKeyRequirements,
        floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex },
        resolveBoardIndex: boardIndexesForFloor(floor.journeyId, floor.levelIndex, floor.floorIndex),
      })
      if (!result.success) return []
      return result.grid.cells.flatMap((row, r) =>
        row.flatMap((cell, c) => {
          if (cell.type !== "room" || !cell.family) return []
          const difficulty = cell.difficulty ?? floor.config.difficulty
          const seed = hashString(floor.journeyId + encodeEdge(floor.floorIndex, r, c))
          const board = boardOf(cell.family, difficulty, cell.boardIndex, seed)
          return board ? [{ ...board, dealt: cell.boardIndex !== undefined, label: ` / at ,` }] : []
        })
      )
    })

  it("deals every listed room its own board", () => {
    const rooms = seedableRooms()
    expect(rooms.length).toBeGreaterThan(1000)

    // A room the assignment never reached falls back to its own hash, which is the very thing this
    // replaced — so a gap in the walk has to fail here, not quietly draw with replacement.
    const undealt = rooms.filter(room => !room.dealt).map(room => room.label)
    expect(undealt.slice(0, 10), ` room(s) were dealt no board`).toEqual([])

    const byBoard = new Map<string, string[]>()
    for (const room of rooms.filter(r => r.listed))
      byBoard.set(`${room.bucket}#${room.board}`, [...(byBoard.get(`${room.bucket}#${room.board}`) ?? []), room.label])
    const shared = [...byBoard.entries()].filter(([, where]) => where.length > 1)

    expect(
      shared.map(([board, where]) => `${board}: ${where.join(" || ")}`),
      `${shared.length} board(s) served to more than one room`
    ).toEqual([])
  }, 120_000)

  // The invariant the dealing rests on, stated on its own so a bucket that outgrows its list fails here
  // with the bucket named, rather than as a pile of shared boards. `yarn generate-seeds` is the fix.
  it("keeps every bucket's rooms within its list", () => {
    const overSubscribed = new Map<string, number>()
    for (const room of seedableRooms().filter(r => r.listed))
      overSubscribed.set(room.bucket, (overSubscribed.get(room.bucket) ?? 0) + 1)

    const tooSmall = [...overSubscribed.entries()]
      .filter(([bucket, rooms]) => rooms > (puzzleSeeds[bucket]?.length ?? 0))
      .map(([bucket, rooms]) => `${bucket}: ${rooms} rooms over a ${puzzleSeeds[bucket]?.length ?? 0}-seed list`)

    expect(tooSmall, "run `yarn generate-seeds`").toEqual([])
  }, 120_000)
})
