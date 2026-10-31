const KEY = "staleChunkReload"
const WINDOW_MS = 10_000

/**
 * A tab opened before a deploy asks for chunks the deploy removed. Vite reports that as `vite:preloadError`;
 * the page that asked is out of date, so it reloads into the new build once. A second failure inside the
 * window is a real one and is left to the crash screen, so a missing chunk can never loop the page.
 */
export const reloadOnStaleChunk = (target: Window = window, now: () => number = Date.now): void => {
  target.addEventListener("vite:preloadError", event => {
    let last: number
    try {
      last = Number(target.sessionStorage.getItem(KEY) ?? 0)
    } catch {
      return
    }
    if (now() - last < WINDOW_MS) return
    event.preventDefault()
    try {
      target.sessionStorage.setItem(KEY, String(now()))
    } catch {
      return
    }
    target.location.reload()
  })
}
