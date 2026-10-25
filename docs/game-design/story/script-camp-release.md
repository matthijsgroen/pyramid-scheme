# Script — the camp release

The story lines the camp release adds, in the order the player meets them: the tombs (cave, pillar,
cavern), the camp, structures and finds, and the animals. Ids are the `fez.json` keys; a line plays as
`<id>.<n>.<speaker>` (FORMAT.md §5), and an expression in the prefix is set in `src/app/fez/storyPoses.ts`.

**Voice.** Spoken from the character's feeling, in everyday Dutch first and English adapted beneath it, always
to somebody; the explorer speaks only where it helps, never with a pronoun, a name or a gendered word.

**Status: draft — awaits the designer.**

## Tombs

Three beats a tomb, none of them ahead of the tomb's ghost scene (which plays later, on the cavern's
floors), and none repeating `tombIntro` or `exitPillar`:

- **cave** — the cave mouth, level 1's exterior: the first moment in a hill's dark mouth.
- **pillar** — the cave's exit pillar: daylight at the end of the cave.
- **cavern** — the cavern's exterior, level 2: the sunlit hole with the pyramid standing in it.

### `starter_treasure_tomb` — Forgotten Merchant's Cache

Before Ipi, and the first tomb: `tombIntro` ("There! The hidden tomb!") plays just before the cave line, so the cave opens on the surprise that the tomb is a hill. Leans on the map hint's cellar door. Starter cave locks are levers and doors.

#### `cave.starter_treasure_tomb`

fires: Forgotten Merchant's Cache — entering the cave

> **Fez (pointUp):** Een grot! Op de kaart stond een kelderdeur, en dit is een hele heuvel!
> _en:_ A cave! The map showed a cellar door, and this is a whole hill!
>
> **Fez:** Slimme vent. Je voorraad in een heuvel verstoppen, daar komt geen dief op.
> _en:_ Clever fellow. Hide your stock inside a hill — no thief would think of that.
>
> **Explorer (deadpan):** Wij wel.
> _en:_ We did.
>
> **Fez (sheepish):** Wij zijn geen dieven. Wij zijn klanten. Héle late klanten.
> _en:_ We're not thieves. We're customers. Very late customers.

#### `pillar.starter_treasure_tomb`

fires: Forgotten Merchant's Cache — reaching the pillar

> **Fez (pointUp):** Al die hendels en deuren, voor één kelder!
> _en:_ All those levers and doors, for one cellar!
>
> **Fez:** Dan ligt er wat goeds, hoor. Niemand doet zoveel moeite voor rommel.
> _en:_ Then there's something good down there. Nobody goes to that much trouble over rubbish.

#### `cavern.starter_treasure_tomb`

fires: Forgotten Merchant's Cache — arriving at the cavern

> **Fez (surprised):** Kijk dan! Een piramide, onder de grond! Voor een handelaar!
> _en:_ Look at that! A pyramid, underground! For a merchant!
>
> **Fez (pointUp):** Die heeft óf heel goed verdiend, óf heel goed afgedongen.
> _en:_ He either earned very well, or haggled very well.

### `junior_treasure_tomb` — Noble's Hidden Vault

Before Henut's scene. Leans on Ipi's "Eleven deben of lapis. Never paid!" (tomb.starter, heard before `starter_a_1` unlocks junior). Fez betting the gold is real sits under Henut's "It was glass" without giving it away.

#### `cave.junior_treasure_tomb`

fires: Noble's Hidden Vault — entering the cave

> **Fez (pointUp):** Hier moet het zijn. Henut! Die van de elf deben lapis!
> _en:_ This must be it. Henut! Eleven deben of lapis, that one!
>
> **Fez:** Wat denk je, mogen we een procentje houden als we het innen?
> _en:_ What do you reckon — do we get a cut if we collect?
>
> **Explorer (deadpan):** Je hebt nog niks geïnd.
> _en:_ You haven't collected anything.
>
> **Fez:** Ik reken alvast.
> _en:_ I like to work it out early.

#### `pillar.junior_treasure_tomb`

