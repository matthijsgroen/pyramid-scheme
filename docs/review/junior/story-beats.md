# Junior: de verhaalbeats om te lezen

Leesgids voor de junior-release. Gemaakt op 10-11-2026, op branch `art/junior-art`. Verhaalcode en
locales zijn gelijk aan `origin/main`.

Junior is Akte II: "hoe echt eruitziet". De speler heeft een hele tier lang imitaties in handen, en niemand
zegt dat het imitaties zijn. Het lezen van tekens levert voor het eerst iets op.

Bronnen: `script-act-2.md`, `script-camp-release.md`, `public/locales/{en,nl}/fez.json`,
`src/worldGen/spec/junior.ts`, `src/mods/story/`.

Status:

- **Bedraad**: geschreven, en het spel speelt het af.
- **Bedraad, maar niet haalbaar**: de code is er, maar een junior-speler komt er niet.
- **Geschreven, niet bedraad**: tekst staat in `fez.json`, maar niets speelt hem af.
- **Alleen gepland**: staat in de docs, maar er is nog geen tekst.

---

## 1. Alle beats in junior, in speelvolgorde

### 1.1 `camp.chapterJunior`: het nieuwe hoofdstuk

- **Waar:** in het kamp, als je de kaart "nieuw hoofdstuk" voor junior sluit (dus na Ipi's graf).
  Trigger `chapterOpened` vanuit `NewChapter.tsx`.
- **Wie:** Fez en de verkenner.
- **Status:** bedraad.

| #   | Wie       | EN                                       | NL                                           |
| --- | --------- | ---------------------------------------- | -------------------------------------------- |
| 1   | Fez       | Well, that went nicely. Next!            | Nou, dat hebben we mooi gedaan. Volgende!    |
| 2   | Verkenner | It wasn't that easy.                     | Zo makkelijk ging het niet.                  |
| 3   | Fez       | It is now. Everything's easy afterwards. | Achteraf wel. Achteraf gaat alles makkelijk. |

### 1.2 De vier aankomsten

Elke aankomst speelt bij de buitenkant van de **eerste piramide die je in die reis opent**. Dat is vóór
`pyramidIntro`, en maar één keer per reis. De sleutel is `arrival.<journeyId>` en hij wordt gekozen in
`useExpeditionIntro.ts` (`JOURNEYS_WITH_ARRIVAL`).

#### `arrival.junior_1`: Heilige Ibis Migratie

**Status:** bedraad.

| #   | Wie       | EN                                                                                          | NL                                                                                  |
| --- | --------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Fez       | They came back every year with the flood, near enough to the day.                           | Ze kwamen elk jaar terug met het hoogwater, bijna op de dag af.                     |
| 2   | Fez       | So people started counting the days between. That is where the calendar comes from — birds. | Dus gingen mensen de dagen ertussen tellen. Daar komt de kalender vandaan — vogels. |
| 3   | Verkenner | Birds.                                                                                      | Vogels.                                                                             |
| 4   | Fez       | Birds and paperwork. It is always birds and paperwork.                                      | Vogels en papierwerk. Het is altijd vogels en papierwerk.                           |

#### `arrival.junior_2`: Vallei van de Ambachtslieden ("de stille")

**Status:** bedraad.

| #   | Wie       | EN                                                                                       | NL                                                                                                              |
| --- | --------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Fez       | This is where they made it all. Not the tombs — the things that went in them.            | Hier maakten ze het allemaal. Niet de graven — de spullen die erin gingen.                                      |
| 2   | Fez       | Look at the moulds. Same bracelet, forty times.                                          | Kijk naar de mallen. Dezelfde armband, veertig keer.                                                            |
| 3   | Verkenner | For forty people?                                                                        | Voor veertig mensen?                                                                                            |
| 4   | Fez       | For anyone who could pay. A noble wanted what a king had, at a price a noble could bear. | Voor iedereen die kon betalen. Een edelman wilde wat een koning had, voor een prijs die een edelman kon dragen. |

#### `arrival.junior_3`: Tempel van Thoth (Fez vergist zich)

**Status:** bedraad.

| #   | Wie       | EN                                                                    | NL                                                                 |
| --- | --------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Fez       | Thoth, this one. God of secrets and magic, I am fairly sure.          | Thoth, deze. God van geheimen en magie, vrij zeker.                |
| 2   | Verkenner | Fairly.                                                               | Vrij.                                                              |
| 3   | Fez       | Ninety per cent. Anyway — the signs you have been collecting are his. | Negentig procent. Enfin — de tekens die je verzamelt zijn van hem. |

#### `arrival.junior_4`: Vuurtoren van Alexandrië

**Status:** bedraad.

| #   | Wie       | EN                                                                                     | NL                                                                                          |
| --- | --------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | Fez       | Three hundred feet of it, and a fire at the top that never went out.                   | Ruim negentig meter hoog, en bovenin een vuur dat nooit uitging.                            |
| 2   | Fez       | Sailors could find the coast from a day away. Before that they found it by hitting it. | Zeelui vonden de kust van een dagreis ver. Daarvoor vonden ze hem door ertegenaan te varen. |
| 3   | Verkenner | How do you find anything out here without one?                                         | Hoe vind je hier iets zonder zoiets?                                                        |
| 4   | Fez       | You ask someone who has been. That is my entire profession.                            | Je vraagt het aan iemand die er geweest is. Dat is mijn hele vak.                           |

### 1.3 `bond.junior`: Fez merkt hoe je speelt

- **Waar:** op het reactiespoor (`beatFor.ts`), bij het **eerste bord op junior-niveau dat je zonder hint
  oplost**. Het speelt één keer, ooit.
- **Wie:** Fez en de verkenner.
- **Status:** bedraad. Zie wel de kanttekeningen in §2.

| #   | Wie       | EN                                                       | NL                                                       |
| --- | --------- | -------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Fez       | You went quiet for a bit there.                          | Je was daar even stil.                                   |
| 2   | Verkenner | I was counting.                                          | Ik was aan het tellen.                                   |
| 3   | Fez       | I know. I have seen people guess. That was not guessing. | Weet ik. Ik heb mensen zien gokken. Dat was geen gokken. |

### 1.4 Het graf van Henut (`junior_treasure_tomb`, Edelvrouwgraf)

Zo is het graf gebouwd: eerst een grot (niveau 1, één verdieping met drie puzzels), dan het graf zelf
(niveau 2, zes verdiepingen). Alle verhaalbeats in het graf zitten op niveau 2, **verdieping 1**:

| Kamer | Wat                    |
| ----- | ---------------------- |
| 1     | tableau                |
| 2     | expert-puzzel          |
| 3     | tableau                |
| 4     | tableau                |
| **5** | **gesprek: Henut**     |
| **6** | **lezen: Henuts muur** |
| 7     | krokodil               |

Op dezelfde verdieping zit ook Fez' kraam, in een zijpad.

#### `cave.junior_treasure_tomb`: bij de grotingang

- **Trigger:** `siteArrived` met de buitenkant `caveMouth`.
- **Status:** bedraad.

| #   | Wie       | EN                                                       | NL                                                           |
| --- | --------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Fez       | This must be it. Henut! Eleven deben of lapis, that one! | Hier moet het zijn. Henut! Die van de elf deben lapis!       |
| 2   | Fez       | What do you reckon — do we get a cut if we collect?      | Wat denk je, mogen we een procentje houden als we het innen? |
| 3   | Verkenner | You haven't collected anything.                          | Je hebt nog niks geïnd.                                      |
| 4   | Fez       | I like to work it out early.                             | Ik reken alvast.                                             |

#### `pillar.junior_treasure_tomb`: bij de pilaar, het einde van de grot

- **Trigger:** `exitReached` in de grot.
- **Status:** bedraad.

| #   | Wie | EN                                               | NL                                                   |
| --- | --- | ------------------------------------------------ | ---------------------------------------------------- |
| 1   | Fez | Phew. Those doors were a lot fussier than Ipi's. | Pff. Die deuren waren heel wat lastiger dan bij Ipi. |
| 2   | Fez | Well. Madam had money, of course.                | Tja. Mevrouw had natuurlijk geld.                    |

#### `cavern.junior_treasure_tomb`: bij de buitenkant van het graf, in de zonnige grot

- **Trigger:** `siteArrived` met de buitenkant `cavern`.
- **Status:** bedraad.

| #   | Wie       | EN                                                    | NL                                                       |
| --- | --------- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1   | Fez       | Look at the tip shining in the sun! Real gold, I bet. | Kijk die punt eens glimmen in de zon! Echt goud, wedden? |
| 2   | Verkenner | Down a hole in the ground. Who's it shining for?      | In een gat in de grond. Voor wie glimt dat dan?          |
| 3   | Fez       | Her. You can tell the type.                           | Voor haar. Zo'n type is het, dat zie je zo.              |

#### `shopFirstVisit` en `shopArrival`: Fez' eerste kraam (tutorial, geen verhaal)

Ipi's graf heeft geen kraam. Daarom is dit de **eerste kraam van het spel**. Deze tekst valt in de klasse
tutorial, dus de tutorial-schakelaar zet hem uit. Hij staat hier omdat je hem als speler hier tegenkomt.

| Sleutel         | EN                                                                                        | NL                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| shopFirstVisit  | Ah, here we are. My stall — I did say I was in this for the trade.                        | Ah, daar zijn we. Mijn kraam — ik zei toch dat ik voor de handel meega.                     |
| shopFirstVisit2 | Everything on this counter I carried out of somewhere. That one came from two tombs back. | Alles op deze toonbank heb ik ergens vandaan gedragen. Die daar komt van twee graven terug. |
| shopArrival2    | Rare finds cost the most, but I'll pay you for any trinkets you're carrying.              | Zeldzame vondsten kosten het meest, maar ik betaal je voor snuisterijen die je meedraagt.   |

Bij een volgend bezoek komen `shopArrival` + `shopArrival2`: "Ah, my stall! Let me lay out what I've
picked up along the way." / "Ah, mijn kraam! Even uitstallen wat ik onderweg heb opgepikt."

#### De ezel: vier dierbeats

Fez verkoopt de ezel in deze kraam (200 munten). De ezel opent de expert-tier (`PURCHASES` in
`src/mods/shop/game/purchases.ts`). Alle vier zijn **bedraad** (`animalBeats.ts`).

**`animal.forSale`.** Trigger: de kraam toont voor het eerst iets dat je kunt kopen (`stockShown`).

| #   | Wie       | EN                                            | NL                                                                 |
| --- | --------- | --------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Fez       | Look what's at the stall! I do transport now. | Kijk eens wat ik in de kraam heb! Vanaf nu verkoop ik ook vervoer. |
| 2   | Verkenner | It's chewing.                                 | Het staat te kauwen.                                               |
| 3   | Fez       | That's included in the price.                 | Dat zit bij de prijs in.                                           |

**`animal.blockedDonkey`.** Trigger: de reizenlijst toont de expert-poort, en je hebt nog geen ezel
(`gateShown`, `AllJourneysPage.tsx`). Dit kan dus al vóór het graf vallen. Daarom wijst Fez naar Henut.

| #   | Wie | EN                                                                   | NL                                                                  |
| --- | --- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Fez | We're not walking that far with all this stuff. That takes a donkey. | Zo ver lopen wij niet, met al die spullen. Daar hoort een ezel bij. |
| 2   | Fez | And guess who has one? Me. At my stall in Henut's vault.             | En wie heeft er eentje staan? Ik. In mijn kraam bij Henut.          |

**`animal.boughtDonkey`.** Trigger: je koopt de ezel.

| #   | Wie       | EN                                                    | NL                                                 |
| --- | --------- | ----------------------------------------------------- | -------------------------------------------------- |
| 1   | Fez       | Sold! One donkey. Stubborn, but he'll carry anything. | Verkocht! Eén ezel. Koppig, maar hij draagt alles. |
| 2   | Verkenner | So where is he?                                       | Waar is hij dan?                                   |
| 3   | Fez       | Already on his way home. He'd rather walk without us. | Al op weg naar huis. Hij loopt liever zonder ons.  |

**`animal.arrivesDonkey`.** Trigger: je komt thuis in het kamp en de ezel staat er (`homeShown`).

| #   | Wie       | EN                               | NL                                         |
| --- | --------- | -------------------------------- | ------------------------------------------ |
| 1   | Fez       | There he is! Got here before us. | Daar staat hij! Hij was er eerder dan wij. |
| 2   | Verkenner | Found the fire, too.             | Het vuur heeft hij ook al gevonden.        |
| 3   | Fez       | My spot. Well. He was first.     | Mijn plekje. Nou ja. Hij was eerst.        |

`animal.throughDonkey` ("He's willing." / "Hij wil wel.") speelt pas als je een expert-reis binnengaat.
Hij hoort dus bij expert.

#### `tomb.junior`: Henut (gesprekskamer 5)

- **Trigger:** je loopt de kamer in en de scène is nog niet gehoord. De scène wordt afgeleid in
  `sceneFor.ts`.
- **Wie:** Henut, de verkenner en Fez.
- **Status:** bedraad.

| #   | Wie       | EN                                                                                                       | NL                                                                                                            |
| --- | --------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Henut     | Finally. You will have come about the lapis. I assume Ipi is still going on about the lapis.             | Eindelijk. Je komt zeker over het lapis. Ipi zeurt er vast nog steeds over.                                   |
| 2   | Verkenner | He is.                                                                                                   | Dat klopt.                                                                                                    |
| 3   | Henut     | It was glass. Beautiful glass. He knew.                                                                  | Het was glas. Prachtig glas. Dat wist hij best.                                                               |
| 4   | Fez       | …Was the bracelet glass too?                                                                             | …Was die armband dan ook glas?                                                                                |
| 5   | Henut     | Everything here is the best imitation money could buy, young man, and I chose every piece of it myself.  | Alles hier is de beste imitatie die voor geld te krijgen was, jongeman, en ik heb elk stuk zelf uitgezocht.   |
| 6   | Henut     | Now. The wall. Third sign along — that is not my name. Some apprentice with a chisel and no supervision. | Zo. De muur. Het derde teken — dat is mijn naam niet. Een of andere leerling met een beitel en geen toezicht. |
| 7   | Henut     | You have been learning your signs. I can tell. Fix it.                                                   | Je hebt je tekens geleerd. Dat zie ik zo. Zet het recht.                                                      |

#### Henuts muur (leeskamer 6)

- **Wat:** een cartouche met vier tekens: cartouche, gier, **gans**, uil. Het derde teken is fout. Het juiste
  teken is de **uil** (`a12`). Zie `WALLS` in `walls.ts`.
- **Hoe:** de bak met tekens toont alleen hiëroglyfen die je helemaal af hebt. Zonder de uil zie je de
  `cannot`-tekst. Je loopt dan gewoon door; je kunt hier niet falen.
- **Status:** bedraad, **maar in junior niet haalbaar**. Zie §2.1.

| Sleutel (`common.json` → `story.wall.*`) | EN                                                                             | NL                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| wrong                                    | Somebody cut the third sign wrong. It has been wrong for three thousand years. | Iemand heeft het derde teken verkeerd gehakt. Al drieduizend jaar staat het er fout. |
| pick                                     | Put the right sign in its place.                                               | Zet het juiste teken op zijn plaats.                                                 |
| cannot                                   | You do not know the sign that belongs here. Not yet.                           | Je kent het teken dat hier hoort nog niet.                                           |
| fixed                                    | That is her name again.                                                        | Dat is haar naam weer.                                                               |

#### `tomb.juniorFixed`: als de muur hersteld is

- **Trigger:** je legt de uil op zijn plek (`wall.after`).
- **Status:** bedraad, **maar in junior niet haalbaar**. Zie §2.1.

| #   | Wie       | EN                                                                                                                                                                     | NL                                                                                                                                                                                                         |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Henut     | There. Now it will still be my name in a thousand years.                                                                                                               | Kijk. Nu is het over duizend jaar nog steeds mijn naam.                                                                                                                                                    |
| 2   | Verkenner | Ipi spelled it correctly.                                                                                                                                              | Ipi spelde hem goed.                                                                                                                                                                                       |
| 3   | Henut     | Ipi spelled everything correctly. It was his one redeeming feature.                                                                                                    | Ipi spelde alles goed. Dat was zijn enige verdienste.                                                                                                                                                      |
| 4   | Fez       | Does it matter, down here?                                                                                                                                             | Maakt het uit, hier beneden?                                                                                                                                                                               |
| 5   | Henut     | It is the only thing that does.                                                                                                                                        | Het is het enige wat uitmaakt.                                                                                                                                                                             |
| 6   | Fez       | She had a whole wall of Thoth up there. God of secrets.                                                                                                                | Ze had daarboven een hele muur vol Thoth. God van geheimen.                                                                                                                                                |
| 7   | Henut     | Thoth counts. Thoth writes down what you did and it stays written.                                                                                                     | Thoth telt. Thoth schrijft op wat je gedaan hebt, en het blijft staan.                                                                                                                                     |
| 8   | Henut     | Secrets are what people call arithmetic when they cannot do it.                                                                                                        | Geheimen is hoe mensen rekenen noemen als ze het zelf niet kunnen.                                                                                                                                         |
| 9   | Henut     | If you are going on — and you clearly are — there is a priest at Karnak who owes the dead a service he never performed. He will be insufferable about it. Priests are. | Als je verder trekt — en dat doe je duidelijk — dan is er een priester in Karnak die de doden een dienst schuldig is die hij nooit heeft verricht. Hij zal er onuitstaanbaar over doen. Priesters zijn zo. |
| 10  | Henut     | …Have we met?                                                                                                                                                          | …Kennen wij elkaar?                                                                                                                                                                                        |
| 11  | Fez       | I would remember.                                                                                                                                                      | Dat zou ik me herinneren.                                                                                                                                                                                  |
| 12  | Henut     | Yes. So would I.                                                                                                                                                       | Ja. Ik ook.                                                                                                                                                                                                |

#### Henut als je terugkomt (`revisit.junior.*`)

Loop je na de scène nog eens haar kamer in, dan zegt Henut één regel. Welke regel, hangt af van wat je al
gehoord hebt (`revisits.ts`).

| Toestand       | Sleutel | EN                                                              | NL                                                                         | In junior? |
| -------------- | ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| muur nog fout  | wall1   | The wall. Third sign. It is still not my name.                  | De muur. Het derde teken. Het is nog steeds mijn naam niet.                | **ja**     |
| muur nog fout  | wall2   | You are still here, and that goose is still on my wall. Fix it. | Jij bent er nog, en die gans staat nog steeds op mijn muur. Zet het recht. | **ja**     |
| na juniorFixed | priest1 | Still my name. I checked. Now — Karnak, the priest. Off you go. | Nog steeds mijn naam. Ik heb gekeken. En nu — Karnak, die priester. Hup.   | nee (uil)  |
| na juniorFixed | priest2 | Karnak! He has been waiting long enough. Go and be announced.   | Karnak! Hij wacht al lang genoeg. Ga je maar laten aankondigen.            | nee (uil)  |
| na tomb.expert | met1    | Well? Insufferable, wasn't he? I did say.                       | En? Onuitstaanbaar, hè? Ik zei het toch.                                   | nee        |
| na tomb.master | later1  | Glass, still. Still beautiful. Still chosen by me.              | Nog steeds glas. Nog steeds prachtig. Nog steeds door mij uitgezocht.      | nee        |

### 1.5 `mosaicJunior`: het junior-register van het mozaïek

- **Waar:** als het junior-register van het glas-in-loodraam vol is (`placementQueue.beatsEarnedBy`). Is het
  af, dan speelt de ℹ-tekst eronder hem opnieuw af.
- **Status:** bedraad. Het is een tutorial/mozaïekregel, maar het script noemt hem expliciet als de
  correctie op Fez' Thoth-fout. Hij kan pas na junior vallen, als je de stukken later pas compleet hebt.

| #   | Wie | EN                                                                                                            | NL                                                                                                                      |
| --- | --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Fez | Look at his hand — someone's showing him how to hold the pen.                                                 | Kijk naar zijn hand — iemand laat hem zien hoe je de pen vasthoudt.                                                     |
| 2   | Fez | The bird-headed one is Thoth. Writing, counting, keeping the records — all his.                               | Die met de vogelkop is Thoth. Schrijven, tellen, alles bijhouden — allemaal van hem.                                    |
| 3   | Fez | The ibis we followed up the river? That's his bird. Every number we've filled into a wall belongs to him too. | De ibis die we langs de rivier volgden? Dat is zijn vogel. Elk getal dat we in een muur hebben ingevuld is ook van hem. |

### 1.6 Gedeelde beats die je in junior óók kunt horen

Deze vallen meestal al in starter. Je hoort ze in junior alleen als ze nog niet gespeeld zijn.

- `discovery.hiddenCorridor`: een verborgen gang gaat open. "Whoa. That was a wall a second ago." /
  "Ho. Daar zat net nog een muur."
- `camp.firstHome`, `camp.homeHaul`, `camp.homeEmpty`, `camp.rested`, `camp.firstFind`,
  `camp.structureDone`: bij thuiskomst in het kamp.

### Telling

**18 bedraade beats spelen in junior**, en nog 2 tutorialregels voor de kraam:

- 4 aankomsten
- `camp.chapterJunior`
- `bond.junior`
- `cave`, `pillar` en `cavern` van het graf
- 4 ezelbeats
- `tomb.junior`
- de leesmuur
- `tomb.juniorFixed`
- revisit wall1/wall2
- `mosaicJunior`

Daarvan zijn er **2 niet haalbaar** voor een junior-speler: de muur afmaken en `tomb.juniorFixed`. Samen
met de priest-revisits zijn dat 12 + 2 regels.

---

## 2. Gaten

### 2.1 Henuts muur kan in junior niet worden hersteld (het grootste gat)

Het goede teken is de **uil (`a12`)**. In `TOMB_SYMBOLS` is de uil een **wizard**-teken. Hij heeft zes
stukken: één in `starter_1`, en vijf in `wizard_1`–`wizard_4`. Een junior-speler heeft hem dus nooit af.
De gans en de gier zijn expert-tekens, dus de speler kan maar één van de vier tekens lezen.

Gevolg:

- Henut zegt "Je hebt je tekens geleerd. Zet het recht." Dat lukt pas na ongeveer 40 uur spelen.
- Het **hele `tomb.juniorFixed` valt weg uit junior**. Dat zijn 12 regels: de beloning voor het lezen, de
  correctie van Fez' Thoth-fout, de introductie van de priester in Karnak, en "…Kennen wij elkaar?".
- Expert hangt hiervan af. `script-camp-release.md` zegt dat de grotregel van het expert-graf ("Dus hier
  zit die priester van Henut. Onuitstaanbaar, zei ze.") steunt op Henuts introductie, "heard on her
  floor 1 before `junior_a_1` unlocks expert". Die introductie hoort de speler nu niet.
- De Akte-II-taak "reading pays off for the first time" gebeurt in junior dus niet.

Twee uitwegen, aan jou om te kiezen:

- Kies een ander fout teken of een ander juist teken: een junior- of starter-teken uit `TOMB_SYMBOLS`.
  Dat is één regel in `walls.ts`. Met een andere vogel klopt "gans" in `revisit.junior.wall2` misschien
  niet meer.
- Of verplaats de priester-introductie naar `tomb.junior`, en laat het herstel echt een late beloning
  zijn.

### 2.2 `reading.junior` is geschreven, maar niet bedraad

Hier leest de speler voor het eerst een regel van de formule: "I gave bread to the hungry." /
"Ik gaf brood aan wie honger had." De tekst staat in `fez.json`: 4 regels, de verkenner en Fez.

Er is geen kamer en geen trigger. Volgens `IMPLEMENTATION.md` ("What is left") is hij "authored, and the
encounter exists; three tomb rooms to author". Het script wil dat hij speelt zodra de speler een hele regel
kan lezen. Die regel (`.4`) verwijst naar "het vorige" graf, dus naar Ipi's graf.

### 2.3 `bond.junior` wijkt af van het script

- Volgens het script speelt hij "on a board solved unaided **after a wrong claim earlier in the tier**".
  De code kijkt alleen naar het eerste bord op junior-niveau dat zonder hint is opgelost.
- Er zijn al junior-borden in starter. Een voorbeeld is `starter_2` piramide 1, verdieping 2, die op
  junior-niveau staat. Een starter-speler hoort deze beat dus **waarschijnlijk al vóór junior**. Speel het
  na om het te bevestigen.

### 2.4 Kaartteksten verklappen de beats

`review.md` Akte I heeft dit voor starter al opgelost: de kaart noemt de plek, de aankomst houdt de grap.
Voor junior is dat nog niet gedaan. Teksten uit `journeys.json`:

- `junior_1`: de kaart zegt al "when they come back, the flood is coming". Dat is aankomstregel 1.
- `junior_2`: de kaart zegt "made here first, in moulds". Dat is "Look at the moulds".
- `junior_3`: de kaart zegt "He invented writing, kept the records and did the counting". **Daarmee
  verbetert de kaart Fez' fout al vóór hij hem maakt**, en Henut heeft niets meer te verbeteren.
- `junior_4`: de kaart zegt "A fire at the top… sailors finding the coast a day's sail out". Dat zijn
  bijna letterlijk aankomstregels 1 en 2.
- `junior_treasure_tomb`: de kaart zegt "She bought the finest copies money could buy". Dat gaat in tegen
  de "quiet lesson" van Akte II (je merkt niet dat het imitaties zijn), en het verklapt Henuts "Het was
  glas".
- **Nederlands:** de graftitel is "Edelman's Verborgen Kluis". Het graf is van een edelvrouw, en "Edelman's"
  met apostrof is geen goede spelling. Ook de NL-mapHint "wilde deze kamer vergeten laten" loopt stroef.

### 2.5 Niet nagelopen in `review.md`

In de tabel van `review.md` hebben deze delen nog geen datum:

- de aankomsten van Akte II–V
- de grafscènes
- het reactiespoor
- de leesmuren

Junior is dus nog niet gespeeld en vergeleken zoals Akte I.

### 2.6 Alleen gepland, nog geen tekst

- **Fez legt nieuwe dingen uit wanneer je ze voor het eerst ziet** (`review.md`, Opening §D, en
  `onboarding.md`). Junior leert de eerste lock-mechanieken: `dropDown`, `leverOpensADoor`, `torch`,
  `waterMoves`, `doorWaitsForTwo`, `stoneOnAPlate` en `leverSwapsDoors`. Fez zegt bij geen enkele iets.
  `review.md` Akte I punt 6 zegt wel: Fez spreekt alleen waar hij iets leert, niet om een gang te vullen.
- **Een landmark per reis** (`review.md`, Akte I C): alleen `starter_1` heeft er een, de Sfinx. Voor de
  vier junior-reizen is er geen silhouet (ibis, werkplaatsen, tempel, vuurtoren).
- **"Junior's four blank floors"** (de handover): die tekst staat niet letterlijk in `IMPLEMENTATION.md`.
  §4 daar is de herverdeling van de perks. Daar staat "compass L2 in junior (done, `junior_a_3`)". Het is
  een perk-punt, geen verhaalbeat.
- **Henuts vraag in het script** (`script-act-2.md` Open 2): "Is Henut too pleased with herself to be
  likeable? … The name beat is what turns her, and it may need to come sooner." Door §2.1 komt die
  ommekeer nu juist veel later.

---

## 3. Zo bekijk je de beats

### Storybook: alleen lezen en afspelen

Start met `yarn storybook` en open http://localhost:6006. Ga naar **Story → Beats**
(`src/mods/story/app/StoryBeats.stories.tsx`). Elke kaart heeft een knop **Play**, en die speelt de scène
met portretten. De kaarten tonen de Engelse tekst; als het spel NL draait, zie je in Storybook toch EN.

| Story          | Junior-beats erin                                            |
| -------------- | ------------------------------------------------------------ |
| Arrivals       | `arrival.junior_1` … `junior_4`                              |
| Tomb Scenes    | `tomb.junior` (Henut)                                        |
| Readings       | `tomb.juniorFixed` (staat bij de muur)                       |
| Bonds          | `bond.junior`                                                |
| Not Yet Placed | `reading.junior`, met de melding "nowhere: nothing fires it" |

Niet in Storybook: `cave`, `pillar` en `cavern`, `camp.chapterJunior`, de ezelbeats, de revisits en
`mosaicJunior`. Ook het muurscherm zelf staat er niet in.

### In het spel: ontwikkelmodus

1. Tik **7 keer snel op de titel** in het kamp. Dat zet de ontwikkelmodus aan, ook op de online build.
2. Open **Instellingen** (het tandwiel). Onderaan staat dan **Playtesting tools**. In ontwikkelmodus kun je
   elke reis kiezen.

| Wil je zien                | Doe dit                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Een junior-aankomst        | Start de reis en open de eerste piramide. Hij speelt één keer per save.                                                                                                                        |
| Henut + de muur            | Kies **Jump: Henut's wall**. Je staat dan op de drempel van de leeskamer. Henuts kamer is de kamer net daarvoor: tik erop om haar scène te horen.                                              |
| De muur echt herstellen    | Kies eerst **All hieroglyphs**. Daarmee heb je de uil. Daarna de jump; het herstel speelt `tomb.juniorFixed`.                                                                                  |
| `cave`, `pillar`, `cavern` | Kies **All map pieces**. Ga dan naar Noble's Hidden Vault. Of kies **Story drafts: tombs**: die speelt alle 27 grafbeats achter elkaar af, junior zijn nummer 4–6. Je save onthoudt dan niets. |
| `camp.chapterJunior`       | **Story drafts: camp** (beat 5 van 8)                                                                                                                                                          |
| Ezelbeats                  | **Story drafts: animals**. Of speel echt: munten verdienen en de ezel kopen in de kraam van het graf. **Buy every animal** zet alles op gekocht.                                               |
| `bond.junior`              | Los een junior-bord op zonder hint, in een save die hem nog niet gehoord heeft.                                                                                                                |
| Iets nog eens lezen        | Ga naar Collectie → het verhaallogboek. Daar staan alleen aankomsten en grafscènes die al gehoord zijn.                                                                                        |

Let op: een gehoorde beat speelt niet opnieuw. Wil je hem in het spel nog eens horen, gebruik dan een
verse save of de Story drafts. De drafts schrijven niets in je save.
