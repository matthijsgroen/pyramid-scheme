import type { MechanicKindMeta } from "@/game/mechanicKinds"

// The controls the topology mod builds. A kind a lock may name but the engine cannot build yet is declared
// here with `built: false`, so the lock is checked and refused at the bake rather than mis-baked.
export const TOPOLOGY_MECHANIC_KINDS: MechanicKindMeta[] = [
  "toggle",
  "activator",
  "sequence",
  "fork-switch",
  "one-way",
].map(control => ({ control, ownerMod: "topology", built: true }))