fires: Noble's Hidden Vault — reaching the pillar

> **Fez (worried):** Pff. Die deuren waren heel wat lastiger dan bij Ipi.
> _en:_ Phew. Those doors were a lot fussier than Ipi's.
>
> **Fez:** Tja. Mevrouw had natuurlijk geld.
> _en:_ Well. Madam had money, of course.

#### `cavern.junior_treasure_tomb`

fires: Noble's Hidden Vault — arriving at the cavern

> **Fez (pointUp):** Kijk die punt eens glimmen in de zon! Echt goud, wedden?
> _en:_ Look at the tip shining in the sun! Real gold, I bet.
>
> **Explorer:** In een gat in de grond. Voor wie glimt dat dan?
> _en:_ Down a hole in the ground. Who's it shining for?
>
> **Fez:** Voor haar. Zo'n type is het, dat zie je zo.
> _en:_ Her. You can tell the type.

### `expert_treasure_tomb` — High Priest's Treasury

Before the priest's scene. Leans on Henut's introduction ("a priest … He will be insufferable about it"), heard on her floor 1 before `junior_a_1` unlocks expert. Fez deferring ("What do you think?") is Act III's bond note. Flowers foreshadow the offering without naming it.

#### `cave.expert_treasure_tomb`

fires: High Priest's Treasury — entering the cave

> **Fez:** Dus hier zit die priester van Henut. Onuitstaanbaar, zei ze.
> _en:_ So this is where Henut's priest is. Insufferable, she said.
>
> **Fez (worried):** Wat denk jij, moeten we iets meenemen? Bloemen?
> _en:_ What do you think, should we bring something? Flowers?
>
> **Explorer (deadpan):** Hij is dood.
> _en:_ He's dead.
>
> **Fez:** Juist daarom. Je wilt toch een goeie eerste indruk maken.
> _en:_ All the more reason. You want to make a good first impression.

#### `pillar.expert_treasure_tomb`

fires: High Priest's Treasury — reaching the pillar

> **Fez (worried):** Hè hè, eindelijk! Die grot wilde ons er echt niet in hebben.
> _en:_ Phew, at last! That cave really did not want us in.
>
> **Explorer (deadpan):** Dat was ook de bedoeling, denk ik.
> _en:_ I think that was the idea.

#### `cavern.expert_treasure_tomb`

fires: High Priest's Treasury — arriving at the cavern

> **Fez (worried):** Hm. Mag je eigenlijk iets verkopen wat al van een god is?
> _en:_ Hm. Are you actually allowed to sell something that already belongs to a god?
>
> **Explorer:** Vraag het de god.
> _en:_ Ask the god.
>
> **Fez (sheepish):** Liever niet.
> _en:_ I'd rather not.

### `expert_treasure_tomb_b` — Inner Sanctum

Reached only with `expert_a_2`, so the priest's scene has been heard: the cavern line quotes his "It would be unprofessional." Nothing says the room is untouched — that is the expertB scene's own discovery.

#### `cave.expert_treasure_tomb_b`

fires: Inner Sanctum — entering the cave

> **Fez (pointUp):** Hier mocht alleen de hogepriester naar binnen. En nu wij!
> _en:_ Only the high priest was allowed in here. And now us!
>
> **Explorer:** Mogen wij dat?
> _en:_ Are we allowed?
>
> **Fez:** Er staat niemand bij de deur om nee te zeggen.
> _en:_ There's nobody on the door to say no.

#### `pillar.expert_treasure_tomb_b`

fires: Inner Sanctum — reaching the pillar

> **Fez (worried):** Psst… Waarom fluister ik eigenlijk?
> _en:_ Psst… why am I whispering?
>
> **Explorer:** Geen idee. Ik doe het ook.
> _en:_ No idea. I'm doing it too.

#### `cavern.expert_treasure_tomb_b`

fires: Inner Sanctum — arriving at the cavern

