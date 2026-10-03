import type { Lock } from "../../../game/lockAuthoring"

/** Three tiles walked cellar, east, west. The cellar is entered by a drop from the hall and also lies behind the
 * east tile, so the one way to step on it first is the drop; the door onward carries the reset. */
export const processionalLock = (): Lock => ({
  name: "processional",
  regions: {
    in: { takes: "free" },
    hall: { takes: "free" },
    west: { takes: "free" },
    east: { takes: "free" },
    cellar: { takes: "free" },
    out: { takes: "free" },
  },
  connections: [
    ["in", "hall"],
    ["hall", "west"],
    ["hall", "east"],
    ["east", "cellar"],
    { between: ["hall", "out"], barriers: ["vaultDoor"] },
  ],
  gates: {
    vaultDoor: { from: "hall", to: "out", owners: ["plates"] },
  },
  oneWays: {
    dropToCellar: { from: "hall", to: "cellar" },
  },
  mechanics: {
    plates: {
      control: "sequence",
      steps: [{ in: "cellar" }, { in: "east" }, { in: "west" }],
      resetAt: "vaultDoor",
      opens: { done: ["vaultDoor"] },
    },
  },
  in: "in",
  out: "out",
})
