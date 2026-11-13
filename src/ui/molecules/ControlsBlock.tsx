import { Fragment, type FC } from "react"
import { useTranslation } from "react-i18next"
import { useModality, type PadBrand } from "@/app/input/useModality"
import { KeyGlyph } from "@/ui/atoms/KeyGlyph"
import type { Glyph } from "@/ui/atoms/glyphs"

/** Glyphs side by side are alternatives ("Enter / Esc"); a "+" between two means held together. */
export type Chord = readonly (Glyph | "+")[]

/**
 * One thing to do and what does it. A step without `keys` or without `pad` is left out in that mode: a pad
 * picks a value in two steps where a keyboard types it in one.
 */
export type ControlStep = { keys?: Chord; pad?: Chord; label: string }

/** A line of steps, read left to right as one gesture; separate lines are separate gestures. */
export type ControlLine = readonly ControlStep[]

const ChordGlyphs: FC<{ chord: Chord; brand: PadBrand }> = ({ chord, brand }) => (
  <span className="inline-flex items-center gap-0.5">
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
 * The family's keys or pad buttons, under its rules. Follows `<html data-input>`: keys show keys, pad shows pad
 * buttons in its brand's look, touch shows nothing.
 */
export const ControlsBlock: FC<{ lines: readonly ControlLine[] }> = ({ lines }) => {
  const { t } = useTranslation("common")
  const { input, brand } = useModality()
  if (input === "touch") return null
  const shown = lines
    .map(line => line.flatMap(step => (step[input] ? [{ chord: step[input], label: step.label }] : [])))
    .filter(line => line.length > 0)
  if (shown.length === 0) return null
  return (
    <>
      <h3 className="mt-3 mb-1 font-pyramid text-stone-300">{t("ui.controls")}</h3>
      <ul className="space-y-1.5">
        {shown.map((line, lineIndex) => (
          <li key={lineIndex} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {line.map(({ chord, label }, stepIndex) => (
              <Fragment key={stepIndex}>
                {stepIndex > 0 && <span className="text-stone-600">·</span>}
                <span className="inline-flex items-center gap-1.5">
                  <ChordGlyphs chord={chord} brand={brand} />
                  <span>{label}</span>
                </span>
              </Fragment>
            ))}
          </li>
        ))}
      </ul>
    </>
  )
}
