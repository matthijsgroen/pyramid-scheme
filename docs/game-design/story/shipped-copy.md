# The copy already in the game, and which of it predates the explorer

Two bodies of shipped text were written before there was a story: most of `fez.json`, and all 29 journey
descriptions. This audits both.

## Fez

`fez.json` holds 59 lines, and they were not written at the same time or for the same game.

| Body                                                                           | Keys | Written for                                                  |
| ------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------ |
| `mosaic*` — the five panel beats and the finale                                | 18   | the redesign. This is the voice everything else should match |
| `shop*` — the stall, first visit and after                                     | 4    | the redesign, and his commercial arc                         |
| everything else — `welcome*`, `pyramidIntro*`, `tombTutorial*`, `mapPiece*`, … | 37   | **before the explorer existed**                              |

The 22 are fine — and the 18 mosaic lines are now **the payoff of a running gag** rather than a lecture at
the end of a tier: Fez is wrong about that tier's god early on, the tomb ghost corrects him, and the panel
beat is him getting it right (`cast.md`). They do not want rewriting; they want setting up, two lines a
tier.
The 37 are one character explaining the game to nobody in particular, because when they
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

### Open — Fez

1. **Per key: rewrite, recharacterise, or delete?** 37 decisions, and most are quick.
2. **Does the explorer appear in the very first conversation?** `welcome` is the game's first screen. If
   they are a character, they should be in it — but that is also the most-read copy in the product and the
   riskiest to change.
3. **Does this wait for the wordless first instances**, so a key is not rewritten and then deleted? Or go
   first, since those are nine mechanics away and the copy is wrong today?

---

## Journey descriptions

`journeys.json` holds 29 names and 29 descriptions, and they split the same way `fez.json` does: **the
names are excellent and the descriptions predate everything.**

The names are the spine. Read in tier order they are a social ladder and an arc, and `starter_1` Dawn at
the Sphinx answers `wizard_2` Secrets of the Sphinx across the whole game (`main-path.md`). Nothing here
proposes touching them.

The descriptions are travel brochures. All 29 open with an imperative aimed at the player — Enter (5),
Explore (3), Follow, Venture, Ascend, Infiltrate, Breach — and they were written for a game with no
explorer in it, no Fez, and no story to be part of.

### Three things wrong with them, in order of how fixable they are

**They state the difficulty.** Nine of the 29 say it outright: _"A gentle introduction to the mysteries of
Egypt"_, _"A perfect introduction to treasure hunting"_, _"Master the ultimate mathematical mysteries"_.
This is the thing `puzzle-screens.md` §1.1 already decided against for room titles — a difficulty label
_inside_ the thing says it in the wrong place, and the tier is already authored onto every path so the
floor can show it while the player navigates. The travel card has the same problem one screen earlier.

**They are brochures rather than hooks.** The casual-mobile review put it exactly: _"Journey through the
fertile Nile Delta" is a brochure. "Something has got into this one" is a hook._ A description that sells
the location cannot also make the player curious about it.

**They address the player, not the explorer.** _"Begin your adventure"_ is a voice talking to whoever is
holding the phone, from before there was a character between them and the game.

### What a description is for now

The travel card is the only place the player chooses **where**, so the description's job is to make one of
four look more interesting than the other three. Three candidate shapes:

| Shape                      | Example                                                     | Consequence                                                                            |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **A rumour**               | _Something has got into this one._                          | Strongest hook; 29 of them is a lot of intrigue to pay off, and an unpaid rumour sours |
| **A fact about the place** | _The village where the copies were made._                   | Always payable, teaches, and quietly carries the act it belongs to                     |
| **Fez pitching it**        | _I know a man who came out of there with a very good year._ | In character, and he is the one who knows the country — but 29 lines of one voice      |

**The middle one is the safest and does the most work.** It never writes a cheque the floor has to cash, it
is true, and it lets each description carry its act: the junior four can all quietly be about copies and
craft without any of them announcing a theme.

### Where the descriptions and the story meet

Each of the 20 pyramid arrivals already has a beat written or planned (`main-path.md`). The description is
what the player reads **before** choosing; the arrival beat is what they hear **on getting there**. They
should not say the same thing, and right now the description says nothing a beat could build on.

The obvious division: the card says what the place _is_, the arrival says what is _odd about it_.

### Cost

29 source lines, same as the rest — cheapest now, before a dozen locales exist. The names stay, so nothing
downstream of a name changes.

### Open — journeys

7. **Rumour, fact, or Fez?** And is it one shape for all 29 or a rumour only where an arc needs one?
8. **Do the tomb descriptions differ from the pyramid ones?** Nine tombs already carry a rank and a ghost;
   they may want to say less, not more.
9. **Does the difficulty go somewhere else, or nowhere?** The floor already shows it. The travel card may
   simply not need to say it — but a player picking between four unlocked journeys is choosing partly on
   effort, and nothing else on that screen tells them.
