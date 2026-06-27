import type { PuzzlePlugin, PuzzleSettings } from "./puzzlePlugin"

const registry = new Map<string, PuzzlePlugin>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registerPuzzle = (plugin: PuzzlePlugin<any>) =>
  registry.set(plugin.family, plugin as PuzzlePlugin<unknown>)

export const getPuzzlePlugin = (family: string): PuzzlePlugin | undefined => registry.get(family)

export type { PuzzlePlugin, PuzzleSettings }
