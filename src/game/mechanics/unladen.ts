import { PASSAGE_KIND } from "../passageRealisation"
import type { MechanicKind } from "./mechanicKind"

/** An effect with no control: a gate empty hands alone open, alone on its connection, dressed as the passage its
 * binding names. Beside a drop it is the drop's own condition and needs no binding. */
export const UNLADEN: MechanicKind = { control: PASSAGE_KIND, built: true, gates: "opens", effectOnly: true }
