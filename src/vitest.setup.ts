import { afterEach } from "vitest"

// React only runs its act() machinery — and only stays quiet about updates outside it — when the
// environment says it is a test one. Nothing else in the harness sets this.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Guarded on the environment, because most spec files no longer have one: a spec opts into jsdom with
// `// @vitest-environment jsdom` and the rest run in node, where there is no tree to unmount and
// importing Testing Library would throw on the `document` it reaches for as it loads. The import is
// inside the guard rather than at the top for the same reason — and it is the setup file's whole cost,
// about 130ms, which the DOM-less majority now never pays.
if (typeof document !== "undefined") {
  // Testing Library registers this cleanup itself only when vitest exposes afterEach as a global,
  // which this project doesn't do — so every root a spec mounted stayed mounted for the rest of the
  // file. React kept scheduler work queued against those roots, and whatever was still queued when
  // vitest tore the jsdom environment down ran with no window left to touch: "ReferenceError: window
  // is not defined", an unhandled error that failed the run even though every test had passed.
  // Unmounting after each test leaves nothing behind for React to schedule. Specs that call cleanup()
  // themselves are unaffected — it is idempotent.
  const { cleanup } = await import("@testing-library/react")
  afterEach(cleanup)
}
