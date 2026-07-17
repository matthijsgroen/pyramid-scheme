import type { Difficulty } from "@/data/difficultyLevels"

// Difficulty carries two independent visual roles — keep them as separate token maps, do NOT
// merge. "Material" is the carved-stone tile look (a physical material per tier: stone → emerald).
// "Rank" is the difficulty badge hue (a rank scale: green → purple). They happen to both key off
// Difficulty but mean different things; a shared map would force one role's palette onto the other.

// ── Material: the 3D stone tile (HieroglyphTile) ──────────────────────────────────────────────
// Each spec is the difficulty-varying part of the tile; the shared paper texture / radial specks /
// clip-path live in HieroglyphTile itself. `tile` is the main face gradient, `shadow` the offset
// drop-shadow element's gradient (lighter stops), `symbol` the engraved glyph color.
export type MaterialSpec = { tile: string; shadow: string; symbol: string }

export const difficultyMaterial: Record<Difficulty, MaterialSpec> = {
  starter: {
    tile: "linear-gradient(145deg, var(--color-stone-300) 0%, var(--color-stone-400) 25%, var(--color-stone-500) 75%, var(--color-stone-800) 100%)",
    shadow:
      "linear-gradient(145deg, var(--color-stone-100) 0%, var(--color-stone-200) 25%, var(--color-stone-400) 75%, var(--color-stone-600) 100%)",
    symbol: "#57534e",
  },
  junior: {
    tile: "linear-gradient(145deg, var(--color-orange-300) 0%, var(--color-orange-400) 25%, var(--color-orange-500) 75%, var(--color-orange-800) 100%)",
    shadow:
      "linear-gradient(145deg, var(--color-orange-50) 0%, var(--color-orange-100) 25%, var(--color-orange-300) 75%, var(--color-orange-500) 100%)",
    symbol: "#92400e",
  },
  expert: {
    tile: "linear-gradient(145deg, var(--color-slate-300) 0%, var(--color-slate-400) 25%, var(--color-slate-500) 75%, var(--color-slate-800) 100%)",
    shadow:
      "linear-gradient(145deg, var(--color-slate-50) 0%, var(--color-slate-100) 25%, var(--color-slate-300) 75%, var(--color-slate-500) 100%)",
    symbol: "#a16207",
  },
  master: {
    tile: "linear-gradient(145deg, var(--color-yellow-300) 0%, var(--color-yellow-400) 25%, var(--color-yellow-500) 75%, var(--color-yellow-800) 100%)",
    shadow:
      "linear-gradient(145deg, var(--color-yellow-50) 0%, var(--color-yellow-100) 25%, var(--color-yellow-200) 75%, var(--color-yellow-300) 100%)",
    symbol: "#c2410c",
  },
  wizard: {
    tile: "linear-gradient(145deg, var(--color-emerald-300) 0%, var(--color-emerald-500) 25%, var(--color-emerald-600) 75%, var(--color-emerald-800) 100%)",
    shadow:
      "linear-gradient(145deg, var(--color-emerald-100) 0%, var(--color-emerald-200) 25%, var(--color-emerald-400) 75%, var(--color-emerald-500) 100%)",
    symbol: "#b91c1c",
  },
}

// Flat `bg border` classes for the same material hues — used by non-3D surfaces (TombLockPanel,
// TombTableau) that want the tier color without the carved-tile treatment.
export const difficultyMaterialFlat: Record<Difficulty, string> = {
  starter: "bg-stone-300 border-stone-400",
  junior: "bg-orange-300 border-orange-400",
  expert: "bg-slate-400 border-slate-500",
  master: "bg-yellow-200 border-yellow-400",
  wizard: "bg-emerald-400 border-emerald-500",
}

// ── Rank: the difficulty badge (DifficultyPill) ───────────────────────────────────────────────
// A distinct rank scale (green → purple), unrelated to the material hues above.
export const difficultyRank: Record<Difficulty, string> = {
  starter: "bg-green-100 border-green-300 text-green-800",
  junior: "bg-blue-100 border-blue-300 text-blue-800",
  expert: "bg-yellow-100 border-yellow-300 text-yellow-800",
  master: "bg-orange-100 border-orange-300 text-orange-800",
  wizard: "bg-purple-100 border-purple-300 text-purple-800",
}
