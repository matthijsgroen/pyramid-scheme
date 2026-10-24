import { describe, expect, it } from "vitest"
import { hasMetFez } from "./fezMeeting"

const meeting = { conversation: "meeting.somewhere", journeyId: "somewhere" }
const atFirstPyramid = { levelNr: 1, completionCount: 0 }

describe(hasMetFez, () => {
  it("is not met on a fresh save", () => {
    expect(hasMetFez({ meeting, heard: {}, progress: undefined })).toBe(false)
  })

  it("is not met in the first pyramid before the meeting is heard", () => {
    expect(hasMetFez({ meeting, heard: { welcome: true }, progress: atFirstPyramid })).toBe(false)
  })

  it("is met once the meeting is heard", () => {
    expect(hasMetFez({ meeting, heard: { "meeting.somewhere": true }, progress: atFirstPyramid })).toBe(true)
  })

  it("is met by a save already past the first pyramid, which met him before the meeting existed", () => {
    expect(hasMetFez({ meeting, heard: {}, progress: { levelNr: 2, completionCount: 0 } })).toBe(true)
  })

  it("is met by a save that has finished the meeting's journey", () => {
    expect(hasMetFez({ meeting, heard: {}, progress: { levelNr: 1, completionCount: 1 } })).toBe(true)
  })

  it("is met from the start when no meeting is staged", () => {
    expect(hasMetFez({ meeting: undefined, heard: {}, progress: undefined })).toBe(true)
  })
})
