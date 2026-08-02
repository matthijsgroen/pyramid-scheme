import type { ReactNode } from "react"
import type { TreasureReward } from "@/game/siteTypes"
import type { TFn } from "./rewardHandlerRegistry"

// The rich popup content for a claimed reward — what the LootPopup shell (RewardFlow) shows. Core
// owns the shell; a mod contributes the content for its own reward type: rarity, labels, and the
// visual (a hieroglyph tile, an item icon, …). Distinct from rewardHandlerRegistry, whose
// SYNCHRONOUS text/emoji feed the shop stock list; this registry is hook-based so a display can
// read the mod's own state (e.g. fragment progress). Same seam shape as rewardContributions.
export type RewardDisplay = {
  rarity?: "common" | "rare" | "epic" | "legendary"
  itemName: string
  itemDescription?: string
  // A short line set apart from the description (LootPopup renders it italic, in the rarity accent
  // colour) — collection progress, an effect gained. The description itself is a single paragraph:
  // newlines in it collapse, so anything that needs its own line belongs here.
  itemEffectDescription?: string
  ItemVisual: ReactNode
}

export type RewardDisplayFn = (reward: TreasureReward, t: TFn) => RewardDisplay
// A hook returning the display functions this mod contributes, keyed by reward type.
export type UseRewardDisplays = () => Partial<Record<string, RewardDisplayFn>>

const registry: UseRewardDisplays[] = []

export const registerRewardDisplays = (useDisplays: UseRewardDisplays) => registry.push(useDisplays)

// Calls each display hook in a fixed order (the registry is populated once at module load — each
// mod's app entrypoint pushes exactly once — so the hooks run in the same order every render,
// rules-of-hooks safe) and merges them into one type→display map.
export const useMergedRewardDisplays = (): Partial<Record<string, RewardDisplayFn>> => {
  const merged: Partial<Record<string, RewardDisplayFn>> = {}
  for (const useDisplays of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see rewardContributions
    Object.assign(merged, useDisplays())
  }
  return merged
}
