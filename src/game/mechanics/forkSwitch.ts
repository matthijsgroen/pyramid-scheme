import type { MechanicKind } from "./mechanicKind"

/**
 * Rest, plus one state per exit of the fork it stands in. It governs its own fork: the gates name it in
 * their `owners`, and its junction is laid on the seams of its region (`forks: [{ in }]`), so the carve
 * never depends on what stands in the junction.
 */
export const FORK_SWITCH: MechanicKind = {
  control: "fork-switch",
  built: true,
  gates: "owns",
  oneToARegion: true,
  compile: (id, mechanic, { name, binding }) => {
    if (mechanic.control !== "fork-switch") return { controls: [] }
    return {
      controls: [
        { id: name(id), in: name(mechanic.in), control: "fork-switch", encounter: binding["fork-switch"] ?? "" },
      ],
      forks: [{ in: name(mechanic.in) }],
    }
  },
}
