# Junior: past alles bij de puzzels? Reviewblad

Reviewblad voor de junior-release; weg na de release.

**Bronnen.** De wereld is `src/data/generatedWorld.ts` op branch `junior/rooms` (PR #355, commit `18c53365`). De
puzzels daarin zijn dezelfde als op `main`; alleen de kamers (`prefabPlacements`) en een paar beloningen verschillen.
De spec is `src/worldGen/spec/junior.ts` op die branch. Verder gelezen: de kamerbestanden `src/game/rooms/junior/*.room`,
de slotbestanden `src/game/locks/junior/**`, de bindingen in `spec/locks/{lessons,onFloor}.ts`, de faces per familie
(`src/mods/**/meta.ts`), de locales `public/locales/{en,nl}`, en de docs `visual-direction.md`, `themed-rooms.md`,
`journeys.md`, `lock-curriculum.md`, `lock-placement.md`, `story/script-act-2.md`, `story/cast.md`,
`story/main-path.md` en `TRAP_FAMILIES.md`.

**Legenda voor de tabellen**

- Een puzzel staat als `familie (face)`, met de face-naam uit `nl/common.json`. Die naam volgt uit de rol: zonder
  rol draagt een familie haar default-face.
- Bij de zijpaden betekent `[p]` achter een sleutelpoort, `[v]` verborgen en `[st]` op starter-niveau (oude
  werkplaats of starter-echo). `leeg` is een zijpad zonder puzzel dat in een kist eindigt. `vleugel` is de trap naar
  een wachtvleugel.
- Op **elke** junior-verdieping ligt ook één verborgen, verzegeld valpad met `arithmetic-reflex` + `clock-reflex`.
  In de tabellen staat dat niet steeds opnieuw.
- Een slot staat als `naam (les|slot): besturingen → realisatie`.
- Een kamer staat als `kamer (activiteit)`. `*` betekent dat de kamer een mechanisme-plek heeft (`m`). `p` betekent
  dat de kamer patroonbeelden kan tonen (`floor? patron`).
- De coördinaten volgen de inspector: pyramide en verdieping tellen vanaf 1. In code is dat `junior_1:p0:f0`.

---

## 0. Wat is een regel, en wat is smaak?

**Harde regels.** Deze staan als regel in een doc of worden in code afgedwongen:

| #   | Regel                                                                                                                                                                                                                                                                 | Bron                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| R1  | Een kamer in een junior-pyramide toont alleen junior-activiteiten: het huis van de edelman, ook in de Vuurtoren of de Vallei.                                                                                                                                         | themed-rooms §1, `activities.ts`  |
| R2  | Een activiteit hoort bij de rol van de vleugel. Junior: banket, kleedkamer en huisaltaar → `light`; tuinhof → `water`/`sky`; slaapkamer → `sky`; bakkerij → `water`. Afgedwongen bij kamers die de carve aankleedt. Door de DSL geplaatste prefabs omzeilen de regel. | themed-rooms §1, `activities.ts`  |
| R3  | Een verhaalscène staat in een vastgepinde, ontworpen kamer (`nodes: [{ room }]`), zoals `fezStall` en `ipiLedger` bij starter.                                                                                                                                        | themed-rooms §2                   |
| R4  | Mechanisme-art is gedeeld: één vorm op elk niveau. Een tileset mag alleen een waarde-variant schilderen, nooit een ander object.                                                                                                                                      | geheugen "mechanic art is shared" |
| R5  | Elk mechaniek komt eerst alleen voor (een les), en pas daarna in combinatie. Eén laag per site, geen sampler.                                                                                                                                                         | lock-curriculum.md                |
| R6  | Een reis mag zich alleen tot een rol **beperken** bij een pool van minstens 4 en hooguit 4,8× herhaling. **Voorkeur** (`[rol, "puzzle"]`) mag altijd.                                                                                                                 | journeys.md §2, §10               |
| R7  | "Weighing returns at the end": de weegschaal-als-hart hoort bij het einde (master/wizard).                                                                                                                                                                            | themed-rooms §1, journeys §9      |

**Smaak.** Al het andere hieronder: of een kamer, slot of face "klopt" bij een reisnaam. Dat beslist de
ontwerper.

---

## 1. Per reis, per verdieping

### junior_1 · Heilige Ibis Migratie

Rol `water` (beperkt), geen thema, patroon **Thoth** (de ibis is zijn vogel). Verhaal: kalender, vloed, "birds and
paperwork".

| Pyr · verd.                 | Hoofdpad                                                                                    | Zijpaden                                                                                                                      | Slot · mechanisme                                                    | Ontworpen kamers                                                                                   | Patroon | Rol / aankleding |
| --------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------- | ---------------- |
| 1 · 1                       | hidato (Het Kanaal), constellation (Waterwerk)                                              | procession (Dag v.d. Overstroming) [p], hidato [st][p], procession, constellation, leeg, twin-stars (Dubbele Boerderijen) [v] | dropDown (les): hendel → handle, drop → **zipline**                  | bakeryWorks* (bakkerij-brouwerij)                                                                  | Thoth   | water            |
| 2 · 1                       | twin-stars (Dubbele Boerderijen), canisters (De Kruiken, rivier), constellation (Waterwerk) | kaartstuk-leeg, constellation [p], hidato [st], procession, constellation, leeg, constellation [v], hidato [st][p]            | leverOpensADoor (les): hendel → handle                               | shrineRoom p (huisaltaar, naar het eind, central 0), gardenCourt p (tuinhof), bedroom (slaapkamer) | Thoth   | water            |
| 3 · 1                       | star-battle (Boerderijen), hidato (Kanaal), canisters (Kruiken), procession (Overstroming)  | leeg [p], constellation, constellation, canisters, leeg, twin-stars [v], vleugel [p], hidato [st][p]                          | boardPicksTheWay (les): bord → **lightbeamSwitch** + hendel → handle | geen                                                                                               | Thoth   | water            |
| 3 · 2 (vleugel, junior_a_1) | constellation (Waterwerk)                                                                   | star-battle [v]                                                                                                               | geen                                                                 | geen                                                                                               | Thoth   | water            |

Dit valt op: alle faces zijn water, en alle families in de pool hebben een water-face. Van de 28 puzzelkamers
zijn er **9 constellation** (32%).

### junior_2 · Vallei van de Ambachtslieden

Geen rol, dus `puzzle` en alleen default-faces. Geen thema, geen patroon. Verhaal: Deir el-Medina en de mallen,
"dezelfde armband, veertig keer". Fez noemt het woord kopie hier niet.

| Pyr · verd.             | Hoofdpad                                                                                 | Zijpaden                                                                                                                          | Slot · mechanisme                                                                                   | Ontworpen kamers                                                                       | Patroon | Rol / aankleding |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------- | ---------------- |
| 1 · 1                   | eclipse (Zon en Maan), canisters (De Kruiken), star-battle (Sterren Apart)               | sumplete (De Telling) [p], procession (Geordende Uren), rush-hour (Blokkade), lightbeam, leeg, rush-hour [v]                      | torch (les): fakkel → torch                                                                         | dressingRoom (kleedkamer), shrineRoom p (huisaltaar), bigGardenCourt p (grote tuinhof) | —       | puzzle (alles)   |
| 2 · 1                   | eclipse, futoshiki (Groter en Kleiner), sumplete (Telling), constellation (Sterrenkaart) | futoshiki [p], hidato (Honingraat) [st], star-battle, **balance-scale (Weegschaal) ×2**, eclipse, twin-stars, leeg, canisters [v] | leverSwapsDoors (les): hendel → handle, **plus** de enige wisselvork in de wereld (lightbeamSwitch) | geen (`lessonFloor`, zonder `house`)                                                   | —       | puzzle           |
| 3 · 1                   | sudoku (Zes Kamers), procession (Geordende Uren), hidato (Honingraat), futoshiki         | kaartstuk-leeg, leeg [p], hidato [p], canisters, rush-hour, leeg, constellation [v], vleugel [p]                                  | **waterMoves** (les): hendel → handle, gebied → **water**                                           | quernRoom* (maalsteen), bedroom (slaapkamer), dressingRoom (kleedkamer)                | —       | puzzle           |
| 3 · 2 (vleugel, expert) | hidato, sudoku                                                                           | sudoku [v]                                                                                                                        | geen                                                                                                | geen                                                                                   | —       | puzzle           |
| 4 · 1                   | lightbeam, canisters, eclipse, twin-stars, hidato                                        | leeg [p], futoshiki, sudoku, leeg, canisters [v], vleugel [p], rush-hour [st][p]                                                  | **sluice** (slot): hendel → handle, buit → torch, gebied → **water**                                | bakery (bakkerij-brouwerij, naar het midden geschoven, central 0.5)                    | —       | puzzle           |
| 4 · 2 (vleugel, master) | procession, canisters                                                                    | sumplete [v]                                                                                                                      | geen                                                                                                | geen                                                                                   | —       | puzzle           |

### junior_3 · Tempel van Thoth

Geen rol, dus default-faces. Geen thema, patroon **Thoth**. Verhaal: schrift, "Thoth counts", en Fez zit ernaast
met "secrets and magic".

| Pyr · verd.             | Hoofdpad                                                                                    | Zijpaden                                                                                                     | Slot · mechanisme                                                        | Ontworpen kamers                                          | Patroon | Rol / aankleding |
| ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------- | ------- | ---------------- |
| 1 · 1                   | futoshiki, sumplete (De Telling), lightbeam, star-battle                                    | hidato [p], constellation, eclipse, leeg, canisters [v]                                                      | doorWaitsForTwo (les): 2 fakkels → torch                                 | bedroom, dressingRoom, gardenCourt p, musicRoom* (banket) | Thoth   | puzzle           |
| 2 · 1                   | constellation (Sterrenkaart), **balance-scale (Weegschaal)**, sumplete, star-battle, hidato | twin-stars [p], rush-hour [st], eclipse, rush-hour, canisters, leeg, sumplete [v], hidato [st][p]            | beforeYouJump (slot): hendels → handle, drop → zipline                   | bedroom (naar het midden, central 0.5)                    | Thoth   | puzzle           |
| 3 · 1                   | futoshiki, **balance-scale**, constellation, hidato, sudoku (Zes Kamers)                    | kaartstuk-leeg, leeg [p], constellation [p], rush-hour, canisters, sumplete, leeg, sumplete [v], vleugel [p] | dropHome (slot): bord → lightbeamSwitch, hendel → handle, drop → zipline | geen                                                      | Thoth   | puzzle           |
| 3 · 2 (vleugel, junior) | star-battle                                                                                 | hidato [v]                                                                                                   | geen                                                                     | geen                                                      | Thoth   | puzzle           |
| 4 · 1                   | canisters (Kruiken), lightbeam, star-battle, **balance-scale**, constellation, sumplete     | leeg [p], procession, canisters, lightbeam, leeg, procession [v], vleugel [p], hidato [st][p]                | cellar (slot): hendel → handle, sleutel → torch, drop → zipline          | shrineRoom p (huisaltaar)                                 | Thoth   | puzzle           |
| 4 · 2 (vleugel, expert) | eclipse, rush-hour                                                                          | lightbeam [v]                                                                                                | geen                                                                     | geen                                                      | Thoth   | puzzle           |

Dit valt op: geen enkele puzzel hier draagt een schrijvers-face, terwijl die er wel is (zie M4). Over de hele reis
staan er **Weegschaal ×4, De Telling ×6 en De Blokkade ×5**.

### junior_4 · Vuurtoren van Alexandrië

Rol `["light", "sky"]` (beperkt), thema **nacht**, geen patroon. Verhaal: het vuur bovenin, navigatie, "you ask
someone who has been".

| Pyr · verd.             | Hoofdpad                                                                                | Zijpaden                                                                                              | Slot · mechanisme                                                                | Ontworpen kamers                                        | Patroon | Rol / aankleding  |
| ----------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- | ------- | ----------------- |
| 1 · 1                   | twin-stars (Tweelingsterren), star-battle (Sterren Apart), constellation (Sterrenkaart) | star-battle [p], star-battle, eclipse (nacht), star-battle, leeg, constellation [v]                   | stoneOnAPlate (les): stenen → stonePlate                                         | bigBanquetHall (banket), bedroom, courtWorks* (tuinhof) | —       | light+sky · nacht |
| 2 · 1                   | constellation, twin-stars, lightbeam (Lichtstraal), eclipse                             | lightbeam [p], constellation, twin-stars, leeg, constellation [v], lightbeam [st][p]                  | overlook (slot): hendels → handle, drops → zipline                               | shrineWorks* p (huisaltaar)                             | —       | light+sky · nacht |
| 3 · 1                   | canisters (**Olie voor de Lampen**), constellation, star-battle, eclipse                | kaartstuk-leeg, star-battle [p], lightbeam [st], twin-stars, canisters, twin-stars, leeg, eclipse [v] | seesaw (slot): hendels → handle, drops → zipline                                 | geen                                                    | —       | light+sky · nacht |
| 4 · 1                   | canisters (Olie), eclipse, twin-stars, star-battle, lightbeam                           | leeg [p], twin-stars, lightbeam, eclipse, leeg, star-battle [v], vleugel [p]                          | **lamplighter** (slot): bord → lightbeamSwitch, A/B → **handle**, drop → zipline | shrineRoom p (huisaltaar met lampen)                    | —       | light+sky · nacht |
| 4 · 2 (vleugel, master) | star-battle, lightbeam                                                                  | twin-stars [v]                                                                                        | geen                                                                             | geen                                                    | —       | light+sky · nacht |
| 5 · 1                   | eclipse, twin-stars, star-battle, constellation, canisters (Olie)                       | leeg [p], twin-stars, lightbeam, lightbeam, leeg, lightbeam [v], vleugel [p], lightbeam [st][p]       | **tide** (slot): hendel → handle, sleutel → torch, gebied → water                | dressingRoom (kleedkamer), musicRoom* (banket)          | —       | light+sky · nacht |
| 5 · 2 (vleugel, junior) | star-battle                                                                             | constellation [v]                                                                                     | geen                                                                             | geen                                                    | —       | light+sky · nacht |

Dit valt op: van de 61 puzzelkamers zijn er **star-battle 12 + twin-stars 10**. Dat zijn 22 kamers (36%) met
hetzelfde sterrenrooster op hetzelfde scherm. Daarnaast lightbeam 12. Het hoofdpad heeft constellation twee keer
achter elkaar, over de grens van pyramide 1 naar 2.

### junior_treasure_tomb · Edelman's Verborgen Kluis (Henut)

Rol `tomb-puzzle`. Graven zijn vrijgesteld van faces (journeys §2). Patroon **Anubis**. Er staan geen ontworpen
kamers (`chambers: 0`) en geen sloten. Verhaal: Henut, ijdel, begraven met imitaties. Zij vraagt de speler één teken
op haar muur te verbeteren.

| Site · verd. | Hoofdpad                                                                                                 | Zijpaden                 | Slot | Ontworpen kamers                     | Patroon | Rol / aankleding        |
| ------------ | -------------------------------------------------------------------------------------------------------- | ------------------------ | ---- | ------------------------------------ | ------- | ----------------------- |
| 1 · 1 (grot) | eclipse, hidato, twin-stars (default-faces)                                                              | constellation            | geen | geen (grotmeubels)                   | Anubis  | puzzle · tileset `cave` |
| 2 · 1        | tableau, hidato (expert), tableau, tableau, **conversation (Henut)**, **reading (haar muur)**, crocodile | Fez-winkel, hidato, trap | geen | **geen, ook niet voor Henuts scène** | Anubis  | tomb-puzzle             |
| 2 · 2        | tableau, sumplete (expert), tableau, tableau, crocodile                                                  | rush-hour, trap          | geen | geen                                 | Anubis  | tomb-puzzle             |
| 2 · 3        | tableau, lightbeam (expert), tableau, tableau, crocodile                                                 | hidato, futoshiki, trap  | geen | geen                                 | Anubis  | tomb-puzzle             |
| 2 · 4        | tableau, futoshiki (expert), tableau, tableau, crocodile                                                 | rush-hour, trap          | geen | geen                                 | Anubis  | tomb-puzzle             |
| 2 · 5        | tableau, procession (expert), tableau, tableau, crocodile                                                | canisters, trap          | geen | geen                                 | Anubis  | tomb-puzzle             |
| 2 · 6        | tableau, canisters (expert), tableau, tableau, crocodile                                                 | eclipse                  | geen | geen                                 | Anubis  | tomb-puzzle             |

Tableau-titels uit `tableaus.json`: "Royal Scepters" en "Pharaoh's Mark". Die passen bij het verhaal: regalia
gekocht als kopie. "Eye of the Market" en "Merchant's Eye" vallen eruit (M6). **Hathor** staat in vier
tableau-beschrijvingen.

---

## 2. Thematische mismatches

Geordend van belangrijk naar klein. Elk punt is gemarkeerd als **[REGEL]** of **[SMAAK]**.

### M1 · Henuts scène heeft geen eigen kamer · [REGEL R3]

- **Wat.** In `junior_treasure_tomb` site 2 verdieping 1 staan `conversation` en `reading` als kale nodes
  (`{ where: …, encounter: "conversation" }`), zonder `room`. Bij starter staat Ipi's scène in `ipiLedger`
  (activiteit ledger) en die van Fez in `fezStall`.
- **Waarom.** Volgens themed-rooms §2 speelt een scène in één ontworpen kamer met een `actor`-plek. Nu staat
  Henut in een gang tussen twee tableaus. Junior heeft bovendien de perfecte activiteit voor haar: de kleedkamer
  met koperen spiegel, kohl-potjes en pruikenstandaard. Dat is precies "the best imitation money could buy".
- **Voorstel.** Een vastgepinde junior-kamer, bijvoorbeeld `henutDressing` met activiteit `dressingRoom`.
  Leg die op de conversation-node: `{ where: TOMB_ROOMS_PER_FLOOR.junior + 2, encounter: "conversation",
activity: "dressingRoom", room: "henutDressing" }`. Kijk ook of de reading-muur (de cartouche met de gans) een
  eigen wandstuk verdient. Volgens §2 is dat "zelden", maar dit is het eerste leesmoment van het spel.

### M2 · De verhaaltekst zegt "hij", het graf is van een vrouw · [REGEL: consistentie met cast.md]

- **Wat.** `nl/journeys.json`, `nl/tableaus.json` en `nl/common.json` (`nobleVault`) noemen het graf
  "**Edelman's** Verborgen Kluis". De beschrijving zegt "Het gewelf van een **edelvrouw**", en het is Henuts graf.
  De wachtpoort-tekst `wardDescription.junior` zegt in het Engels "A nobleman's crest … **his** ward key" en in het
  Nederlands "Het wapen van een edelman … **zijn** wachtsleutel". Die sleutels (`junior_a_1..6`) komen uit háár
  kluis.
- **Daarnaast.** "Edelman's" is in het Nederlands ook een spelfout: het moet "Edelmans" zijn.
- **Voorstel.** Noem het graf in het Nederlands "De Verborgen Kluis van de Edelvrouw" of "Henuts Verborgen Kluis".
  Maak van de wachtpoort "A noblewoman's crest … her ward key" en "Het wapen van een edelvrouw … alleen haar
  wachtsleutel". Het Engelse "Noble's" mag blijven.

### M3 · De waterloten staan in de droge vallei, niet in de vloedreis · [SMAAK, met R5 als randvoorwaarde]

- **Wat.** `waterMoves` (junior_2 pyr 3) en `sluice` (junior_2 pyr 4) staan in de **Vallei van de Ambachtslieden**.
  De **Ibis-migratie**, de reis over moeras en vloed, heeft geen enkel waterslot. `tide` in de Vuurtoren (pyr 5)
  past juist goed: zee en getij.
- **Waarom.** Deir el-Medina is beroemd om zijn droogte. Water werd per ezel aangevoerd, en de "Great Pit" werd
  gegraven op zoek naar water dat nooit kwam. Twee keer een ondergelopen hal leest daar als toeval.
- **Voorstellen.**
  - (a) Ruil junior_1 pyr 3 (`boardPicksTheWay`) met junior_2 pyr 3 (`waterMoves`). De hendel is dan al geleerd in
    junior_1 pyr 2, dus dat klopt. Maar de wisselvork op junior_2 pyr 2 is zelf een bord-in-kruising en komt dan
    vóór zijn les. Dat breekt R5, tenzij de wisselvork mee verhuist.
  - (b) Bind in junior_2 `region-barrier` aan **`sand`** (`SAND_META` bestaat): opgewaaid zand in de woestijnvallei.
    Het nadeel is dat zand later minder nieuw voelt (hourglass bij expert, wizards zandpyramide). Ook heet de les
    `waterMoves`.
  - (c) Laat het zo. De naam van het slot ziet de speler niet. Wat hij wel ziet, is water in een droge vallei.

### M4 · De Tempel van Thoth draagt niets van het schrift · [SMAAK, R6 staat het toe]

- **Wat.** junior_3 heeft geen rol. Daardoor staan er vier merchant-Weegschalen, zes keer De Telling en vijf keer
  De Blokkade, maar geen enkele schrijvers-face. `scribe` is volledig aangekleed (3 van 3): canisters "Het
  Schrijfvertrek", hidato "Schrijversvel" en sudoku "Het Register van de Schrijver".
- **Waarom.** Beperken mag niet, want de pool is 3. **Voorkeur** mag wel (journeys §2: "short pools can still be
  PREFERRED"). Het verhaal van de reis is "Writing itself. Your signs start joining up". Journeys §9 noemt junior_3
  zelf bij "two roles are ready".
- **Voorstel.** `journey("junior_3").pyramid("1-4", { encounter: ["scribe", "puzzle"] })`. Dat herbakt de
  bord-indexen. Voor de release mag dat (geheugen: "bake freely before release").

### M5 · De Vallei krijgt de kamers van een rijke edelman, niet van een ambachtsman · [SMAAK binnen R1]

- **Wat.** In junior_2 staan bigGardenCourt (lotusvijver), twee keer dressingRoom en een bedroom. Junior
  heeft nu eenmaal alleen het edelmanshuis (R1). Maar binnen dat huis passen sommige kamers juist wél bij Deir
  el-Medina. De huizen daar zijn dé archeologische bron voor het Bes-huisaltaar, de broodoven en de maalsteen.
- **Voorstel.** Laat junior_2 leunen op `shrineRoom`/`shrineWorks`, `bakery`/`bakeryWorks` en `quernRoom`. Haal
  de grote tuinhof (pyr 1) en de kleedkamers (pyr 1 en 3) weg. Bewaar die voor de Vuurtoren, Thoth en Henut (M1).
  Of het past, hangt af van de regio's van het slot. Dat moet je in de inspector checken.
- **Puzzels in de Vallei.** Journeys §5 vraagt hier om `trade`. Maar de trade-faces zijn die van de koopman: De
  Wijnkelder, De Versperde Steeg, De Dag aan de Kade. Dat is starter-smaak, en starter_2 draagt `trade` al. Een
  optie is `["funerary", "puzzle"]` als voorkeur. Dan brengt procession **"De Dag in het Dal van de
  Ambachtslieden"** mee (pleisteren, rasteren, beitelen, schilderen, vergulden, deur inpassen), en dat ís deze
  vallei. Constellation brengt "Beschilderd Plafond" mee. Maar dan komen ook "Het Wegen van het Hart" (botst met
  R7), "De Canopen" (balsemen, geen ambacht) en de expert-sfeer mee. Mijn advies: voorlopig geen rol, of alleen de
  voorkeur als je R7 hier loslaat.

### M6 · Koopmanssmaak in het edelmanshuis · [SMAAK]

- **Wat.** De default-face van balance-scale is "the merchant's own pieces". Die staat 4× in junior_3 en 2× in
  junior_2. Sumplete heet "De Telling", en turfstreepjes zijn het motief van starter. Twee tableau-titels van Henut
  zijn "Eye of the Market" en "Merchant's Eye".
- **Waarom.** Volgens visual-direction is starter de koopman en junior de edelman. Een weegschaal in de weegkamer
  van Thoth kan nog, want Thoth telt. Maar de face toont koopmansgewichten.
- **Voorstel.** M4 verdunt dit vanzelf. Kleed de weegschaal **niet** als "Wegen van het Hart" (R7). Voor de
  tableau-titels: denk aan "Steward's Eye" of "Eye of the Estate". Lage prioriteit.

### M7 · De Vuurtoren: de kamers lezen als slaapvertrekken · [SMAAK binnen R1/R2]

- **Wat.** Alle geplaatste kamers voldoen aan R2. Maar het tide-slot (pyr 5) krijgt `dressingRoom` + `musicRoom`,
  en het stoneOnAPlate-slot (pyr 1) `bigBanquetHall` + `bedroom` + `courtWorks`. Een lamp-kamer bij lamplighter
  (`shrineRoom` met lampen, pyr 4) past juist uitstekend.
- **Voorstel.** Zet op pyr 5 (tide, water) `courtWorks`: de tuinhof heeft rol `water`/`sky` en een mechanisme-plek.
  Gebruik dat in plaats van `musicRoom`. Op pyr 1 kan `quernRoom` (een maalsteen, dus een steen) de plaat-regio
  dragen. Heel licht, maar een mooie echo.

### M8 · Het banket ontbreekt bijna, terwijl het junior's handtekening is · [SMAAK]

- **Wat.** Visual-direction typeert junior als "festive, banquet friezes". Toch staat er op 16 hoofdverdiepingen
  maar één banketzaal (`bigBanquetHall`, junior_4 pyr 1), plus twee keer `musicRoom`. De gewone `banquetRoom` wordt
  nergens geplaatst. Ter vergelijking: bedroom staat er 5×, dressingRoom 4× en shrineRoom 4× (+1 works).
- **Voorstel.** Zet `banquetRoom` (central 0.8) op een verdieping waar het midden vrij is. Kandidaten zijn junior_3
  pyr 2 (beforeYouJump, waar bedroom naar 0.5 is geschoven), junior_2 pyr 4 (sluice, bakery op 0.5) en junior_3
  pyr 1 (vier kamers, waarvan musicRoom al banket is).

### M9 · lamplighter in de Vuurtoren steekt niets aan · [SMAAK]

- **Wat.** De kop van het slot zegt "Light west first". In de Vuurtoren had het niet passender gekund. Maar A en B
  zijn `toggle` → handle: de speler trekt aan twee hendels.
- **Waarom het geen simpele binding is.** `toggle` en `flame` zijn verschillende soorten besturing. Een fakkel gaat
  nooit meer uit, een hendel kan terug. Ombinden is dus een wijziging in de topologie, en `yarn lock` moet het slot
  opnieuw bewijzen. Dat beslist de ontwerper.
- **Voorstel.** Kijk of A/B als `torch` het slot nog dragen. Gaat dat niet, dan is dit de plek voor een
  toekomstige "lamp"-realisatie van toggle.

### M10 · Herhaling · [SMAAK]

- **Vuurtoren.** star-battle en twin-stars zijn één scherm en samen 36%. Alle faces zijn de sterrenhemel-default
  met nacht erover. De gaten zijn bekend (journeys §9: "`light` faces for eclipse and lightbeam"). Wel ligt
  constellation twee keer op rij op het hoofdpad (eind pyr 1, begin pyr 2).
- **Ibis.** constellation 9 van de 28. De pool deelt gelijkmatig uit, dus dit is het geluk van de seed. Kijk
  opnieuw na een herbak.
- **Vallen.** Elke junior-verdieping heeft precies `arithmetic-reflex` + `clock-reflex`, want er bestaan maar twee
  valfamilies. De wijzerklok is bewust gekozen (TRAP_FAMILIES §5.2: een schoolvaardigheid), maar in Egypte is hij
  anachronistisch. Ter kennisname.
- **zipline.** Op 8 junior-verdiepingen is de zipline de enige eenrichtingsrealisatie. In een beschilderd huis is
  een kabelbaan vreemd. Volgens R4 mag hij niet van vorm veranderen, alleen van waarde (een koperen tint).
  Accepteren, of later een tweede eenrichtingsrealisatie ontwerpen.

### M11 · Patronen: twee reizen zonder god, en Hathor ontbreekt · [SMAAK]

- **Wat.** junior_2 en junior_4 hebben geen patroon. `PATRONS` kent geen passende god: Ptah, Hathor of Meretseger
  voor de ambachtslieden, Isis Pharia voor de Pharos. Anubis op het graf is te verdedigen ("he is the
  necropolis").
- **Waarom Hathor.** Zij is "Lady of the West", de beschermgodin van vrouwengraven. Ze is ook de godin van banket,
  muziek, spiegels en schoonheid, dus alle junior-activiteiten, en ze staat in vier van Henuts tableaus. De
  shrine- en tuinkamers op junior_2 en junior_4 hebben lege `p`-plekken.
- **Voorstel.** Voeg `hathor` toe aan `PATRONS`, schilder `shrine/statue/stela-hathor`, en geef haar het graf, of
  junior_2/junior_4. Junior houdt dan twee goden (Thoth + Hathor), en dat is volgens de spec de ondergrens om
  patroon-art te laten zien. Dit kost art. Doe je niets, dan blijft het generieke beeld staan, en dat is prima.

### M12 · Kleinigheden · [SMAAK]

- **junior_1 pyr 2.** `bedroom` (rol `sky`) staat in een `water`-reis. R2 grijpt bij een prefab niet in, maar een
  carve-kamer mocht hier niet staan. De `shrineRoom` ernaast is te verdedigen, want Thoth-beelden in de Ibis-reis
  zijn raak en de patroonfunctie gaat voor de activiteit. Voorstel: vervang bedroom door `bakery`, `quernRoom` of
  `bigGardenCourt`.
- **junior_3 pyr 4 (cellar).** Het slot heet kelder, de kamer is een huisaltaar. `bakery` (bierkruiken) leest meer
  als kelder. Heel licht.
- **junior_4 pyr 1 (stoneOnAPlate).** De "natural homes" van stenen zijn Djoser, Giza en het Dodenboek
  (lock-curriculum). Bovendien staat stoneOnAPlate ook op expert_4 site 1 (stand-in). In een vuurtoren van
  steenblokken kan het, maar het is het zwakste lesslot qua plek.

---

## 3. Wat je in de journey inspector bekijkt

Start Storybook **op branch `junior/rooms`**. Op `main` ontbreken de kamers. Kies het verhaal **JourneyInspector →
Inspector** met `tier: junior`. `journeyIndex` is 0 = junior_1, 1 = junior_2, 2 = junior_3, 3 = junior_4. Het
graf zit onder **TombInspector** met `tier: junior` en `journeyIndex: 0`; daar is `pyramidNumber` 1 de grot en 2
het graf. De verdieping kies je met de knop "Floor →".

| Wat (punt)                                    | Inspector                                                                                       | Waar je op let                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Henuts scène zonder kamer (M1)                | TombInspector · junior · idx 0 · pyramid **2** · floor **1**                                    | De 5e en 6e node (conversation, reading) staan in de gang tussen tableau 3 en de krokodil. Is er ruimte voor een kamer? |
| Water in de vallei (M3)                       | Inspector · junior · idx **1** · pyramid **3** · floor 1                                        | waterMoves: de ondergelopen hal, met quernRoom/bedroom/dressingRoom ernaast                                             |
| Water in de vallei (M3)                       | idx **1** · pyramid **4** · floor 1                                                             | sluice: twee hallen water, bakery in het midden                                                                         |
| Wisselvork + les op één site (M3a, bijvangst) | idx **1** · pyramid **2** · floor 1                                                             | lightbeamSwitch in de kruising naast de leverSwapsDoors-hendel; geen kamers                                             |
| Vallei-kamers (M5)                            | idx **1** · pyramid **1** · floor 1                                                             | bigGardenCourt + dressingRoom + shrineRoom bij het torch-slot. Kan de tuinhof plaats maken voor bakkerij of altaar?     |
| Thoth zonder schrift (M4, M6)                 | idx **2** · pyramid **2**, **3**, **4** · floor 1                                               | Weegschaal op elk hoofdpad. Bekijk in de puzzle lab hoe "Weegschaal" eruitziet naast "Schrijversvel"                    |
| Banket ontbreekt (M8)                         | idx **2** · pyramid **2** · floor 1                                                             | bedroom op 0.5. Is het midden vrij voor `banquetRoom`?                                                                  |
| Vuurtoren tide-kamers (M7)                    | idx **3** · pyramid **5** · floor 1                                                             | dressingRoom + musicRoom bij het tide-water. Kan courtWorks de mechanisme-regio nemen?                                  |
| Vuurtoren plaat-kamers (M7)                   | idx **3** · pyramid **1** · floor 1                                                             | bigBanquetHall, bedroom, courtWorks rond de stenen plaat                                                                |
| lamplighter met hendels (M9)                  | idx **3** · pyramid **4** · floor 1                                                             | De hendels A/B in west/oost, het lightbeam-bord in `in`, shrineRoom met lampen                                          |
| Sterrenrooster-herhaling (M10)                | idx **3** · pyramid **1** → **2** · floor 1                                                     | constellation aan het eind van pyr 1 en het begin van pyr 2; star-battle 3× op pyr 1 alleen al                          |
| Ibis: slaapkamer in waterreis (M12)           | idx **0** · pyramid **2** · floor 1                                                             | shrineRoom (Thoth-beelden), gardenCourt, bedroom                                                                        |
| Ibis: constellation-overwicht (M10)           | idx **0** · pyramid **2** + **3** · floor 1                                                     | Waterwerk 6× over de zijpaden                                                                                           |
| Kelder-slot (M12)                             | idx **2** · pyramid **4** · floor 1                                                             | cellar met shrineRoom                                                                                                   |
| De copy (M2)                                  | niet in de inspector: de taalschakelaar in het spel, en de wachtpoort op een junior-vleugeltrap | "Edelman's" en "zijn wachtsleutel"                                                                                      |

---

## 4. Bijvangst (niet thematisch, wel gezien)

- **Verouderde tier-labels in slotkoppen.** In de map `junior/` zeggen `sluice`, `tide`, `lamplighter` en `seesaw`
  "master." en `cellar`, `overlook` en `dropHome` "expert.". Bij de lessen `waterMoves`, `doorWaitsForTwo` en
  `stoneOnAPlate` staat "LESSON, expert". De map bepaalt de tier, dus alleen de kop klopt niet. Die koppen zijn van
  Claude, niet van de ontwerper.
- **Eén laag per site (R5).** junior_2 pyr 2 heeft de leverSwapsDoors-les **en** de wisselvork met een
  lightbeam-bord. Het bord is al eerder geleerd (junior_1 pyr 3), maar strikt genomen zijn het twee mechanieken op
  één site.
- **Het junior-graf heeft geen vloersloten.** Het starter-graf heeft er wel drie (caveLevers, pitStair,
  throwItBack). Volgens lock-placement voelen graafsloten "one tier up", dus hier zouden het expert-sloten zijn. Ze
  staan nog open.
- **De "Where they go — Junior"-tabel** in lock-curriculum.md is de oudere laag en wijkt af van de echte
  plaatsing. Dat staat in de doc zelf.
