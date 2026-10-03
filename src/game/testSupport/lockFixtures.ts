import type { Lock } from "@/game/lockAuthoring"
import type { RealisationBinding } from "@/game/lockCompile"

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

/** The contract's sluice: one toggle that floods the hall while the vault is dry and the vault while the hall is dry. */
export const sluiceLock = (): Lock => ({
  name: "sluice",
  regions: {
    pumpRoom: { takes: "free" },
    gallery: { takes: "free" },
    hall: { takes: "free" },
    annex: { takes: "free" },
    vault: { takes: "free" },
  },
  connections: [
    ["pumpRoom", "gallery"],
    ["pumpRoom", "hall"],
    ["hall", "annex"],
    ["pumpRoom", "vault"],
  ],
  gates: {
    floodedHall: { region: "hall", owners: ["sluice"] },
    floodedVault: { region: "vault", owners: ["sluice"] },
  },
  mechanics: {
    sluice: {
      control: "toggle",
      in: "pumpRoom",
      starts: "dry",
      opens: { dry: ["floodedVault"], wet: ["floodedHall"] },
    },
  },
  in: "pumpRoom",
  out: "gallery",
})

export const BINDING: RealisationBinding = {
  toggle: "handle",
  activator: "torch",
  sequence: "plates",
  "fork-switch": "lightbeamSwitch",
  "one-way": "zipline",
}
