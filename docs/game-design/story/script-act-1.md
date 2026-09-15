# Act I — starter · you cannot read it yet

Source copy, English only. Translation is a separate production step and adapts freely (`FORMAT.md` §
"Counting copy"); nothing here is load-bearing for a board.

**Voice.** `fez.json`'s mosaic panel beats are the register this game already has — _"A cat in the doorway,
and a snake leaving in a hurry. That was worth a bowl of milk."_ See it, teach one true thing, land
lightly. The travel-card blurbs are marketing prose and are not the model.

**The pairing.** Fez is excitable and commercial; the explorer is dry and gets on with it. Per FORMAT §5
the explorer carries no pronoun, no name and no gendered self-description — every line below is present
tense, a question, or about the world rather than about themselves.

40 source lines.

---

## `starter_1` — Dawn at the Sphinx · the hook

`story.arrival.starter_1.*` — arrival rail, assumes nothing. **The whole ending is set up here**, and the
player must not know that.

> **Fez:** There's writing on it. Down at the base, where the sand keeps shifting off.
>
> **Explorer:** Can you read it?
>
> **Fez:** No. Can you?
>
> **Explorer:** No.
>
> **Fez:** Someone could, once.

## `starter_2` — Papyrus Merchant's Route · the paper trail

`story.arrival.starter_2.*`

> **Fez:** Now this I understand. Everything that ever went up the Nile came past here first.
>
> **Fez:** And merchants write it all down. Who bought what, who owed whom, who was late.
>
> **Explorer:** Who was late?
>
> **Fez:** Especially who was late.
>
> **Fez:** Three thousand years, and the receipts outlived the goods. Typical.

## `starter_3` — Temple of Bastet · the door

`story.arrival.starter_3.*`

The mosaic's own Bastet lines already do the cat (`fez.json` `mosaicStarter`), so this does the **door** —
which is the ward gates the player is about to start meeting.

> **Fez:** People came here to ask for protection, and protection meant a door that stays shut.
>
> **Explorer:** Shut to who?
>
> **Fez:** Anyone who didn't ask nicely. Us, mainly.
>
> **Fez:** Every sealed thing in this country was sealed by someone who meant it.
>
> **Fez:** And the cats! They kept cats here, you know. Adored them. Couldn't help themselves.

**The error is planted here** (`cast.md`, "one thing he is wrong about per tier"). He is confident, he is
charming, and he is wrong about why. Ipi puts him right two journeys later, and `mosaicStarter` — already
shipped — has him explaining it correctly at the end of the tier, which is now something he learned rather
than something he knew.

## `starter_4` — Scribe's Academy · signs, and the hook paid forward

`story.arrival.starter_4.*`

> **Fez:** This is where they were taught. Sign by sign, on broken pottery — papyrus was far too dear to
> waste on children.
>
> **Explorer:** They practised on rubbish?
>
> **Fez:** They practised on what there was. Learn enough of these and a wall stops being decoration.
>
> **Explorer:** I want another look at that Sphinx.
>
> **Fez:** Not yet. Soon.

**The callback belongs to the explorer, not to Fez.** They are the one who wants to go back, which makes
the ending theirs to arrive at — and Fez answering _"Soon"_ turns it into a promise the game keeps four
tiers later.

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
> **Explorer:** The jar said the third shelf.
>
> **Ipi:** I kept these accounts for forty years. I am not leaving them in that state.
>
> **Ipi:** You want to get on? Then there's a noblewoman north of here. Painted vault, very pleased with
> herself. She never paid for the lapis.
>
> **Ipi:** Tell her Ipi sent you. That should spoil her afternoon.
>
> **Fez:** He'd have had cats, a man like this. Everyone did. Charming animals.
>
> **Ipi:** I had four, and not one of them was charming. They were for the grain.
>
> **Ipi:** Do you know what a rat costs you, over a season? I do. To the sack.
>
> **Fez:** …Right.
>
> **Explorer:** He wrote that down too.
>
> **Ipi:** Of course I wrote it down.
>
> **Fez:** I like him.
>
> **Explorer:** You like that he's owed money.
>
> **Fez:** I like that he wrote it down.

**This is the act break and the first introduction** (main-path, "introductions"): the player leaves with a
name and a debt rather than with an instruction. It points at the Noble's Hidden Vault, whose treasure set
already contains a Lapis Lazuli Necklace — so the debt is collectable, and the game said so before the
player could know that.

---

## The bond with Fez

Part 3 §3.4 already decided his commercial arc: he prices the mosaic pieces, grows uneasy, and at the end
declines to name a price. That is not a separate thread from the friendship — **it is the friendship**,
because what he does with value is how he says what something means to him.

| Act | Where he stands            | What he says it through                                       |
| --- | -------------------------- | ------------------------------------------------------------- |
| I   | transactional, and says so | he states his reason out loud while it is still true          |
| II  | he notices how you work    | the first beat that is about the explorer, not about the loot |
| III | he defers                  | asks what they think before saying what he thinks             |
| IV  | he is worried              | wants to leave, stays anyway                                  |
| V   | he will not sell it        | the decided line — _"That's his record of us."_               |

That last line already says **us**. The middle three acts are what earns the word.

### The reaction rail still has a job

Dialogue cannot observe how somebody _plays_. A board solved without a hint is not something a character
can remark on having heard, and `PuzzleFamilyShell` already tracks it. So the reaction rail carries that
half — rarely, and remembering the last time.

**On the first board solved without a hint:**

> **Fez:** That was quick.
>
> **Explorer:** It was a door.
>
> **Fez:** I've walked with people who'd take a week over a door like that. Not naming names. Mostly me.

**On leaving the first tomb, after Ipi:**

> **Fez:** Right. I came for the resale. I'm saying it now, while it's still true.
>
> **Explorer:** Noted.

_"Noted."_ is the whole bond in one word: they heard him, they are not arguing, and it is on the record for
Act V to come back to.

---

## What this draft commits to, so it can be argued with

**The hook is five lines and never mentioned again until Act V.** No quest marker, no "remember this". If a
player does not carry it for four tiers on their own, the ending lands as a surprise rather than as a
return — which is a worse ending but not a broken one.

**Ipi answers.** He is a ghost, per FORMAT §2's rule, and the whole not-scary checklist is visible in six
lines. If the carving version wins instead, this scene loses the introduction and Act I ends on treasure
rather than on a name.

**Fez is the straight man in the tomb.** He gets the joke lines everywhere else; here he is the one who is
startled and the dead bookkeeper is the one being businesslike. That inversion is what keeps a ghost from
reading as a threat.

**Nothing teaches a mechanic.** `fez.json` already carries the tutorials, and putting rules in a story beat
is how a story becomes the thing players tap through (Part 2 §2.6).

## Open

1. **Does `starter_3` land too close to the mosaic's Bastet panel?** Both are about protection; this one is
   about doors and that one about cats, but they are twelve lines apart in a player's first hour.
2. **Is "Someone could, once." too wistful for the fifth line of the game?** The alternative is ending on
   _"No."_ and letting the hook be pure absence.
3. **Should Ipi name the noblewoman?** A name is warmer and one more thing to carry; "a noblewoman north of
   here" is cheaper and cannot contradict whatever the junior tomb turns out to be.
4. **How rare is rare, for the reaction rail?** One beat per tier may be too thin to read as a
   relationship; one per journey is twenty and becomes commentary.
5. **Does Fez react to failure as well as success?** A wrong claim is the moment a companion is most useful
   and most annoying. Nothing about spending a hint, though — that is already tracked and already said back
   on the solved banner, and he would be piling on.
