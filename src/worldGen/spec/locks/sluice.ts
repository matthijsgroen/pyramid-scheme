import type { Lock } from "../../../game/lockAuthoring"

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
