import type { Speaker } from "./arrivalConversation"
import type { Face, Pose } from "./portraits"

export type PoseChat = [pose: Pose, translationKey: string, speaker?: Speaker, face?: Face]

export const pose = (...args: (Pose | string[])[]): PoseChat[] => {
  let currentPose: Pose = "default"

  const result = args.flatMap<PoseChat>(key => {
    if (Array.isArray(key)) {
      return key.map<PoseChat>(k => [currentPose, k])
    }
    currentPose = key
    return []
  })
  return result
}

/** Until Fez is met the explorer is alone, so what the player needs before then is his to say. */
const asExplorer = (chats: PoseChat[]): PoseChat[] => chats.map(([pose, key]) => [pose, key, "explorer"])

/** The tutorials and the shipped one-voice beats: the conversations not read out of the translations. */
export const TUTORIAL_LINES: Record<string, PoseChat[]> = {
  welcome: asExplorer(pose(["welcome", "welcome2", "welcome3"])),
  // The exterior is the one board that does not show its own rule, so the explorer says it, alone.
  pyramidIntro: asExplorer(pose(["pyramidIntro", "pyramidIntro2"])),
  levelCompleted: pose("pointUp", ["levelCompleted"]),
  expeditionCompleted: pose("glassesPoint", ["expeditionCompleted", "expeditionCompleted2"]),
  tombIntro: pose(["tombIntro"], "pointUp", ["tombIntro2"]),
  // The writing is only talked about once the tableau is on screen.
  tombTutorial: pose(["tombTutorial", "tombTutorial2", "tombTutorial3"], "pointUp", ["tombTutorial4"]),
  hieroglyphUnlock: pose(["hieroglyphUnlock"], "pointUp", ["hieroglyphUnlock2"]),
  errorHighlightTutorial: pose(["errorHighlightTutorial"], "glassesPoint", ["errorHighlightTutorial2"]),
  earlyFeedbackTutorial: pose(["earlyFeedbackTutorial"], "pointUp", ["earlyFeedbackTutorial2"]),
  notEnoughHieroglyphs: pose(["notEnoughHieroglyphs"], "pointUp", ["notEnoughHieroglyphs2"]),
  tombLoot: pose("glassesPoint", ["tombLoot"]),
  mapPiece: pose(["mapPiece", "mapPiece2"], "pointUp", ["mapPiece3"]),
  mapComplete: pose(["mapComplete", "mapComplete2"], "pointUp", ["mapComplete3"]),
  pyramidBlockedBlocks: pose(
    ["pyramidBlockedBlocks", "pyramidBlockedBlocks2", "pyramidBlockedBlocks3"],
    "glassesPoint",
    ["pyramidBlockedBlocks4"]
  ),
  shopArrival: pose("cocktail", ["shopArrival", "shopArrival2"]),
  // The first stall the player ever reaches: he owns up to it being his and pitches the counter.
  // Closes on the same practical line as every later visit, so the rules live in one string.
  shopFirstVisit: pose("cocktail", ["shopFirstVisit", "shopFirstVisit2", "shopArrival2"]),
  // The first mosaic piece found, and the nudge the travel screen repeats while pieces wait in hand.
  mosaicIntro: pose(["mosaicIntro", "mosaicIntro2"], "pointUp", ["mosaicIntro3"]),
  mosaicReminder: pose("pointUp", ["mosaicReminder"]),
  // One per finished mosaic register, plus the finale. Registers complete in any order, so no beat
  // may lean on another.
  mosaicStarter: pose(["mosaicStarter", "mosaicStarter2"], "pointUp", ["mosaicStarter3"]),
  mosaicJunior: pose("glassesPoint", ["mosaicJunior"], "default", ["mosaicJunior2", "mosaicJunior3"]),
  mosaicExpert: pose("pointUp", ["mosaicExpert"], "default", ["mosaicExpert2", "mosaicExpert3"]),
  mosaicMaster: pose("glassesPoint", ["mosaicMaster"], "default", ["mosaicMaster2", "mosaicMaster3"]),
  mosaicWizard: pose(["mosaicWizard", "mosaicWizard2"], "pointUp", ["mosaicWizard3"]),
  mosaicFinale: pose("glassesPoint", ["mosaicFinale"], "default", ["mosaicFinale2"], "pointUp", ["mosaicFinale3"]),
}
