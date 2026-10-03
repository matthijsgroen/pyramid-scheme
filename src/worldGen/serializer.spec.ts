import { describe, expect, it } from "vitest"
import { generateFile } from "./serializer"
import type { SiteConfig } from "./types"

// Regression test for a real bug: serializeSideSection hand-enumerates fields and silently
// dropped `rewards` (a shop's stock array) and nested `sideSections` — round-tripping a
// config through generateFile lost both, even though every other stage of the pipeline
// (constraint resolution, buildSideSections, the economy guard) operates on the in-memory
// config and never caught it.
describe("generateFile — serializeSideSection field coverage", () => {
  const config: SiteConfig = [
    {
      pathPuzzles: 1,
      difficulty: "junior",
      end: "treasure",
      exitOrStaircase: "exit",
      sealed: true,
      theme: "night",
      sideSections: [
        {
          pathPuzzles: 1,
          difficulty: "junior",
          end: "treasure",
          theme: "day",
          endReward: { type: "mosaicPiece" },
          rewards: [{ type: "mosaicPiece" }, { type: "consumable", consumable: "oil" }],
          sealed: true,
          encounter: "tableau",
          sideSections: [{ pathPuzzles: 0, difficulty: "junior", end: "treasure", endReward: { type: "mosaicPiece" } }],
        },
      ],
    },
  ]

  const output = generateFile({ test_journey: [config] })

  it("keeps a rewards (shop stock) array on a serialized side section", () => {
    expect(output).toContain("rewards: [")
    expect(output).toContain('consumable: "oil"')
  })

  it("keeps a nested sideSections array", () => {
    expect(output).toMatch(/sideSections: \[\{ pathPuzzles: 0/)
  })

  it("keeps sealed on a serialized side section", () => {
    expect(output).toContain("sealed: true")
  })

  it("keeps sealed on a serialized floor (main path)", () => {
    expect(output.match(/sealed: true/g)?.length).toBe(2) // one on the floor, one on its side section
  })

  it("keeps encounter on a serialized side section", () => {
    expect(output).toContain('encounter: "tableau"')
  })

  // The same hand-enumeration hazard, and a skin is the field most likely to fall down it: a dropped skin
  // does not fail — every family just quietly draws its default, everywhere, forever.
  it("keeps the skin on both a serialized floor and a serialized side section", () => {
    expect(output).toContain('theme: "night"')
    expect(output).toContain('theme: "day"')
  })
})

// A switch is authored on the floor and read back out of the baked file; a field the serializer does
// not emit is a feature the world was built without, with nothing failing to say so.
describe("generateFile — a switch fork survives the bake", () => {
  const output = generateFile({
    test_journey: [
      [
        {
          pathPuzzles: 1,
          difficulty: "junior",
          end: "treasure",
          exitOrStaircase: "exit",
          sideSections: [],
          forks: [{ exits: 2, count: 1 }],
          switches: { encounter: "lightbeamSwitch", min: 1, max: 1 },
        },
      ],
    ],
  })

  it("emits the junctions the carve owes and the encounter that fills them", () => {
    expect(output).toContain(`forks: [{ exits: 2, count: 1 }]`)
    expect(output).toContain(`switches: { encounter: "lightbeamSwitch", min: 1, max: 1 }`)
  })

  // An encounter is a mod's own free-form string, and the bake writes TypeScript source: one
  // unescaped quote in one of them and the generated file does not parse.
  it("escapes an encounter carrying the characters that would break the file", () => {
    const quoted = generateFile({
      test_journey: [
        [
          {
            pathPuzzles: 1,
            difficulty: "junior",
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections: [],
            switches: { encounter: String.raw`a"b\\c`, min: 1, max: 1 },
          },
        ],
      ],
    })

    expect(quoted).toContain(String.raw`encounter: "a\"b\\\\c"`)
  })

  // A side path's gate carries an authored key id of the same free-form kind, through the same
  // quoting.
  it("escapes an authored gate key id too", () => {
    const quoted = generateFile({
      test_journey: [
        [
          {
            pathPuzzles: 1,
            difficulty: "junior",
            end: "treasure",
            exitOrStaircase: "exit",
            sideSections: [
              {
                pathPuzzles: 0,
                difficulty: "junior",
                end: "treasure",
                gate: { type: "floor-key", keyId: String.raw`a"b` },
              },
            ],
          },
        ],
      ],
    })

    expect(quoted).toContain(String.raw`keyId: "a\"b"`)
  })
})

describe("generateFile — an authored layout survives the bake", () => {
  it("emits an authored layout so a region survives the round trip", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      regionLayout: {
        regions: [
          { name: "mouth", appetite: "nothing" as const },
          { name: "vault", appetite: "reward" as const },
        ],
        connections: [["mouth", "vault"] as const],
        in: "mouth",
        out: "vault",
      },
    }

    const emitted = generateFile({ testJourney: [[floor]] })

    expect(emitted).toContain(
      'regionLayout: { regions: [{ name: "mouth", appetite: "nothing" }, { name: "vault", appetite: "reward" }], connections: [["mouth", "vault"]], in: "mouth", out: "vault" }'
    )
  })

  it("emits a container's placement so where it stands survives the round trip", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      regionLayout: {
        regions: [{ name: "vault", appetite: "reward" as const }],
        connections: [],
        in: "vault",
        out: "vault",
        placement: { enters: 0.25 },
      },
    }

    expect(generateFile({ testJourney: [[floor]] })).toContain(
      'regionLayout: { regions: [{ name: "vault", appetite: "reward" }], connections: [], in: "vault", out: "vault", placement: { enters: 0.25 } }'
    )
  })
})

