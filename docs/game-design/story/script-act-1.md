# Act I — starter · you cannot read it yet

Source copy, English only. Translation is a separate production step and adapts freely (`FORMAT.md` §
"Counting copy"); nothing here is load-bearing for a board.

**Voice.** Spoken, not narrated — the house style in `FORMAT.md` § "Every line is spoken, not narrated":
feeling first, spoken language, and always said TO something. See it, react to it, then teach one true
thing. The travel-card blurbs are marketing prose and are not the model.

**The pairing.** Fez is loud and commercial; the explorer says less, and says it about the place. Per FORMAT §5
the explorer carries no pronoun, no name and no gendered self-description — every line below is present
tense, a question, or about the world rather than about themselves.

76 source lines, the tutorial keys not counted.

---

## The opening — the explorer alone

`welcome*` on the travel screen, then `pyramidIntro*` on the first exterior board. Fez is not met yet, so
both are the explorer's (`asExplorer` in `Fez.tsx`).

> **Explorer:** Egypt! I'm really here.
>
> **Explorer:** And this map… I paid way too much for it. It had better be right.
>
> **Explorer:** Come on. Let's see where that cross is.

`pyramidIntro` — the one board that does not show its own rule, so the line carries the rule whole:

> **Explorer:** There are numbers on these stones. And some are missing…
>
> **Explorer:** Wait. Every stone is the two below it, added up! Yes — here too!

## `starter_1` — Dawn at the Sphinx · the hook

`story.arrival.starter_1.*` — arrival rail, assumes nothing. The explorer is still alone. **The whole ending is set up here**, and the
player must not know that.

The exterior shows the pyramid up close and the Sphinx small on the horizon behind it, so the explorer looks
back at it, and knows the writing only by hearsay.

> **Explorer (pointUp):** Look, back there! The Sphinx!
>
> **Explorer:** Huge, even from here.
>
> **Explorer:** They say there's writing under its paws. That nobody can read.
>
> **Explorer (pointUp):** Later. This pyramid first!

## `starter_1` — the meeting, floor 0

`story.meeting.starter_1.*` — the last room of floor 0's main corridor, a voice before a face. It plants
the map they both overpaid for, the fez nobody explains, and Fez knowing what the Sphinx looked like.

> **Voice:** Hey! Not thére! Watch where you're going!
>
> **Explorer:** Sorry! I can't see a thing! Where are you?
>
> **Fez:** Down here! You're standing in my stock!
>
> **Explorer:** A lizard?! In a fez?
>
> **Fez:** A merchant. And what's wrong with my fez?
>
> **Fez:** You're here for the pyramid too, I bet. Bought a map? Paid far too much?
>
> **Explorer:** Wáy too much.
>
> **Fez:** Me too. Pff.
>
> **Explorer:** The writing on the Sphinx… can you read it?
>
> **Fez:** No. Nobody can, any more. That base was blue and gold once, you know.
>
> **Explorer:** How do you know that?
>
> **Fez:** …Heard it. So, what are you after down here?
>
> **Explorer:** Something neat.
>
> **Fez (pointUp):** Neat sells! You know what? I'm coming with you!
>
> **Explorer:** What? With me?
>
> **Fez (pointUp):** Two see more than one. Come on, that pyramid's waiting!

**Fez joins on screen, not in passing**: he says he is coming, the explorer is surprised, he gives a reason. Everything after this has two of them in it, so the moment it starts has to be one the player sees.

**Fez knows too much about the Sphinx** — the first of one tell an act (`cast.md`). It reads as a
merchant showing off, and it is not.

After the meeting the tutorials are his: `levelCompleted`, `mapPiece*`, `pyramidBlockedBlocks*`,
`tombIntro*` and `tombTutorial*` — in the same voice, and the ones that carry a rule say all of it.

## `starter_2` — Papyrus Merchant's Route · the paper trail

`story.arrival.starter_2.*`

> **Fez (pointUp):** Ha! Finally, something I understand. Everything that went up the Nile came past here first.
>
> **Fez:** And merchants write everything down. Who bought what, who owed who, who was late…
>
> **Explorer:** Who was late?
>
> **Fez (pointUp):** Especially who was late!
>
> **Fez (pointUp):** Three thousand years. The goods are gone, and the receipts are still here. Typical!

## `starter_3` — Temple of Bastet · the door

`story.arrival.starter_3.*`

