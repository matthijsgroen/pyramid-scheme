import type { OneWayRealisationMeta } from "@/game/oneWayRealisation"

// A ZIPLINE IS A ONE-WAY REALISED AS A LINE: launch, three obstacle cells, landing. It says what it costs and
// nothing of where it lands, so the player never takes it by accident.
export const ZIPLINE_META: OneWayRealisationMeta = {
  id: "zipline",
  ownerMod: "topology",
  prompt: "ui.prompt.zipline",
}
