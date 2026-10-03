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

/** A torch in the foyer that holds the hall's door open until it is worked, and then for ever shuts it: a lock the player can strand themselves in. */
export const strandingLock = (): Lock => ({
  name: "stranding",
  regions: {
    foyer: { takes: "free" },
    hall: { takes: "free" },
    landing: { takes: "free" },
  },
  connections: [["foyer", "hall"], { between: ["hall", "landing"], barriers: ["hallDoor"] }],
  gates: {
    hallDoor: { from: "hall", to: "landing", owners: ["torch"] },
  },
  mechanics: {
    torch: { control: "activator", in: "foyer", starts: "ready", opens: { ready: ["hallDoor"], spent: [] } },
  },
  in: "foyer",
  out: "landing",
})
