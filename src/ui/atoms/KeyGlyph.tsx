import type { FC } from "react"
import clsx from "clsx"
import type { PadBrand } from "@/app/input/useModality"

import type { Glyph, PadButton } from "./glyphs"

// A keycap: a raised stone key with a thicker lower lip, so it reads as something pressed down.
const cap =
  "inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-stone-500 border-b-[3px] bg-stone-800 px-1.5 font-sans text-xs leading-none font-semibold text-stone-100"
const miniCap =
  "flex size-[0.85rem] items-center justify-center rounded-[3px] border border-stone-500 border-b-2 bg-stone-800 text-[0.5rem] leading-none text-stone-100"

const Arrows: FC = () => (
  <span className="inline-grid grid-cols-3 gap-px align-middle" role="img" aria-label="↑ ← ↓ →">
    <span />
    <span className={miniCap}>▲</span>
    <span />
    <span className={miniCap}>◀</span>
    <span className={miniCap}>▼</span>
    <span className={miniCap}>▶</span>
  </span>
)

// Xbox letters on their own colours; PlayStation shapes in their colours on a grey button.
const FACE: Record<PadBrand, Record<"a" | "b" | "x" | "y", { text: string; cls: string; name: string }>> = {
  xbox: {
    a: { text: "A", cls: "bg-green-600 text-white", name: "A" },
    b: { text: "B", cls: "bg-red-600 text-white", name: "B" },
    x: { text: "X", cls: "bg-blue-600 text-white", name: "X" },
    y: { text: "Y", cls: "bg-amber-400 text-stone-900", name: "Y" },
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

const DPad: FC = () => (
  <svg viewBox="0 0 24 24" className="inline-block size-6 align-middle" role="img" aria-label="D-pad">
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

const PadGlyph: FC<{ button: PadButton; brand: PadBrand }> = ({ button, brand }) => {
  if (button === "dpad") return <DPad />
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
        "inline-flex size-6 items-center justify-center rounded-full font-sans text-xs leading-none font-bold shadow-[inset_0_-2px_0_rgb(0_0_0/0.35)]",
        cls
      )}
      role="img"
      aria-label={name}
    >
      {text}
    </span>
  )
}

/** A keyboard key as a keycap, or a pad button in the look of the pad's brand. */
export const KeyGlyph: FC<{ glyph: Glyph; brand?: PadBrand }> = ({ glyph, brand = "xbox" }) => {
  if (glyph.kind === "arrows") return <Arrows />
  if (glyph.kind === "key") return <kbd className={cap}>{glyph.label}</kbd>
  return <PadGlyph button={glyph.button} brand={brand} />
}