The mosaic's own Bastet lines already do the cat (`fez.json` `mosaicStarter`), so this does the **door** —
which is the ward gates the player is about to start meeting.

> **Fez (pointUp):** Look at those doors! People came here to ask for protection. And then a door like that stayed shut.
>
> **Explorer:** Shut to who?
>
> **Fez:** Anyone who didn't ask nicely. Us, mainly.
>
> **Fez:** Everything sealed in this country, somebody sealed it and meant it. Really meant it.
>
> **Fez (pointUp):** And the cats! They adored cats here. Just couldn't keep their hands off them.

**The error is planted here** (`cast.md`, "one thing he is wrong about per tier"). He is confident, he is
charming, and he is wrong about why. Ipi puts him right two journeys later, and `mosaicStarter` — already
shipped — has him explaining it correctly at the end of the tier, which is now something he learned rather
than something he knew.

## `starter_4` — Scribe's Academy · signs, and the hook paid forward

`story.arrival.starter_4.*`

> **Fez (pointUp):** Oh, I like this one. This is where they learned to write! Sign by sign, on broken pots — papyrus was far too dear for children.
>
> **Explorer:** They practised on rubbish?
>
> **Fez (pointUp):** On whatever there was! And learn enough of these, and suddenly a wall isn't decoration any more.
>
> **Explorer:** That Sphinx… I want another look at it.
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

> **Ipi:** Hey! Hands off! That's my jar!
>
> **Fez:** …Did that jar just say something?!
>
> **Ipi:** That was me. Third shelf, the one with the chip. That one's mine.
>
> **Explorer:** Okay, okay! It stays put. Who are you?
>
> **Ipi:** Ipi. Forty years I kept the books. Forty!
>
> **Fez:** Books? Whose?
>
> **Ipi:** Everyone's! Who owed what, down to the last sack of grain.
>
> **Ipi:** That Henut, up north from here? Eleven deben of lapis. Never paid!
>
> **Explorer:** And you still remember that, after all this time?
>
> **Ipi:** It's written down! A thing written down is a thing that happened.
>
> **Ipi:** Only those Horis… Hori the boatman, Hori the baker… and that other Hori.
>
> **Fez (pointUp):** Did you have cats too? Everyone had cats, didn't they? Sweet little things!
>
> **Ipi:** Sweet? They were for the grain! Do you know what one rat costs you, over a whole season?
>
> **Fez:** …Oh. Right.
>
> **Ipi:** Tell Henut that Ipi sent you. That'll spoil her afternoon.
>
> **Fez (pointUp):** I like him!
>
> **Explorer:** You just like that he's still owed money.

**Ipi teaches the ending.** _"A thing written down is a thing that happened"_ is the belief the finale
stands on (`what-the-player-knows.md`), said four acts early by a bookkeeper for whom it is not a belief
at all but a professional fact. The explorer quotes it back at the Sphinx.

**He names her, and that is the point of him.** _That Henut? Eleven deben of lapis. Never paid!_ — the name
and the debt, from memory, three thousand years on, because it is written down. It pays off in Act II, where the tomb
wall she paid for gets her name wrong and his ledger does not.

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
> **Fez:** I'd have taken a week.

**On leaving the first tomb, after Ipi:**

> **Fez:** Just so we're clear. I'm in this for the resale. I'm saying it now, while it's still true.
>
> **Explorer:** Noted.

_"Noted."_ is the whole bond in one word: they heard him, they are not arguing, and it is on the record for
Act V to come back to.

---

## What this draft commits to, so it can be argued with

**The hook is the arrival's four lines and the meeting's five, and never mentioned again until Act V.** No quest marker, no "remember this". If a
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
2. **Is "Somebody could, once." too wistful for the meeting?** The alternative is ending on
   _"No. Nobody can, any more."_ and letting the hook be pure absence.
3. ~~**Should Ipi name the noblewoman?**~~ **Decided: he does.** A man whose accounts are that good knows
   the name, and withholding it would contradict the only thing he is characterised by. It also sets up
   Act II — he has her name right and her own wall does not.
4. **How rare is rare, for the reaction rail?** One beat per tier may be too thin to read as a
   relationship; one per journey is twenty and becomes commentary.
5. **Does Fez react to failure as well as success?** A wrong claim is the moment a companion is most useful
   and most annoying. Nothing about spending a hint, though — that is already tracked and already said back
   on the solved banner, and he would be piling on.
