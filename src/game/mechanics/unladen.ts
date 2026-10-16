import { PASSAGE_KIND } from "../passageRealisation"
import type { MechanicKind } from "./mechanicKind"

/** An effect with no control: a gate empty hands alone open, dressed as the passage its binding names. */
export const UNLADEN: MechanicKind = { control: PASSAGE_KIND, built: true, gates: "opens", effectOnly: true }
