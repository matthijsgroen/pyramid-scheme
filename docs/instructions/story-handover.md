# Story work — handover

**A working note, not durable documentation. Delete it when #284 and #304 have merged.** Everything here
is state a fresh session needs to pick this up cold; the reasoning all lives in the documents it points at.

## Where the work is

| Branch                            | PR   | Holds                                                             | State                   |
| --------------------------------- | ---- | ----------------------------------------------------------------- | ----------------------- |
| `docs/story-quests`               | #284 | every story document — script, cast, spine, format, catalogues    | docs only, CI n/a       |
| `story/journey-beats`             | #304 | the code, plus `character-art-prompts.md` and the placeholder SVG | **CI green, mergeable** |
| `docs/floor-as-puzzle-brainstorm` | #305 | another session's floor mechanics — read-only from here           | draft, docs only        |

**Art lands on `story/journey-beats`**, where the prompts and `src/assets/explorer-placeholder.svg`
already are. It is assets plus rendering, so it belongs with the code rather than with the docs.

## Read these first, in this order

1. `docs/game-design/story/README.md` — the index
2. `docs/game-design/story/main-path.md` — the five-act spine and the ending
3. `docs/game-design/story/cast.md` — Fez, the explorer, the pair; the never-says lists are the rules
4. `docs/game-design/story/script-act-1.md` … `-5.md` — 237 source lines, the whole script
5. `docs/game-design/story/IMPLEMENTATION.md` — what it costs, split by whether the world survives it

## Decided, and not worth reopening

- **The explorer speaks** and is a character rather than an avatar. No pronoun, no name, no gendered
  self-description (French and Polish gender past participles). Dry; Fez is the excitable one.
- **The ending is a name, and it is Fez's.** He has been here the whole time and forgot it. No
  curse-lifting — he is unimpressed and makes a joke. One tell an act, each reading as a joke first time.
- **Ipi teaches the belief in Act I** — _a thing written down is a thing that happened_ — four acts before
  the explorer quotes it back at the Sphinx.
- **Fez is wrong once a tier**, corrected by that tier's ghost, and right at the mosaic panel. That is what
  reconciles the 18 shipped `mosaic*` lines with his character: they need setting up, not rewriting.
- **Ghosts are allowed and never scary** — lit, already present, wanting something mundane, never
  mentioning dying.
- **Waypoints come from the ask, never the refusal.**
- **A fake must never be declared as a currency**, or the solver certifies an unfinishable world.
- **Three kinds of beat** — place, thread, anchored. The story is always told in order; only the places it
  is told in vary.

## Open, and wanting a decision

1. **What the name is.** Ordinary, like Ipi's or Henut's, so the weight is on it having been forgotten.
2. **How Fez and the explorer meet.** Recommended: the explorer starts alone and finds him in the first
   pyramid, because then the opening board has no companion and must teach itself.
3. **Wall or choice** at the tier gate (`story-and-time-brainstorm.md` §4.5). Everything else in that part
   is downstream of it.
4. **Does the thread queue carry over or flush at a tier crossing?** A feel question.
5. **Rewrite the 29 journey descriptions** — rumour, fact, or Fez pitching.

## What to build next

`IMPLEMENTATION.md` has the full list. Tasks 1–4 are done and in #304. Next:

- **The four encounter families** — conversation, reading, offering, found object. The story mod proper.
- **Reading** — resolve a line against the glyphs the player holds. The one with teeth: it is the ending's
  mechanism and the casual-mobile review's ninth item arriving as a consequence.

The mod owns the mechanisms; the arcs stay data. `ModDescriptor` already has a slot for all of it.

## Traps this session hit, all of them twice

- **`pull.rebase = true`.** A bare `git pull` on a feature branch replays main's commits as yours. Use
  `git merge origin/main`.
- **Betterer fails CI on _any_ change to `.betterer.results`, improvements included.** Adding an import
  shifts every `§` reference below it and changes the file hash. If the file is dirty it belongs in the
  commit — or fix the references, which is what the comment rules want anyway.
- **Prettier reflows markdown table columns**, so an exact-match replacement on a table row silently
  matches nothing and still exits clean. Edit tables by line index and verify.

## The other session

`sundowner-jasper-df` is designing floor mechanics. The thread is closed and both sides are recorded. The
single coupling: cosmic dust's come-back loop is the one place their mechanic could carry a beat rather
than permit one — **one Fez line at the clearing, nothing more.**

Their work is Pile B (re-carves), the story is Pile A (does not). They do not block each other.
