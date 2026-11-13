import type { FC } from "react"
import clsx from "clsx"

import type { Glyph, PadBrand, PadButton } from "./glyphs"

// A keycap: a raised stone key with a thicker lower lip, so it reads as something pressed down.
const cap =
  "inline-flex items-center justify-center rounded-md border border-b-[3px] border-stone-500 bg-stone-800 font-sans leading-none font-semibold text-stone-100"
const capSize = { md: "h-6 min-w-6 px-1.5 text-xs", sm: "h-5 min-w-5 px-1 text-[0.65rem]" }

// The four arrow keys as one wide keycap: they are one control, and four tiny caps do not read at this size.
const ARROWS = "←↑↓→"

// The face colours of each brand, toned towards the stone around them: still the green A and the blue cross,
// never a sticker on the wall.
const FACE: Record<PadBrand, Record<"a" | "b" | "x" | "y", { text: string; cls: string; name: string }>> = {
  xbox: {
    a: { text: "A", cls: "bg-emerald-800 text-emerald-100 ring-1 ring-emerald-600", name: "A" },
    b: { text: "B", cls: "bg-red-900 text-red-100 ring-1 ring-red-700", name: "B" },
    x: { text: "X", cls: "bg-sky-900 text-sky-100 ring-1 ring-sky-700", name: "X" },
    y: { text: "Y", cls: "bg-amber-700 text-amber-50 ring-1 ring-amber-500", name: "Y" },
  },
  playstation: {
    a: { text: "✕", cls: "bg-stone-700 text-sky-300 ring-1 ring-stone-500", name: "Cross" },
    b: { text: "◯", cls: "bg-stone-700 text-rose-400 ring-1 ring-stone-500", name: "Circle" },
    x: { text: "▢", cls: "bg-stone-700 text-pink-300 ring-1 ring-stone-500", name: "Square" },
    y: { text: "△", cls: "bg-stone-700 text-emerald-300 ring-1 ring-stone-500", name: "Triangle" },
  },
}

const SHOULDER: Record<PadBrand, Record<"lb" | "rb", string>> = {
  xbox: { lb: "LB", rb: "RB" },
  playstation: { lb: "L1", rb: "R1" },
}

const MIDDLE: Record<PadBrand, Record<"start" | "select", { text: string; name: string }>> = {
  xbox: { start: { text: "≡", name: "Menu" }, select: { text: "⧉", name: "View" } },
  playstation: { start: { text: "≡", name: "Options" }, select: { text: "⧉", name: "Create" } },
}

type Size = keyof typeof capSize

const DPad: FC<{ size: Size }> = ({ size }) => (
  <svg
    viewBox="0 0 24 24"
    className={clsx("inline-block align-middle", size === "sm" ? "size-5" : "size-6")}
    role="img"
    aria-label="D-pad"
  >
    <path
      d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"
      className="fill-stone-700 stroke-stone-400"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <path
      d="M12 4.5l1.6 2h-3.2zM12 19.5l1.6-2h-3.2zM4.5 12l2-1.6v3.2zM19.5 12l-2-1.6v3.2z"
      className="fill-stone-200"
    />
  </svg>
)

const PadGlyph: FC<{ button: PadButton; brand: PadBrand; size: Size }> = ({ button, brand, size }) => {
  if (button === "dpad") return <DPad size={size} />
  if (button === "lb" || button === "rb")
    return (
      <span
        className={clsx(
          "inline-flex h-5 min-w-8 items-center justify-center bg-stone-700 px-1.5 font-sans text-[0.65rem] leading-none font-bold text-stone-100 ring-1 ring-stone-500",
          button === "lb" ? "rounded-l-full rounded-r-md" : "rounded-l-md rounded-r-full"
        )}
      >
        {SHOULDER[brand][button]}
      </span>
    )
  if (button === "start" || button === "select") {
    const { text, name } = MIDDLE[brand][button]
    return (
      <span
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-stone-700 px-1 text-xs leading-none text-stone-100 ring-1 ring-stone-500"
        role="img"
        aria-label={name}
      >
        {text}
      </span>
    )
  }
  const { text, cls, name } = FACE[brand][button]
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-sans leading-none font-bold shadow-[inset_0_-2px_0_rgb(0_0_0/0.35)]",
        size === "sm" ? "size-5 text-[0.65rem]" : "size-6 text-xs",
        cls
      )}
      role="img"
      aria-label={name}
    >
      {text}
    </span>
  )
}

/** A keyboard key as a keycap, or a pad button in the look of the pad's brand. `sm` fits inside a small label. */
export const KeyGlyph: FC<{ glyph: Glyph; brand?: PadBrand; size?: Size }> = ({
  glyph,
  brand = "xbox",
  size = "md",
}) => {
  if (glyph.kind === "arrows")
    return (
      <kbd className={clsx(cap, size === "sm" ? "h-5 px-1.5 text-xs" : "h-7 px-2 text-base", "tracking-wide")}>
        {ARROWS}
      </kbd>
    )
  if (glyph.kind === "key") return <kbd className={clsx(cap, capSize[size])}>{glyph.label}</kbd>
  return <PadGlyph button={glyph.button} brand={brand} size={size} />
}
