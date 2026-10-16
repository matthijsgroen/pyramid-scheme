import { drawLock } from "@/game/lockDraw"
import { lockChecks } from "@/game/lockChecks"
import { parseLock } from "@/game/lockNotation"

export type LockReport = { checks: string[]; drawing: string; sound: boolean }

/** What `yarn lock` prints of the text: its checks and its drawing; a text that does not parse reports why. */
export const lockReport = (text: string): LockReport => {
  try {
    const parsed = parseLock(text)
    const { checks, sound } = lockChecks(parsed)
    return { checks, drawing: drawLock(parsed.lock, parsed.drafts), sound }
  } catch (error) {
    return { checks: [`✗ ${(error as Error).message}`], drawing: "", sound: false }
  }
}