> **Fez (worried):** Zou die priester weten dat we hier rondlopen?
> _en:_ Do you think that priest knows we're wandering about in here?
>
> **Explorer (deadpan):** Hij houdt niks bij. Dat zou onprofessioneel zijn.
> _en:_ He doesn't keep count. It would be unprofessional.

### `master_treasure_tomb` — Pharaoh's Secret Hoard

Before the pharaoh's scene. Act IV's bond note: Fez worried, wants to leave, goes in anyway. Nothing about the seal being taken or copied — that is the pharaoh's to say.

#### `cave.master_treasure_tomb`

fires: Pharaoh's Secret Hoard — entering the cave

> **Fez (worried):** Kijk, hier houdt de kaart gewoon op. Zand, en dan niks meer.
> _en:_ Look, the map just stops here. Sand, and then nothing.
>
> **Explorer:** Dan zitten we goed.
> _en:_ Then we're in the right place.
>
> **Fez (worried):** Dat bedoel ik nou. Daar word ik juist zenuwachtig van.
> _en:_ That's what I mean. That's exactly what makes me nervous.

#### `pillar.master_treasure_tomb`

fires: Pharaoh's Secret Hoard — reaching the pillar

> **Fez (worried):** Pfoe. Mijn staart trilt nog van die laatste deur.
> _en:_ Whew. My tail's still shaking from that last door.
>
> **Fez:** Een koning die z'n spullen zó opbergt… die wil ze echt niet kwijt.
> _en:_ A king who locks his things away like that… he really doesn't want to lose them.

#### `cavern.master_treasure_tomb`

fires: Pharaoh's Secret Hoard — arriving at the cavern

> **Fez (pointUp):** Kijk hem staan, helemaal alleen in de zon. Mooi, hè?
> _en:_ Look at it, all alone in the sun. Lovely, isn't it?
>
> **Fez (worried):** Zullen we gewoon een tekening maken en weer gaan?
> _en:_ Shall we just do a drawing and go?
>
> **Explorer (deadpan):** Je kunt niet tekenen.
> _en:_ You can't draw.
>
> **Fez (sheepish):** …Nee. Naar binnen dan maar.
> _en:_ …No. In we go, then.

### `master_treasure_tomb_b` — Hall of Osiris

No ghost here. Reached only with `master_a_2`, so the pharaoh's Osiris correction has been heard: Fez repeats it as though he always knew (cast.md: he takes a correction well and repeats it later as his own).

#### `cave.master_treasure_tomb_b`

fires: Hall of Osiris — entering the cave

> **Fez (pointUp):** De hal van Osiris! Groen, natuurlijk. Omdat hij elk jaar terugkomt, net als het graan.
> _en:_ The hall of Osiris! Green, of course. Because he comes back every year, like the grain.
>
> **Explorer (deadpan):** Dat wist je altijd al.
> _en:_ You always knew that.
>
> **Fez (glassesPoint):** Altijd al.
> _en:_ Always.

#### `pillar.master_treasure_tomb_b`

fires: Hall of Osiris — reaching the pillar

> **Fez:** Zie je wel. Zit je maar lang genoeg onder de grond, dan kom je vanzelf weer boven.
> _en:_ See? Stay under the ground long enough, and up you come again.
>
> **Explorer:** Is dat ook van Osiris?
> _en:_ Is that Osiris as well?
>
> **Fez (pointUp):** Nee, die is van mij.
> _en:_ No, that one's mine.

#### `cavern.master_treasure_tomb_b`

fires: Hall of Osiris — arriving at the cavern

> **Fez:** Wie daarin ligt, rekent erop dat hij terugkomt. Dat is hier de afspraak.
> _en:_ Whoever's in there is counting on coming back. That's the deal round here.
>
> **Explorer:** Hoe lang wacht hij al?
> _en:_ How long has he been waiting?
>
> **Fez (wistful):** Lang. Maar dat hoort bij het vak, hè. Dood zijn is vooral wachten.
> _en:_ A long time. Comes with the job, though. Being dead is mostly waiting.

### `wizard_treasure_tomb` — Vault of the Gods

Before the priest's rite. Says nothing of the seal or being announced — that is the scene's. The pillar line is the tier's look back: doors that once would have turned them round.

