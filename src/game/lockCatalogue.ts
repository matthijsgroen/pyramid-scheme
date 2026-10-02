// SMALL MULTI-STEP LOCKS, EACH WITH ONE TRICK — a single choice made by solving is a fork, not a lock.
// Written in lockNotation.ts's notation; `yarn lock <name>` draws one.
import { parseLock } from "./lockNotation"
import type { ParsedLock } from "./lockNotation"

/** Small multi-step locks in the notation, each with one trick; what each is for is the test that
 * names its load-bearing piece (lockCatalogue.spec.ts). */
export const LOCK_TEXTS = {
  /** The exit wants both lamps lit, and the board lets you reach one lamp at a time. */
  twoLamps: `
    in -[Y]- west
    in -[Y]- east
    in -[A+B]- out
    Y fork @in
    A toggle @west
    B toggle @east
  `,
  /** The lever that opens the exit shuts the door behind you; the only way home is a drop. */
  dropHome: `
    in -[Y]- hall -[H:a]- leverRoom
    in -[Y]- vault
    in -[H]- out
    leverRoom >> in
    Y fork @in
    H toggle @leverRoom
    hall *
    vault $
  `,
  /** Light west first and the board is solved once; light east first and it is solved twice. */
  lamplighter: `
    in -[Y]- west
    in -[Y]- east -[A+B]- out
    west >> east >> in
    Y fork @in
    A toggle @west
    B toggle @east
  `,
  /** Two levers, and each one's throw shuts the way to the other. Only the drops let both be thrown. */
  seesaw: `
    in -[B:a]- west
    in -[A:a]- east
    in -[A+B]- out
    west >> east >> in
    A toggle @west
    B toggle @east
    west *
    east *
  `,
  /** The owner's sketch: a lever that shuts the way you came and opens a branch you drop onto. */
  doubleBack: `
    in -[Y]- leftLower -[S1]- s2
    in -[Y]- rightLower -[S1:a]- s1
    in -[S2]- out
    s1 >> leftLower >> in
    Y fork @in
    S1 toggle @s1
    S2 toggle @s2
    s2 $
  `,
  /** The lever that opens the exit shuts the bridge back; the drop lands in a cell holding its own key. */
  cellar: `
    in -[H:a]- ledge
    in -[blue]- cell
    in -[H]- out
    ledge >> cell
    H toggle @ledge
    blue activator @cell
    ledge *
  `,
  /** A key chain behind an airlock: the lever opens the way in or the red room, never both. */
  keyring: `
    in -[H:a]- leverRoom -[H]- redRoom
    in -[red]- greenRoom
    in -[green]- out
    H toggle @leverRoom
    red activator @redRoom
    green activator @greenRoom
    leverRoom *
    redRoom *
  `,
  /** The owner's second sketch: one room overlooks two drops; the drop out of the middle saves whoever
   * drops in before throwing S1. */
  overlook: `
    in -- top
    in -[S2]- s2 -[S1]- middle
    in -[S2]- out
    top >> s1 >> in
    top >> middle >> in
    S1 toggle @s1
    S2 toggle @s2
    top *
    middle *
  `,
} as const

export type LockName = keyof typeof LOCK_TEXTS

export const LOCK_CATALOGUE = Object.fromEntries(
  Object.entries(LOCK_TEXTS).map(([name, text]) => [name, parseLock(text, name)])
) as Record<LockName, ParsedLock>
