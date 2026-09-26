import type { ModDescriptor } from "../modDescriptor"
import { CONVERSATION_META } from "./game/conversation/meta"
import { READING_META } from "./game/reading/meta"

// The story mod. Owns the encounters a beat is told through; the beats themselves are translations
// (`fez.json`), so writing one costs keys rather than code.
//
// NOTHING IN THE WORLD ASKS FOR THESE YET. The families are registered and renderable, and the
// rooms that will hold them are authored after the floor topology work lands — so today this mod
// adds a family to the registry and places nothing. That is deliberate: a conversation occupying a
// room is a claim on floor layout, and claiming one now would re-carve floors twice.
//
// Game-side only (no React) — the Component registers app-side via src/mods/story/app.
export const storyMod: ModDescriptor = {
  id: "story",
  families: [CONVERSATION_META, READING_META],
}