#### `cave.wizard_treasure_tomb`

fires: Vault of the Gods — entering the cave

> **Fez (pointUp):** De voorraadkamer van de goden! Wat sla je op als je al alles hebt?
> _en:_ The gods' own storeroom! What do you keep when you already have everything?
>
> **Explorer:** Wat mensen je brengen.
> _en:_ Whatever people bring you.
>
> **Fez (wistful):** …Ja. Dat zal het zijn.
> _en:_ …Yes. That'll be it.

#### `pillar.wizard_treasure_tomb`

fires: Vault of the Gods — reaching the pillar

> **Fez (surprised):** Zulke deuren… daar waren we vroeger gewoon voor omgedraaid.
> _en:_ Doors like those… once, we'd have just turned round.
>
> **Explorer (cool):** Nu niet meer.
> _en:_ Not any more.

#### `cavern.wizard_treasure_tomb`

fires: Vault of the Gods — arriving at the cavern

> **Explorer (surprised):** Wauw.
> _en:_ Wow.
>
> **Fez:** Ja.
> _en:_ Yes.
>
> **Fez (wistful):** Soms valt er gewoon niks meer bij te zeggen, hè.
> _en:_ Sometimes there's just nothing left to say, is there.

### `wizard_treasure_tomb_b` — Realm of Cosmic Forces

Before the predecessor's scene: nothing of the rope, the shaft or the notebook. The cave line laughs at the place's own grand name. Wizard caves are three floors; every tomb's sky is afternoon, which the cavern line leans on.

#### `cave.wizard_treasure_tomb_b`

fires: Realm of Cosmic Forces — entering the cave

> **Fez:** Rijk der Kosmische Krachten. Zo, zo.
> _en:_ Realm of Cosmic Forces. Well, well.
>
> **Fez (glassesPoint):** Als ik iets moest verkopen dat niks voorstelde, zou ik het ook zo noemen.
> _en:_ If I had something to sell that was nothing much, that's what I'd call it too.

#### `pillar.wizard_treasure_tomb_b`

fires: Realm of Cosmic Forces — reaching the pillar

> **Fez:** Drie verdiepingen grot, en dán pas de voordeur.
> _en:_ Three floors of cave, and only then the front door.
>
> **Explorer:** Dan is het vast de moeite waard.
> _en:_ Must be worth it, then.
>
> **Fez (sheepish):** Dat zeggen ze altijd. En dan is het een kruik.
> _en:_ That's what they always say. And then it's a jar.

#### `cavern.wizard_treasure_tomb_b`

fires: Realm of Cosmic Forces — arriving at the cavern

> **Fez (pointUp):** Zie je die vlek zon op de piramide? Daar kun je zo de tijd op aflezen.
> _en:_ See that patch of sun on the pyramid? You could tell the time by it.
>
> **Explorer:** Hoe laat is het dan?
> _en:_ What time is it, then?
>
> **Fez (sheepish):** …Middag. Zo ongeveer. Ik ben geen klok, hè.
> _en:_ …Afternoon. Roughly. I'm not a clock.

### `wizard_treasure_tomb_c` — Throne of Eternity

Reached only with `wizard_b_2`, after the predecessor. Nothing of the mural — the wizardC scene's "It has been a picture the whole time" is the reveal. The cave line plays the forty-two judges as a feeling, not the card's fact.

#### `cave.wizard_treasure_tomb_c`

fires: Throne of Eternity — entering the cave

> **Fez (worried):** Ik heb ineens het gevoel dat ik iets fout heb gedaan.
> _en:_ I've suddenly got this feeling I've done something wrong.
>
> **Explorer:** Wat dan?
> _en:_ Like what?
>
> **Fez (worried):** Weet ik niet. Dat is nou juist het ergste.
> _en:_ No idea. That's the worst part.

#### `pillar.wizard_treasure_tomb_c`

fires: Throne of Eternity — reaching the pillar

