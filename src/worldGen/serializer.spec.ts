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
})
