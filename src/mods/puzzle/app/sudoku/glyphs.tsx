import type { FC } from "react"
import { SIGN_CHARACTERS } from "./signs"

/**
 * What a value looks like on each of this family's two faces. Their own module because a file that
 * exports components may export nothing else — fast refresh needs the split, and the skin table next
 * door is not a component.
 *
 * **Both faces write their value as a character**, which is what the bundled hieroglyph face bought:
 * the game subsets and ships Noto Sans Egyptian Hieroglyphs (`scripts/generateFont.ts`), so a sign is
 * not at the mercy of whichever fonts a device happens to carry, and this board does not have to draw
 * its own. Telling one sign from another at a glance IS the mechanic here, so that guarantee is the
 * whole reason the font is in the repo.
 *
 * One shape, everywhere: the squares, the pad's keys and every hint sentence that names a value all
 * show the same character. A sign drawn for the board and typed in its sentences would be a hint
 * pointing at something that is not quite there.
 */

/** The sign standing for a value, 1…6. How large it is set is the skin's — see `SudokuSkin.size`. */
export const Sign: FC<{ value: number }> = ({ value }) => <>{SIGN_CHARACTERS[(value - 1) % SIGN_CHARACTERS.length]}</>

/** A value written as itself, for the board that cuts figures into stone rather than inking signs. */
export const Figure: FC<{ value: number }> = ({ value }) => <>{value}</>
