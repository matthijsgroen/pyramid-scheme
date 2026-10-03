import type { Lock } from "../../../game/lockAuthoring"

/** The designer's doubleBack as the contract's lock format writes it, its fork a fork-switch and its barriers
 * named on the connections they stand on. Every region takes `free`: the carve seats none of the contract's
 * `puzzles`/`nothing`/`reward` appetites on this layout. */
export const doubleBackLock = (): Lock => ({
  name: "doubleBack",
  regions: {
    in: { takes: "free" },
    leftLower: { takes: "free" },
    rightLower: { takes: "free" },
    s1: { takes: "free" },
    s2: { takes: "free" },
    out: { takes: "free" },
  },
  connections: [
    { between: ["in", "leftLower"], barriers: ["in-leftLower"] },
    { between: ["in", "rightLower"], barriers: ["in-rightLower"] },
    { between: ["rightLower", "s1"], barriers: ["rightLower-s1"] },
    { between: ["leftLower", "s2"], barriers: ["leftLower-s2"] },
    { between: ["in", "out"], barriers: ["in-out"] },
  ],
  gates: {
    "in-leftLower": { from: "in", to: "leftLower", owners: ["Y"] },
    "in-rightLower": { from: "in", to: "rightLower", owners: ["Y"] },
    "rightLower-s1": { from: "rightLower", to: "s1", owners: ["S1"] },
    "leftLower-s2": { from: "leftLower", to: "s2", owners: ["S1"] },
    "in-out": { from: "in", to: "out", owners: ["S2"] },
  },
  oneWays: {
    dropToLeft: { from: "s1", to: "leftLower" },
    dropToIn: { from: "leftLower", to: "in" },
  },
  mechanics: {
    Y: { control: "fork-switch", in: "in" },
    S1: { control: "toggle", in: "s1", starts: "a", opens: { a: ["rightLower-s1"], b: ["leftLower-s2"] } },
    S2: { control: "toggle", in: "s2", starts: "a", opens: { a: [], b: ["in-out"] } },
  },
  in: "in",
  out: "out",
})
