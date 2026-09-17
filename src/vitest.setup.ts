import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// React only runs its act() machinery — and only stays quiet about updates outside it — when the
// environment says it is a test one. Nothing else in the harness sets this.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// Testing Library registers this cleanup itself only when vitest exposes afterEach as a global,
// which this project doesn't do — so every root a spec mounted stayed mounted for the rest of the
// file. React kept scheduler work queued against those roots, and whatever was still queued when
// vitest tore the jsdom environment down ran with no window left to touch: "ReferenceError: window
// is not defined", an unhandled error that failed the run even though every test had passed.
// Unmounting after each test leaves nothing behind for React to schedule. Specs that call cleanup()
// themselves are unaffected — it is idempotent.
afterEach(cleanup)