// `serializeObject` (the shared emitter `forks`/`oneWays`/`handles` reuse) only reaches a flat
// object: an Obstacle's nested `at` and a Control's nested `opens` both stringify as
// "[object Object]" through it, which is why obstacles/controls are written out longhand instead
// (serializeObstacle/serializeControl in serializer.ts). Asserted as the exact emitted text, not
// merely "no [object Object]", so a future field silently falling back to that shared emitter
// would show up here as a wrong string rather than a passing test.
describe("generateFile — a gate on a connection survives the bake", () => {
  it("emits an obstacle's nested `at` in full", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      obstacles: [
        {
          id: "vaultDoor",
          kind: "gate" as const,
          at: { on: "connection" as const, between: ["hall", "vault"] as const },
        },
      ],
    }

    const emitted = generateFile({ testJourney: [[floor]] })

    expect(emitted).toContain(
      'obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] } }]'
    )
    expect(emitted).not.toContain("[object Object]")
  })

  it("emits a control's nested `opens` record in full, and its optional `encounter`", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      controls: [
        {
          id: "s1",
          in: "mouth",
          states: ["left", "right"],
          initial: "right",
          returnsToInitial: true,
          opens: { right: ["vaultDoor"] },
          encounter: "lever",
        },
      ],
    }

    const emitted = generateFile({ testJourney: [[floor]] })

    expect(emitted).toContain(
      'controls: [{ id: "s1", in: "mouth", states: ["left", "right"], initial: "right", returnsToInitial: true, opens: { "right": ["vaultDoor"] }, encounter: "lever" }]'
    )
    expect(emitted).not.toContain("[object Object]")
  })

  it("emits a gate's owners and a fork-switch control, so the bake keeps who owns each seam", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      obstacles: [
        {
          id: "forkLeft",
          kind: "gate" as const,
          at: { on: "connection" as const, between: ["entrance", "leftLower"] as const },
          owners: ["Y"],
        },
      ],
      controls: [{ id: "Y", in: "entrance", control: "fork-switch" as const, encounter: "lightbeamSwitch" }],
    }

    const emitted = generateFile({ testJourney: [[floor]] })

    expect(emitted).toContain(
      'obstacles: [{ id: "forkLeft", kind: "gate", at: { on: "connection", between: ["entrance", "leftLower"] }, owners: ["Y"] }]'
    )
    expect(emitted).toContain(
      'controls: [{ id: "Y", in: "entrance", control: "fork-switch", encounter: "lightbeamSwitch" }]'
    )
  })
})

