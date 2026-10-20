/**
 * Where the explorer first meets Fez: the conversation that introduces him, and the journey it plays in.
 *
 * Registered by the mod that stages the meeting rather than named here, so a game without that mod has
 * no meeting to wait for and Fez speaks from the first screen.
 */
export type FezMeeting = { conversation: string; journeyId: string }

let registered: FezMeeting | undefined

export const registerFezMeeting = (meeting: FezMeeting) => {
  registered = meeting
}

export const fezMeeting = (): FezMeeting | undefined => registered

/** How far a save has come through one journey. */
export type JourneyProgress = { levelNr: number; completionCount: number }

/**
 * Whether Fez is met: the meeting has been heard, or the save is past the pyramid it stands in.
 *
 * Past it counts because the meeting stands in the first pyramid's main corridor, so nobody leaves that
 * pyramid without hearing it — except a save that left before the meeting existed, which met Fez the
 * old way and must not find him silent.
 */
export const hasMetFez = ({
  meeting,
  heard,
  progress,
}: {
  meeting: FezMeeting | undefined
  heard: Record<string, boolean>
  progress: JourneyProgress | undefined
}): boolean =>
  !meeting || !!heard[meeting.conversation] || (!!progress && (progress.levelNr > 1 || progress.completionCount > 0))
