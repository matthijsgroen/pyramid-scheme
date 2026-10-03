import type { MechanicKind } from "./mechanicKind"

/** An effect with no control: always on, directed, and always crossed through a prompt its realisation offers. */
export const ONE_WAY: MechanicKind = { control: "one-way", built: true, gates: "opens", effectOnly: true }
