import type { InputEffect } from "./useHintAvailability"

/** What a mark-deciding hint asks of the board: the squares it settles and whether they get the piece or are ruled out. */
export type MarkDecisions = {
  decided: ReadonlySet<number>
  /** undefined is a mistake hint: it names a wrong mark, and any move ends it. */
  action: "place" | "ruleOut" | undefined
}

/** The two values a family writes: the answer, and the "not here" mark that sits before it in the tap cycle. */
export type MarkVocabulary<M> = { place: M; ruleOut: M }

const targetOf = <M>(action: "place" | "ruleOut", vocab: MarkVocabulary<M>) => vocab[action]

/** The decisions that do not hold their target yet: what the board still has to draw. */
export const openDecisions = <M>(
  hint: MarkDecisions,
  vocab: MarkVocabulary<M>,
  marks: readonly (M | undefined)[]
): Set<number> => {
  const { action } = hint
  if (!action) return new Set(hint.decided)
  return new Set([...hint.decided].filter(cell => marks[cell] !== targetOf(action, vocab)))
}

/** The focus square while it is still open, otherwise the first decision left, otherwise none. */
export const openFocus = (focus: number | undefined, open: ReadonlySet<number>): number | undefined =>
  focus !== undefined && open.has(focus) ? focus : [...open][0]

/**
 * Classifies a tap or a sweep against the hint that is showing, so the shell keeps it while it is followed.
 *
 * A tap follows when it writes the target on a decided square, or the ruled-out mark that comes before a
 * place target; a sweep follows only when every square it changes is a decided rule-out. A move that leaves
 * every decision holding its target completes the hint, and anything else ends it.
 */
export const classifyMarkMove = <M>(
  hint: MarkDecisions,
  vocab: MarkVocabulary<M>,
  gesture: "tap" | "sweep",
  before: readonly (M | undefined)[],
  after: readonly (M | undefined)[]
): InputEffect => {
  const { action } = hint
  if (!action) return "move"
  const changed = after.flatMap((mark, cell) => (mark !== before[cell] ? [cell] : []))
  if (!changed.length) return "look"
  const target = targetOf(action, vocab)
  const follows = changed.every(cell => {
    if (!hint.decided.has(cell)) return false
    if (after[cell] === target) return true
    return gesture === "tap" && after[cell] === vocab.ruleOut
  })
  if (!follows) return "move"
  return openDecisions(hint, vocab, after).size === 0 ? "move" : "follows"
}
