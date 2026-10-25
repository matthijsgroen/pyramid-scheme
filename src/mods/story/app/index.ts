// story's app-side registration (side-effect). The mod owns encounters that are read rather than
// solved, plus the log of everything the player has been told.
import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { StoryLogSection } from "./log/StoryLogSection"
import { useStoryTab } from "./log/collectionTab"
import "./conversation/plugin"
import "./reading/plugin"
import "./reaction/rail"
import "./devJumps"

// Gated on the mod: story off and there is no log, because there is nothing to log.
if (isModEnabled("story")) {
  registerCollectionSection({ id: "story", order: 50, Component: StoryLogSection, useTab: useStoryTab })
}
