import { readGameData, writeGameData } from "@/support/useGameStorage"

// The save shape a launch accepts. A save from before it is thrown away in full, once, at launch; from
// here on saves stay compatible, so this number stays put.
export const SAVE_EPOCH = 1
const EPOCH_KEY = "saveEpoch"
// The one choice a reset keeps, as "Clear game data" in Settings keeps it.
const KEPT = ["tutorialsEnabled"]

/** Runs before anything reads the save. True when it threw an older save away. */
export const settleSaveEpoch = async (): Promise<boolean> => {
  // A save that cannot be read is never touched here: the unreadable-save notice handles it.
  const data = await readGameData().catch(() => undefined)
  if (!data || data[EPOCH_KEY] === SAVE_EPOCH) return false
  const old = Object.keys(data).some(key => !KEPT.includes(key))
  const kept = Object.fromEntries(Object.entries(data).filter(([key]) => KEPT.includes(key)))
  await writeGameData(old ? { ...kept, [EPOCH_KEY]: SAVE_EPOCH } : { ...data, [EPOCH_KEY]: SAVE_EPOCH })
  return old
}
