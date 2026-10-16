import type { Lock } from "@/game/lockAuthoring"

/** A lever in the first room works the door between the hall and the way out: a gate on the main route; another lock may be spliced in between `foyer` and `hall`. */
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
  nestSpot: { from: "foyer", to: "hall" },
})

/** A torch in the foyer that holds the hall's door open until it is worked, and then for ever shuts it: a lock the player can strand themselves in; another lock may be spliced in between `foyer` and `hall`. */
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
  nestSpot: { from: "foyer", to: "hall" },
})

/** A torch in the foyer that holds a side room's door open until it is worked, and then for ever shuts it: the way
 * through stays open, the side room is lost; another lock may be spliced in between `foyer` and `hall`. */
export const sealingLock = (): Lock => ({
  name: "sealing",
  regions: {
    foyer: { takes: "free" },
    side: { takes: "free" },
    hall: { takes: "free" },
    landing: { takes: "free" },
  },
  connections: [["foyer", "hall"], ["hall", "landing"], { between: ["foyer", "side"], barriers: ["sideDoor"] }],
  gates: {
    sideDoor: { from: "foyer", to: "side", owners: ["torch"] },
  },
  mechanics: {
    torch: { control: "activator", in: "foyer", starts: "ready", opens: { ready: ["sideDoor"], spent: [] } },
  },
  in: "foyer",
  out: "landing",
  nestSpot: { from: "foyer", to: "hall" },
})
