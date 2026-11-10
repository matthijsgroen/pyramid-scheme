import type { FC } from "react"
import { LanguageSelect, type LanguageSelectProps } from "@/ui/atoms/LanguageSelect"

export type LanguageChipProps = Omit<LanguageSelectProps, "id" | "className" | "ariaLabel"> & {
  /** The chosen language's own name, shown on the chip. */
  name: string
  /** What the choice is, for a screen reader: the chip's face is only a globe and a name. */
  label: string
}

// A small chip naming the current language. The real select lies invisibly over it, so a tap or a key opens
// the platform's own list, on a phone as well.
export const LanguageChip: FC<LanguageChipProps> = ({ name, label, ...select }) => (
  <span className="relative inline-flex items-center gap-1.5 rounded-full border border-camp-glass-edge bg-camp-night/90 px-3.5 py-1.5 text-sm font-semibold text-camp-paper shadow-lg has-focus-visible:ring-2 has-focus-visible:ring-camp-accent">
    <span aria-hidden="true">🌐</span>
    <span aria-hidden="true">{name}</span>
    <span aria-hidden="true" className="text-xs">
      ▾
    </span>
    <LanguageSelect {...select} ariaLabel={label} className="absolute inset-0 cursor-pointer opacity-0" />
  </span>
)
