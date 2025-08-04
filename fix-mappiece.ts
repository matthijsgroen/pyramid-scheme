import * as fs from "fs"
import * as path from "path"

const journeysFilePath =
  "/Users/matthijsgroen/projects/personal/pyramid-scheme/src/data/journeys.ts"

// Read the file
let content = fs.readFileSync(journeysFilePath, "utf8")

// Map of journey id to mapPiece data
const mapPieceData = {
  // Junior journeys (levels) -> probability calculations
  junior_3: { levelCount: 6, startChance: 0.33, changeIncrease: 0.15 },
  junior_4: { levelCount: 5, startChance: 0.4, changeIncrease: 0.18 },

  // Expert journeys already added: expert_1, expert_2
  // Missing master journeys (4 levels each typically)
  master_1: { levelCount: 4, startChance: 0.5, changeIncrease: 0.25 },
  master_2: { levelCount: 6, startChance: 0.33, changeIncrease: 0.15 },
  master_3: { levelCount: 8, startChance: 0.25, changeIncrease: 0.12 },
  master_4: { levelCount: 5, startChance: 0.4, changeIncrease: 0.18 },

  // Wizard journeys (3-10 levels typically)
  wizard_1: { levelCount: 3, startChance: 0.67, changeIncrease: 0.2 },
  wizard_2: { levelCount: 7, startChance: 0.29, changeIncrease: 0.12 },
  wizard_3: { levelCount: 10, startChance: 0.2, changeIncrease: 0.1 },
  wizard_4: { levelCount: 8, startChance: 0.25, changeIncrease: 0.12 },
}

// Replace patterns for each journey that needs mapPiece data
for (const [journeyId, data] of Object.entries(mapPieceData)) {
  const searchPattern = new RegExp(
    `(\\s+id: "${journeyId}",[\\s\\S]*?)rewards: {\\s*completed:`,
    "g"
  )

  content = content.replace(searchPattern, (match, beforeRewards) => {
    return (
      beforeRewards +
      `rewards: {
      mapPiece: {
        startChance: ${data.startChance},
        changeIncrease: ${data.changeIncrease},
      },
      completed:`
    )
  })
}

// Write the file back
fs.writeFileSync(journeysFilePath, content, "utf8")

console.log("Updated journeys.ts with mapPiece data")
