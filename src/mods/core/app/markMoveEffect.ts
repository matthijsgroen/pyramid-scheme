import type { InputEffect } from "./useHintAvailability"

/**
 * What one item of a hint wants of the board, for families whose items each have their own target.
 *
 * `holds` says the item already is what the hint asks; `follows` says a change of the item got closer to
 * it, which includes a value on the way through the family's tap cycle (a moon is reached via a sun).
 */
export type Decision<V> = {
  holds: (value: V) => boolean
  follows: (before: V, after: V) => boolean
}

/**
 * The decision of an item a gesture moves through `cycle`, from its first value onwards: a change follows
 * when it lands on the target or on a value the cycle passes on the way there. A target the cycle never
 * reaches is followed by nothing.
 */
export const cycleDecision = <V>(cycle: readonly V[], target: V): Decision<V> => ({
  holds: value => value === target,
  follows: (_before, after) => {
    const at = cycle.indexOf(after)
    return at > 0 && at <= cycle.indexOf(target)
  },
})

/** The items whose decision does not hold yet. An item without a decision (a mistake hint's) stays open. */
export const openItems = <K, V>(
  items: Iterable<K>,
  decisions: ReadonlyMap<K, Decision<V>>,
  read: (item: K) => V
): Set<K> => new Set([...items].filter(item => !decisions.get(item)?.holds(read(item))))

/**
 * Classifies a move against a hint whose items each carry their own decision.
 *
 * Nothing changed is a look; a move that only changes decided items toward their targets follows, unless it
 * leaves every decision holding, which completes the hint; anything else ends it.
 */
export const classifyItemMove = <K, V>(
  items: Iterable<K>,
  decisions: ReadonlyMap<K, Decision<V>>,
  changed: readonly K[],
  before: (item: K) => V,
  after: (item: K) => V
): InputEffect => {
  if (!changed.length) return "look"
  const follows = changed.every(item => decisions.get(item)?.follows(before(item), after(item)) ?? false)
  if (!follows) return "move"
  return openItems(items, decisions, after).size === 0 ? "move" : "follows"
}

/** The focus item while it is still open, otherwise the first one left, otherwise none. */
export const openFocus = <K>(focus: K | undefined, open: ReadonlySet<K>): K | undefined =>
  focus !== undefined && open.has(focus) ? focus : [...open][0]

/** What a mark-deciding hint asks of the board: the squares it settles and whether they get the piece or are ruled out. */
export type MarkDecisions = {
  decided: ReadonlySet<number>
  /** undefined is a mistake hint: it names a wrong mark and decides nothing, so any change ends it. */
  action: "place" | "ruleOut" | undefined
}

/** The two values a family writes: the answer, and the "not here" mark that sits before it in the tap cycle. */
export type MarkVocabulary<M> = { place: M; ruleOut: M }

/**
 * The decision every decided square carries, on the cycle the gesture moves a square through.
 *
 * A tap runs blank, ruled out, placed. A sweep only ever rules blank squares out, so a place target is not
 * on its cycle and no sweep carries one out.
 */
const markDecisions = <M>(
  hint: MarkDecisions,
  vocab: MarkVocabulary<M>,
  gesture: "tap" | "sweep"
): Map<number, Decision<M | undefined>> => {
  if (!hint.action) return new Map()
  const cycle = gesture === "tap" ? [undefined, vocab.ruleOut, vocab.place] : [undefined, vocab.ruleOut]
  const decision = cycleDecision(cycle, vocab[hint.action])
  return new Map([...hint.decided].map(cell => [cell, decision]))
}

/** The decisions that do not hold their target yet: what the board still has to draw. */
export const openDecisions = <M>(
  hint: MarkDecisions,
  vocab: MarkVocabulary<M>,
  marks: readonly (M | undefined)[]
): Set<number> => openItems(hint.decided, markDecisions(hint, vocab, "tap"), cell => marks[cell])

/** Classifies a tap or a sweep on a mark board against the hint that is showing, by `classifyItemMove`. */
export const classifyMarkMove = <M>(
  hint: MarkDecisions,
  vocab: MarkVocabulary<M>,
  gesture: "tap" | "sweep",
  before: readonly (M | undefined)[],
  after: readonly (M | undefined)[]
): InputEffect =>
  classifyItemMove(
    hint.decided,
    markDecisions(hint, vocab, gesture),
    after.flatMap((mark, cell) => (mark !== before[cell] ? [cell] : [])),
    cell => before[cell],
    cell => after[cell]
  )