> **Fez:** Laatste stuk donker. Dat voel ik gewoon.
> _en:_ Last stretch of dark. I can feel it.
>
> **Explorer (deadpan):** Dat zei je bij de vorige ook.
> _en:_ You said that at the last one.
>
> **Fez (sheepish):** En toen had ik bijna gelijk.
> _en:_ And I was nearly right.

#### `cavern.wizard_treasure_tomb_c`

fires: Throne of Eternity — arriving at the cavern

> **Fez (pointUp):** Daar is hij. Alle lijnen op die kaart komen hier uit.
> _en:_ There it is. Every line on that map ends up here.
>
> **Explorer:** Dan is dit het eind.
> _en:_ Then this is the end.
>
> **Fez (wistful):** Van de kaart, ja. Raar. Ik dacht dat dat beter zou voelen.
> _en:_ Of the map, yes. Funny. I thought that would feel better.

## Camp

Home: the explorer and Fez together at their own fire, small and growing. Fez travels home with the explorer
and sells nothing here. These play at the camp after the coming-home screen is left, and a chapter line
when the new-chapter card is left (at the camp, or on the way out), so none repeats the card ("Er doemt een
nieuwe piramide op", "Kom op adem in het kamp"), the rest panel ("Uitgerust bij het vuur") or the coming-home
labels. Lighter than a tomb's: the player hears one of them on most homecomings early on. No line names a
find; one homecoming can offer `homeHaul` and `firstFind` both, and only one plays, so neither leans on the
other.

### `camp.firstHome`

fires: the camp — the first time it shows after Fez has been met; their first evening there together

> **Fez (surprised):** Is dít je kamp? Een vuurtje en een kist?
> _en:_ This is your camp? A fire and a chest?
>
> **Explorer:** Ons kamp.
> _en:_ Our camp.
>
> **Fez (sheepish):** Ons. Goed. Dan wil ik wel het plekje vlak bij het vuur.
> _en:_ Ours. Right. Then I'm having the spot by the fire.
>
> **Fez:** Ik ben nou eenmaal een hagedis. Als het mij uitkomt.
> _en:_ I am a lizard, after all. When it suits me.

Leans on the meeting ("Een hagedis?! Met een fez?" — "Een handelaar."): Fez only admits to being a lizard
when it gets him the warm spot. Names only the fire and the chest, which stand in the camp from the start.

### `camp.homeHaul`

fires: the camp — the first home showing after unpacking a haul with something in it

> **Fez (pointUp):** Uitpakken! Het mooiste stuk van de hele reis.
> _en:_ Unpacking! Best bit of the whole trip.
>
> **Explorer:** Mooier dan de piramide?
> _en:_ Better than the pyramid?
>
> **Fez:** Die piramide is niet van ons. Dit wel.
> _en:_ The pyramid isn't ours. This is.

Works for any haul, coins and mosaic pieces alone included.

### `camp.homeEmpty`

fires: the camp — the first home showing after coming home with nothing

> **Explorer:** Lege handen.
> _en:_ Empty-handed.
>
> **Fez:** Nou en? We hebben gelopen. Dat telt ook.
> _en:_ So? We walked. That counts too.
>
> **Explorer:** Waarvoor?
> _en:_ Towards what?
>
> **Fez (sheepish):** Voor mijn benen. Die zijn heel kort, hè.
> _en:_ My legs. They're very short, you know.

### `camp.rested`

fires: the camp — the first time a homecoming refilled a heart

> **Fez (worried):** Zo. Gaat het weer een beetje?
> _en:_ There. Feeling a bit better?
>
> **Explorer:** Het was maar een schrammetje.
> _en:_ It was only a scratch.
>
> **Fez (sheepish):** Ik heb niet eens gekeken. En toch moest ik even zitten.
> _en:_ I didn't even look. And I still had to sit down.

The rest panel already says the hearts are full, so the line is about the fright, not the healing.

### `camp.chapterJunior`

fires: leaving the junior new-chapter card (after Ipi's tomb)

> **Fez (pointUp):** Nou, dat hebben we mooi gedaan. Volgende!
> _en:_ Well, that went nicely. Next!
>
> **Explorer:** Zo makkelijk ging het niet.
> _en:_ It wasn't that easy.
>
> **Fez:** Achteraf wel. Achteraf gaat alles makkelijk.
> _en:_ It is now. Everything's easy afterwards.

The first step up: cocky and light. Says nothing about Henut, whom the junior tomb's cave introduces.

### `camp.chapterExpert`

fires: leaving the expert new-chapter card (after Henut's tomb)

> **Fez (worried):** Daar verderop zitten valstrikken. Echte, die bijten.
> _en:_ Out there they've got traps. Real ones. They bite.
>
> **Fez:** Raak je gewond? Dan lopen we gewoon terug. Thuis knap je wel weer op.
> _en:_ Get hurt? Then we just walk back. You'll mend at home.
>
> **Explorer:** En jij dan?
> _en:_ What about you?
>
> **Fez (sheepish):** Ik loop achter je. Daar is het veiliger.
> _en:_ I'll walk behind you. It's safer there.

Carries the sketch's trap line ("Hier liggen de eerste valstrikken — kom terug naar het kamp om op te
knappen"), which the card left out: Fez warns, because he knows these places. Works at the camp and on the
way out ("daar verderop", "thuis").

### `camp.chapterMaster`

fires: leaving the master new-chapter card (after the High Priest's tomb)

> **Fez:** Vier piramides, daarginds. Weet je nog, toen er maar één stond?
> _en:_ Four pyramids out there. Remember when there was just the one?
>
> **Explorer:** Zo lang is dat niet geleden.
> _en:_ That wasn't so long ago.
>
> **Fez (wistful):** Nee. Toch voelt het zo.
> _en:_ No. Feels it, though.

Quieter: the weight of how far they have come, before Act IV. Counts the horizon (one pyramid per chapter,
`camp.md` §4, four at master): if the horizon changes, the number goes.

### `camp.chapterWizard`

fires: leaving the wizard new-chapter card (after the Pharaoh's tomb)

> **Fez (surprised):** Moet je die laatste zien. Met een gouden punt!
> _en:_ Look at the last one. Golden tip and all!
>
> **Fez:** Die gaat ons wat kosten. De laatste kost altijd het meest.
> _en:_ That one'll cost us. The last one always does.
>
> **Explorer:** Wat dan?
> _en:_ Cost us what?
>
> **Fez (wistful):** …Weet ik eigenlijk niet meer.
> _en:_ …I'm not sure any more.

The top tier, the richest: Fez's merchant reflex reaching for a price and not finding one, without saying
what changed (that is `bond.wizard`'s). Leans on the golden capstone on the fifth pyramid (`camp.md` §4).

## Structures and finds

Each plays once, for whichever came first, so no line names a find or a structure. Both play at the camp on
the next home showing, where the thing stands.

### `camp.firstFind`

fires: the camp — the first home showing after the first camp find was brought home

> **Fez (pointUp):** Kijk eens, het staat er alsof het er altijd al stond!
> _en:_ Look at that — like it's always been there!
>
> **Fez (worried):** Ik krijg zin om er een prijskaartje aan te hangen.
> _en:_ I've got this itch to hang a price tag on it.
>
> **Explorer (deadpan):** Niet doen.
> _en:_ Don't.
>
> **Fez (sheepish):** Nee, nee. Thuis verkoop je niks. Dat weet ik heus.
> _en:_ No, no. You don't sell from home. I know that.

Says why Fez sells nothing in the camp, in his own mouth.

### `camp.structureDone`

fires: the camp — the first home showing after the first structure has all its parts

> **Fez (surprised):** Het is af! Alle stukjes zitten erin!
> _en:_ It's done! Every last bit's in!
>
> **Explorer:** Zelf gebouwd.
> _en:_ All our own work.
>
> **Fez (pointUp):** Nou ja. Ik heb vooral gewezen.
> _en:_ Well. I mostly pointed.

The last line is drawn in the pointing pose on purpose.

## Art list

Nothing wanted: every line above uses a pose and face already drawn.
