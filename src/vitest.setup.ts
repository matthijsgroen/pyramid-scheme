// React only runs its act() machinery — and only stays quiet about updates outside it — when the
// environment says it is a test one. Nothing else in the harness sets this.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true
