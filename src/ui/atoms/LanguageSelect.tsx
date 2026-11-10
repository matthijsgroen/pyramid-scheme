import type { FC } from "react"

export type LanguageOption = { code: string; name: string }

export type LanguageSelectProps = {
  id?: string
  /** The chosen language's code. */
  value: string
  /** The browser's languages, shown first. */
  preferred: readonly LanguageOption[]
  /** Every other language, below a divider when `preferred` has any. */
  others: readonly LanguageOption[]
  onChange: (code: string) => void
  ariaLabel?: string
  className?: string
}

// Each language is named in its own language, and marked as such so a reader pronounces it right.
const option = ({ code, name }: LanguageOption) => (
  <option key={code} value={code} lang={code}>
    {name}
  </option>
)

export const LanguageSelect: FC<LanguageSelectProps> = ({
  id,
  value,
  preferred,
  others,
  onChange,
  ariaLabel,
  className,
}) => (
  <select
    id={id}
    value={value}
    aria-label={ariaLabel}
    onChange={event => onChange(event.target.value)}
    className={className}
  >
    {preferred.map(option)}
    {preferred.length > 0 && (
      <option key="divider" disabled>
        ──────────
      </option>
    )}
    {others.map(option)}
  </select>
)
