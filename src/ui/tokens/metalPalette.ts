import type { Difficulty } from "@/data/difficultyLevels"

// Difficulty has one colour meaning: its metal, from stone to emerald (docs/game-design/visual-direction.md).
// The map trims its rooms in it, the hieroglyph tiles are cut from it, and the interface wears it, so a
// player who learns on the travel screen that gold is harder than copper recognises it inside.
//
// `accent` is what the map inlays and trims with. It is the metal itself everywhere but stone, whose
// rooms are limestone painted with red ochre — the stone is the ground, so the paint is the signature.
export type Metal = { material: string; light: string; shade: string; accent: string }

export const METALS: Record<Difficulty, Metal> = {
  starter: { material: "#c4ae86", light: "#ece0c6", shade: "#6e5a3c", accent: "#b8452c" },
  junior: { material: "#c8642c", light: "#f2b48a", shade: "#55210c", accent: "#c8642c" },
  expert: { material: "#9fb3c8", light: "#e6eef6", shade: "#4b5d75", accent: "#9fb3c8" },
  master: { material: "#d9a93f", light: "#f5dc8e", shade: "#6b4f12", accent: "#d9a93f" },
  wizard: { material: "#1f9e6b", light: "#9ee6c3", shade: "#0d4a33", accent: "#1f9e6b" },
}
