// Tutorials off still allows an explicit replay (e.g. the tomb's "?" button) — the setting
// only stops them popping up unprompted.
export const shouldSkipConversation = (
  alreadySeen: boolean,
  tutorialsEnabled: boolean,
  forceReplay: boolean | undefined
): boolean => (alreadySeen || !tutorialsEnabled) && !forceReplay
