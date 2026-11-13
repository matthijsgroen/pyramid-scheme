import { Fragment, type FC } from "react"
import { KeyGlyph } from "@/ui/atoms/KeyGlyph"
import type { Glyph, PadBrand } from "@/ui/atoms/glyphs"

/** Glyphs side by side are alternatives ("Enter / Esc"); a "+" between two means held together. */
export type Chord = readonly (Glyph | "+")[]

/**
 * One thing to do and what does it. A step without `keys` or without `pad` is left out in that mode: a pad
 * picks a value in two steps where a keyboard types it in one.
 */
export type ControlStep = { keys?: Chord; pad?: Chord; label: string }

const ChordGlyphs: FC<{ chord: Chord; brand: PadBrand }> = ({ chord, brand }) => (
  <span className="inline-flex shrink-0 items-center gap-0.5">
    {chord.map((part, index) => {
      if (part === "+")
        return (
          <span key={index} className="px-0.5 text-stone-500">
            +
          </span>
        )
      const alternative = index > 0 && chord[index - 1] !== "+"
      return (
        <Fragment key={index}>
          {alternative && <span className="px-0.5 text-stone-500">/</span>}
          <KeyGlyph glyph={part} brand={brand} />
        </Fragment>
      )
    })}
  </span>
)

/**
 * The keys or pad buttons of a board, one step a line, under its rules. Keys show keycaps, pad shows pad
 * buttons in its brand's look, touch shows nothing.
 */
export const ControlsBlock: FC<{
  heading: string
  input: "touch" | "keys" | "pad"
  brand: PadBrand
  steps: readonly ControlStep[]
}> = ({ heading, input, brand, steps }) => {
  if (input === "touch") return null
  const shown = steps.flatMap(step => {
    const chord = step[input]
    return chord ? [{ chord, label: step.label }] : []
  })
  if (shown.length === 0) return null
  return (
    <>
      <h3 className="mt-3 mb-1 font-pyramid text-stone-300">{heading}</h3>
      <ul className="space-y-1.5">
        {shown.map(({ chord, label }, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChordGlyphs chord={chord} brand={brand} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
