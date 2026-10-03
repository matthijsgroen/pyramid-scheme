import type { Lock } from "@/game/lockAuthoring"

/** A lever in the first room works the door between the hall and the way out: a gate on the main route. */
export const leverLock = (): Lock => ({
  name: "lever",
  regions: {
    foyer: { takes: "free" },
    hall: { takes: "free" },
    landing: { takes: "free" },
  },
  connections: [["foyer", "hall"], { between: ["hall", "landing"], barriers: ["hallDoor"] }],
  gates: {
    hallDoor: { from: "hall", to: "landing", owners: ["lever"] },
  },
  mechanics: {
    lever: { control: "toggle", in: "foyer", starts: "shut", opens: { shut: [], open: ["hallDoor"] } },
  },
  in: "foyer",
  out: "landing",
})
