# Act I — starter · you cannot read it yet

Source copy, English only. Translation is a separate production step and adapts freely (`FORMAT.md` §
"Counting copy"); nothing here is load-bearing for a board.

**Voice: the mosaic beats, not the travel-card blurbs.** `fez.json`'s panel lines are the register this
game already has — _"A cat in the doorway, and a snake leaving in a hurry. That was worth a bowl of milk."_
See it, teach one true thing, land lightly. Fez speaks in "we"; he is a companion, not a narrator.

24 source lines.

---

## `starter_1` — Dawn at the Sphinx · the hook

`story.arrival.starter_1.*` — arrival rail, assumes nothing. **The whole ending is set up here**, and the
player must not know that.

> **Fez:** There's writing on it. Down at the base, where the sand keeps shifting off.
>
> **Fez:** Can you read it? No. Me neither.
>
> **Fez:** Someone could, once.

## `starter_2` — Papyrus Merchant's Route · the paper trail

`story.arrival.starter_2.*`

> **Fez:** Now this I understand. Everything that ever went up the Nile came past here first.
>
> **Fez:** And merchants write it all down. Who bought what, who owed whom, who was late.
>
> **Fez:** Three thousand years, and the receipts outlived the goods. Typical.

## `starter_3` — Temple of Bastet · the door

`story.arrival.starter_3.*`

The mosaic's own Bastet lines already do the cat (`fez.json` `mosaicStarter`), so this does the **door** —
which is the ward gates the player is about to start meeting.

> **Fez:** People came here to ask for protection, and protection meant a door that stays shut.
>
> **Fez:** Every sealed thing in this country was sealed by someone who meant it.
>
> **Fez:** Which is going to be inconvenient for us. I'll be honest with you.

## `starter_4` — Scribe's Academy · signs, and the hook paid forward

`story.arrival.starter_4.*`

> **Fez:** This is where they were taught. Sign by sign, on broken pottery — papyrus was far too dear to
> waste on children.
>
> **Fez:** Learn enough of them and a wall stops being decoration.
>
> **Fez:** I'd like another look at that Sphinx. Not yet. Soon.

## `starter_treasure_tomb` — Forgotten Merchant's Cache · Ipi

`story.tomb.starter.*` — link rail, assumes nothing outside itself.

Ipi is **already there** when the player arrives, wants something entirely mundane, is never in the dark,
costs nothing, and does not mention being dead. The joke is status: he is the most organised person in the
room and the room is a hole in the ground.

> **Ipi:** Took your time. Third shelf, the jar with the chip out of it — that one's mine. The rest you may
> as well have.
>
> **Fez:** …Did the jar just say something?
>
> **Ipi:** I kept these accounts for forty years. I am not leaving them in that state.
>
> **Ipi:** You want to get on? Then there's a noblewoman north of here. Painted vault, very pleased with
> herself. She never paid for the lapis.
>
> **Ipi:** Tell her Ipi sent you. That should spoil her afternoon.
>
> **Fez:** I like him.

**This is the act break and the first introduction** (main-path, "introductions"): the player leaves with a
name and a debt rather than with an instruction. It points at the Noble's Hidden Vault, whose treasure set
already contains a Lapis Lazuli Necklace — so the debt is collectable, and the game said so before the
player could know that.

---

## What this draft commits to, so it can be argued with

**The hook is three lines and never mentioned again until Act V.** No quest marker, no "remember this". If
a player does not carry it for four tiers on their own, the ending lands as a surprise rather than as a
return — which is a worse ending but not a broken one.

**Ipi answers.** He is a ghost, per FORMAT §2's rule, and the whole not-scary checklist is visible in six
lines. If the carving version wins instead, this scene loses the introduction and Act I ends on treasure
rather than on a name.

**Fez is the straight man.** He gets the joke lines everywhere else; here he is the one who is startled and
the ghost is the one being businesslike. That inversion is what keeps the ghost from reading as a threat.

**Nothing teaches a mechanic.** `fez.json` already carries the tutorials, and putting rules in a story beat
is how a story becomes the thing players tap through (Part 2 §2.6).
---

## The bond with Fez, and why it needs its own rail

**The explorer never speaks.** P2 rules out the player producing language, and the portrait is the player —
so there is no dialogue to build a friendship out of. A bond here can only be carried one way: **Fez
reacting to what the player did.** Not to what they said, and not to where they are.

That is a fourth rail, and it is not in Part 4's three:

| Rail         | Fires on                                     | Ordered? |
| ------------ | -------------------------------------------- | -------- |
| **reaction** | a solve, a hint spent, a wrong claim, a find | no       |

The triggers already exist — `PuzzleFamilyShell` tracks `hintsUsed` and distinguishes a board solved
unaided, the claim knows a wrong answer, loot knows it was found. Nothing new has to be measured.

**It is also the rail most likely to ruin him.** A companion who speaks after every solve is the tooltip
with legs the review complained about. So: rare, escalating, and each one remembers the last. A handful per
tier, never two in a row, and silence is the default.

### His arc IS the bond, which is why it costs almost nothing

Part 3 §3.4 already decided his commercial arc: he prices the mosaic pieces, grows uneasy, and at the end
declines to name a price. That is not a separate thread from the friendship — **it is the friendship**,
because what he does with value is how he says what something means to him.

| Act | Where he stands            | What he says it through                                     |
| --- | -------------------------- | ----------------------------------------------------------- |
| I   | transactional, and says so | he is here for the resale, stated out loud while it is true |
| II  | he notices how you work    | the first reaction beat that is about you, not the loot     |
| III | he defers                  | asks what you think before saying what he thinks            |
| IV  | he is worried              | wants to leave, stays anyway                                |
| V   | he will not sell it        | the decided line — _"That's his record of us."_             |

That last line already says **us**. The middle three acts are what earns the word.

### Act I — two beats, and the second is a promise he will break

`story.bond.starter.*` — reaction rail.

**On the first board solved without a hint:**

> **Fez:** That was quick.
>
> **Fez:** I've walked with people who'd take a week over a door like that. Not naming names. Mostly me.

**On leaving the first tomb, after Ipi:**

> **Fez:** Right. I came for the resale. I'm saying it now, while it's still true.

The second is doing two jobs: it plants his stated reason where a child hears a joke and an adult hears a
flag, and it makes Act V's refusal a payoff rather than a change of heart.

## Open

0. **Does the explorer ever speak?** Nothing in Act I gives them a line, and the reaction rail
   was designed on that assumption. FORMAT §5 has the trade; it wants settling before Act II, which is
   where the bond is meant to start showing.
1. **Does `starter_3` land too close to the mosaic's Bastet panel?** Both are about protection; this one is
   about doors and that one about cats, but they are twelve lines apart in a player's first hour.
2. **Is "Someone could, once." too wistful for line three of the game?** The alternative is ending the
   beat on "Me neither" and letting the hook be pure absence.
3. **Should Ipi name the noblewoman?** A name is warmer and one more thing to carry; "a noblewoman north of
   here" is cheaper and cannot contradict whatever the junior tomb turns out to be.
4. **How rare is rare?** One reaction beat per tier is safe and may be too thin to read as a relationship;
   one per journey is 20 and starts to feel like commentary.
5. **Does he react to failure as well as success?** A wrong claim is the moment a companion is most useful
   and most annoying. Nothing about spending a hint, though — leaning on the hint button is already
   tracked and already said back on the solved banner, and he would be piling on.
