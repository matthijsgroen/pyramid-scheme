import { hashString } from "@/support/hashString"
import { DEFAULT_CONTROL_ROLE } from "./encounterFallback"
import { PROCESSION_STEPS } from "./mechanics/sequence"
import type { SequenceControl } from "./obstacles"
import { mulberry32, shuffle } from "./random"
import type { ResolveEncounter } from "./siteAssembler"
import type { AssemblerFailure } from "./siteTypes"

/** The signs of one sequence whose realisation brings its own: the glyph each step wears, who reads its order, and the
 * family of the board its door carries. */
export type SequenceSigns = { glyphs: number[]; orderReader: string; board?: string }

export type SequenceSignsResult =
  | { ok: true; signs: ReadonlyMap<string, SequenceSigns>; excludedMarks: ReadonlySet<number> }
  | { ok: false; reasons: AssemblerFailure["reasons"] }

/**
 * WHAT A FLOOR'S SEQUENCES WEAR WHEN THEIR REALISATION BRINGS ITS OWN SIGNS (a procession door), settled before a
 * wall is carved. Step k wears the realisation's glyph π(k), π shuffled from the sequence's id, so the signs say
 * nothing of the order; the floor's marks leave those glyphs out, and those that read as them.
 *
 * A sequence written `procession` is refused here by name whatever is registered, so the mod being off changes no
 * refusal: one with fewer than three steps (a two-bar board is read, not solved) or more than one cast's six, and a
 * second on one floor (one cast, six signs).
 */
export const sequenceSigns = (
  sequences: readonly SequenceControl[],
  resolveEncounter: ResolveEncounter
): SequenceSignsResult => {
  const processions = sequences.filter(sequence => sequence.procession)
  const reasons: AssemblerFailure["reasons"] = processions
    .filter(({ steps }) => steps.length < PROCESSION_STEPS.min || steps.length > PROCESSION_STEPS.max)
    .map(({ id, steps }) => ({ type: "processionStepsOutOfRange" as const, id, steps: steps.length }))
  if (processions.length > 1)
    reasons.push({ type: "processionDoorsRepeated", ids: processions.map(sequence => sequence.id) })
  if (reasons.length > 0) return { ok: false, reasons }

  const signs = new Map<string, SequenceSigns>()
  const excludedMarks = new Set<number>()
  for (const sequence of sequences) {
    if (sequence.encounter === undefined) continue
    const realised = resolveEncounter(sequence.encounter, DEFAULT_CONTROL_ROLE)
    const own = realised.ownerMod === undefined ? undefined : realised.sequence
    if (!own) continue
    const order = shuffle(
      own.glyphs.map((_, index) => index),
      mulberry32(hashString(`procession|${sequence.id}`))
    )
    signs.set(sequence.id, {
      glyphs: sequence.steps.map((_, step) => own.glyphs[order[step]]),
      orderReader: realised.familyId,
      ...(own.board ? { board: own.board.family } : {}),
    })
    for (const glyph of [...own.glyphs, ...(own.resembles ?? [])]) excludedMarks.add(glyph)
  }
  return { ok: true, signs, excludedMarks }
}
