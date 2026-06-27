import type { FloorConfig } from "@/game/siteTypes"

// ponytail: linear spine only (no sideSections); Phase 5a adds forks, 5c adds floors
export const pyramidSiteConfigs: Record<string, FloorConfig> = {
  // Starter — easy, short=2 puzzles, medium=3 puzzles
  starter_1: { pathPuzzles: 2, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  starter_2: { pathPuzzles: 2, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  starter_3: { pathPuzzles: 3, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  starter_4: { pathPuzzles: 3, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },

  // Junior — easy, short=3, medium=4, long=5
  junior_1: { pathPuzzles: 3, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  junior_2: { pathPuzzles: 4, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  junior_3: { pathPuzzles: 5, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  junior_4: { pathPuzzles: 4, difficulty: "easy", end: "treasure", exitOrStaircase: "exit", sideSections: [] },

  // Expert — medium, short=4, medium=5, long=6
  expert_1: { pathPuzzles: 4, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  expert_2: { pathPuzzles: 5, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  expert_3: { pathPuzzles: 6, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  expert_4: { pathPuzzles: 5, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },

  // Master — medium, short=5, medium=6, long=7
  master_1: { pathPuzzles: 5, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  master_2: { pathPuzzles: 7, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  master_3: { pathPuzzles: 7, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  master_4: { pathPuzzles: 6, difficulty: "medium", end: "treasure", exitOrStaircase: "exit", sideSections: [] },

  // Wizard — hard, all long=8
  wizard_1: { pathPuzzles: 8, difficulty: "hard", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  wizard_2: { pathPuzzles: 8, difficulty: "hard", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  wizard_3: { pathPuzzles: 8, difficulty: "hard", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
  wizard_4: { pathPuzzles: 8, difficulty: "hard", end: "treasure", exitOrStaircase: "exit", sideSections: [] },
}
