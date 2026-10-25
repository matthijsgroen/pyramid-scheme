import { isModEnabled } from "@/mods/registeredMods"

// The camp's app-side registrations (reward display, claim effect, homecoming growth, Collection section),
// self-gated on the mod being enabled. None yet.
if (isModEnabled("camp")) {
  // registrations arrive with the camp's reward and Collection work
}
