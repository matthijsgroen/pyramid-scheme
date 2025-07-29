export type Journey = {
  id: string
  name: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  levelCount: number
  time: "morning" | "afternoon" | "evening" | "night"
  requiredPrestigeLevel: number
  rewards: {
    perLevel: {
      coinsPerLevel: [min: number, max: number]
    }
    completed: {
      pieces: [min: number, max: number]
      pieceLevels: [min: number, max: number]
    }
  }
}
