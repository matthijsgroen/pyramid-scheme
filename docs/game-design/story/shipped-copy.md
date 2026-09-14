# The copy already in the game, and which half of it predates the explorer

`fez.json` holds 59 lines, and they were not written at the same time or for the same game.

| Body                                                                           | Keys | Written for                                                  |
| ------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------ |
| `mosaic*` — the five panel beats and the finale                                | 18   | the redesign. This is the voice everything else should match |
| `shop*` — the stall, first visit and after                                     | 4    | the redesign, and his commercial arc                         |
| everything else — `welcome*`, `pyramidIntro*`, `tombTutorial*`, `mapPiece*`, … | 37   | **before the explorer existed**                              |

The 22 are fine. The 37 are one character explaining the game to nobody in particular, because when they
were written there was nobody else in the room.

## The review's two complaints both land on the 37

> **Onboarding is a wall of prose.** … four bullets of paragraph text under the board, in a game whose
> founding rule is that text is never load-bearing.

> **Fez is a tooltip with legs.** He is charming and he is currently a delivery mechanism for the sentence
> "You can always stop this expedition by returning to the travel screen."

That second sentence is `notEnoughHieroglyphs` — which is also **misnamed**: the key says the player is
short of hieroglyphs and the copy says they may leave whenever they like. Worth fixing on its own.

## What having two speakers changes

A rule explained by one character is a lecture. The same rule is a conversation the moment somebody can ask
the question the player is already asking — which is the oldest way to make instruction not feel like
instruction, and it is available now for nothing.

`pyramidIntro` as it ships:

> **Fez:** Look at these walls — so many numbers are missing!
>
> **Fez:** The secret: every number is the sum of the two below it.
>
> **Fez:** Use that, and we'll uncover what the ancient builders hid here. Good luck!

The same rule, as a two-hander:

> **Fez:** Look at these walls. Half the numbers are gone.
>
> **Explorer:** Gone, or never there?
>
> **Fez:** Never there. Each one is the two below it, added together. They left the sums out on purpose.
>
> **Explorer:** So it's a lock.
>
> **Fez:** It's a lock.

Same instruction, one line shorter, and it ends on the sentence that reframes the entire game. _"Good
luck!"_ ends on nothing.

## Revisiting is not only rewriting

Three different fates, and the audit has to decide which per key rather than reflowing all 37:

- **Rewrite as a two-hander** — the ones that teach something true and are worth keeping (`pyramidIntro`,
  `tombTutorial`, `mapPiece`).
- **Rewrite as character** — the ones that are pure chrome and could carry an opinion instead
  (`levelCompleted` is _"Well done!"_; `tombLoot` is _"Wow, our first treasure! Well done!"_).
- **Delete** — the ones a wordless first instance would replace outright, and the one whose key and copy
  disagree.

## The honest boundary

**Rewriting this copy makes the copy better. It does not make the game wordless.** The review's actual
complaint, and `onboarding.md`'s own "not yet built", is a self-teaching first instance per family — nine
of them queued. A better-written wall of prose is still a wall of prose, and doing this must not be allowed
to look like having done that.

What it does buy: the game stops having two voices in it, and the explorer stops being a character who
appears in Act I of the story and is absent from the first ten minutes of the game.

## Why now rather than later

37 source lines. The game is headed for most European languages, so this is the cheapest these lines will
ever be to change — after localisation the same work is 37 × a dozen, plus the coordination. Pre-explorer
copy is a debt that accrues in translators.

## Open

1. **Per key: rewrite, recharacterise, or delete?** 37 decisions, and most are quick.
2. **Does the explorer appear in the very first conversation?** `welcome` is the game's first screen. If
   they are a character, they should be in it — but that is also the most-read copy in the product and the
   riskiest to change.
3. **Does this wait for the wordless first instances**, so a key is not rewritten and then deleted? Or go
   first, since those are nine mechanics away and the copy is wrong today?
