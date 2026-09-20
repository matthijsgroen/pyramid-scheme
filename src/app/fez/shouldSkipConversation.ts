type Ask = {
  alreadySeen: boolean
  tutorialsEnabled: boolean
  forceReplay?: boolean
  /** A story beat, which the tutorials setting must not silence — turning tutorials off is meant to
   * stop being taught, not to stop the plot. */
  story?: boolean
}

/** Whether Fez stays quiet about a conversation he has been asked to play. */
export const shouldSkipConversation = ({ alreadySeen, tutorialsEnabled, forceReplay, story }: Ask): boolean =>
  (alreadySeen || !(tutorialsEnabled || story)) && !forceReplay