describe("generateFile — a region barrier survives the bake", () => {
  it("emits a barrier's region in place of a connection", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      obstacles: [{ id: "floodedHall", kind: "gate" as const, at: { on: "region" as const, region: "hall" } }],
    }

    const emitted = generateFile({ testJourney: [[floor]] })

    expect(emitted).toContain('obstacles: [{ id: "floodedHall", kind: "gate", at: { on: "region", region: "hall" } }]')
  })
})

describe("generateFile — a sequence survives the bake", () => {
  it("emits its steps in order, the gate it resets at and what finishing opens", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      controls: [
        {
          id: "plates",
          control: "sequence" as const,
          steps: [{ in: "hall" }, { in: "annex" }, { in: "hall" }],
          resetAt: "vaultDoor",
          opens: { done: ["vaultDoor"] },
        },
      ],
    }

    const emitted = generateFile({ testJourney: [[floor]] })

    expect(emitted).toContain(
      'controls: [{ id: "plates", control: "sequence", steps: [{ in: "hall" }, { in: "annex" }, { in: "hall" }], resetAt: "vaultDoor", opens: { done: ["vaultDoor"] } }]'
    )
  })

  it("emits the realisation a lock bound it to, so the bake does not drop it", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      controls: [
        {
          id: "plates",
          control: "sequence" as const,
          steps: [{ in: "hall" }, { in: "annex" }],
          resetAt: "vaultDoor",
          opens: { done: ["vaultDoor"] },
          encounter: "torch",
        },
      ],
    }

    expect(generateFile({ testJourney: [[floor]] })).toContain('opens: { done: ["vaultDoor"] }, encounter: "torch" }]')
  })
})

describe("generateFile — every term of a gate survives the bake", () => {
  const gate = {
    id: "vaultDoor",
    kind: "gate" as const,
    at: { on: "connection" as const, between: ["hall", "vault"] as const },
    mode: "any" as const,
    owners: ["Y"],
    floorKeys: ["pocket"],
  }
  const floorWith = (obstacles: unknown[]) => ({
    pathPuzzles: 0,
    difficulty: "starter" as const,
    end: "treasure" as const,
    exitOrStaircase: "exit" as const,
    sideSections: [],
    obstacles,
  })

  it("emits mode, owners and floorKeys of an edge gate, and each key of the gate is named in the output", () => {
    const emitted = generateFile({ testJourney: [[floorWith([gate]) as never]] })
    expect(emitted).toContain(
      'obstacles: [{ id: "vaultDoor", kind: "gate", at: { on: "connection", between: ["hall", "vault"] }, mode: "any", owners: ["Y"], floorKeys: ["pocket"] }]'
    )
    for (const key of Object.keys(gate)) expect(emitted, `dropped ${key}`).toContain(`${key}:`)
  })

  it("emits the same terms on a region gate", () => {
    const region = { ...gate, at: { on: "region" as const, region: "hall" } }
    const emitted = generateFile({ testJourney: [[floorWith([region]) as never]] })
    expect(emitted).toContain(
      'at: { on: "region", region: "hall" }, mode: "any", owners: ["Y"], floorKeys: ["pocket"] }'
    )
  })

  it("emits a one-way as it always did, and a gate without terms with none", () => {
    const oneWay = {
      id: "drop",
      kind: "oneWay" as const,
      at: { on: "connection" as const, between: ["a", "b"] as const },
    }
    const bare = { id: "d", kind: "gate" as const, at: { on: "region" as const, region: "hall" } }
    const emitted = generateFile({ testJourney: [[floorWith([oneWay, bare]) as never]] })
    expect(emitted).toContain(
      'obstacles: [{ id: "drop", kind: "oneWay", at: { on: "connection", between: ["a", "b"] } }, { id: "d", kind: "gate", at: { on: "region", region: "hall" } }]'
    )
  })
})
