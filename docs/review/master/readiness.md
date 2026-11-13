# Master: wat er moet gebeuren voordat het uit kan

Stand van `main` op 2026-11-13. Dit is een inventaris, er is niets gebouwd of gebakken. Het wizard-deel staat in `../wizard/readiness.md`.
Master komt pas na expert uit (één tier per release, `review-camp-release.md` §0). De kar die master opent, wordt in de
expert-tombe verkocht.

## 1. Wat er staat

| Onderdeel | Stand                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journeys  | `master_1` Giza (4 pyramides), `master_2` Dodenboek (5), `master_3` Vloek van de farao's (5), `master_4` Nefertari (5). In totaal 19 pyramides, elk 1 hoofdvloer en 1 ward-vleugel, en alle 19 gebakken.                                                                                                                                                                                                                                                          |
| Tombes    | `master_treasure_tomb` Hal van Ma'at en `_b` Hal van Osiris: elk een grot met 2 vloeren en een tombe met 5 vloeren, een winkel op vloer 1, gebakken.                                                                                                                                                                                                                                                                                                              |
| Locks     | Er is 1 geplaatst, `weighingOfTheHeart` van Tom (`master_2` site 5). `masonsRamp` (van Claude) staat in de map en heeft nog geen vloer. `bathHouse` staat alleen op `designer/lock-drafts`, niet op `main`. De andere 18 sites hebben alleen vloersleutels.                                                                                                                                                                                                       |
| Puzzels   | Alle 13 geregistreerde families hebben een master-config en worden gebakken, 21–49 per familie in de pyramides. Daarnaast tableau (50) en krokodil (10) in de tombes. Futoshiki is nu 6×6; de "45 min op 7×7" in `PUZZLE_FAMILIES.md` is achterhaald.                                                                                                                                                                                                             |
| Kamers    | Er is geen map `src/game/rooms/master/`. `themed-rooms.md` wil 8 activiteiten en noemt er 4 (schatkamer, audiëntie, grafkamer, wapenkamer). Geen ervan staat in de code.                                                                                                                                                                                                                                                                                          |
| Verhaal   | Klaar en gekoppeld: `arrival.master_1..4`, `tomb.master` (de farao), `revisit.master.*`. Als concept gekoppeld: de 6 beats grot/pilaar/grot-zaal en `camp.chapterMaster`. Geschreven maar nergens gekoppeld: `bond.master` en `altar.refused.*` (die wachten op de offerboog), `reading.master` (er is geen kamer voor) en `formula.master.*` (er staat geen formulemuur).                                                                                        |
| Art       | `master/floor`, `wall-face` en `threshold` zijn nog de oude art van #266; alle drie staan in de queue, de vloer als re-roll. Er is een bestand `door/ward-master`, maar geen prompt. De 15 priesterprops (waaronder `chestProp`), rubbleSpill, mat en 11 patroonvarianten staan in de queue en zijn nu placeholders. Van de `light`-mechanismeset zijn hendel en fakkel geschilderd; de 14 andere stukken staan in de queue en vallen tot dan terug op `default`. |
| Economie  | 661 puzzelkamers, waarvan 266 met buit (40 %). 54 kisten en 237 padeinden, allemaal gevuld. Winkel: 9 stuks. 141 vallen, 75 waterzakken. De tweede ezel (250, in de master-tombe) opent wizard; de tweede kameel opent `_b`.                                                                                                                                                                                                                                      |

## 2. Wat ontbreekt, in de volgorde waarin een speler het mist

| #   | Gat                                                                                                                                                                                                       | Waar de speler het ziet                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Props als placeholder en de mechanismen in `default`-kleur op de donkere vloer (hendels zie je nauwelijks)                                                                                                | Meteen, op de eerste master-vloer                  |
| 2   | Locks op 18 van de 19 sites. Een master-vloer speelt nu als een expert-vloer met vloersleutels.                                                                                                           | Op de eerste master-vloer                          |
| 3   | Kamers en activiteiten: geen master-prefabs, 0 van de 8 activiteiten                                                                                                                                      | Meteen, de kamers zijn junior-achtig               |
| 4   | `wall-face`, `threshold` en `door/ward-master` geschilderd. `wardChest`, `wardChestOpen` en `chestPropOpen` hebben nog geen prompt.                                                                       | De eerste ward-vleugel en de eerste kist           |
| 5   | Buit ongelijk verdeeld: `master_3` en `master_4` hebben maar 10–15 % buit en geen puzzelgeld, tegen 58–81 % in `master_1` en `master_2`                                                                   | Halverwege de tier                                 |
| 6   | Tombe: de concept-beats van grot, pilaar en grot-zaal vastgesteld. `tomb.masterB` bestaat niet, dus de Hal van Osiris heeft geen geest en geen gesprekskamer.                                             | In de tombes                                       |
| 7   | De formulemuur van master is niet geplaatst (`walls.ts` kent alleen junior en starter). Daardoor speelt `formula.master.hint` nooit en komt het geschenk o4 nooit. Ook `reading.master` heeft geen kamer. | In de tombe, en daarna mist de speler een geschenk |
| 8   | De offerboog (`bond.master`, `altar.*`) is niet gebouwd                                                                                                                                                   | Bij de overgang van tier                           |
| 9   | Het gevonden-object van `master_3` (het kamp) is alleen script; die encounterfamilie bestaat niet                                                                                                         | Op `master_3`                                      |

## 3. Wie het maakt

| Werk                              | Designer                                                                                          | Claude                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Master-locks (ongeveer 14 acties) | schrijft ze: `bathHouse` naar `main`, en de rest                                                  | plaatst, carve, bake en gate. Bouwt mechanieken die nog ontbreken: counterweight en twoStones horen bij Giza.                                                                    |
| Art                               | schildert via `yarn repaint` (vloer, wall-face, threshold, 15 props, patroonvarianten, light-set) | schrijft de ontbrekende prompts (`door/ward-master`, ward-kisten, `chestPropOpen`), importeert de art en legt elke import vast in `rebuild.sh` (voor master staat daar nu niets) |
| Kamers                            | de 4 ontbrekende activiteiten noemen, of besluiten dat 4 genoeg is                                | prefabs en activiteiten bouwen                                                                                                                                                   |
| Verhaal                           | concept-beats vaststellen; `tomb.masterB` schrijven; `script-act-4.md` §Open 1–3 beantwoorden     | kamers en muren plaatsen, beats koppelen                                                                                                                                         |
| Economie                          | akkoord geven op de spreiding                                                                     | buit voor `master_3` en `master_4` schrijven en baken                                                                                                                            |

## 4. Open beslissingen (met aanbeveling)

1. **Hoeveel master-locks?** Het curriculum wil er 19, met expert-locks die elk twee keer terugkomen. Maar "één puzzel
   per vloer, geen lock twee keer" zegt het tegenovergestelde. _Aanbeveling:_ één lock als sluitstuk per journey, op
   de laatste site, zoals expert dat doet. Dat zijn er 4: `weighingOfTheHeart` (`master_2`, staat al), `masonsRamp` op
   Giza (`master_1`, de bouwplaats), `bathHouse` op `master_3` of `master_4`, en één nieuwe. De andere sites houden hun
   vloersleutels, zoals `lock-placement.md` voor master al zegt.
2. **`bathHouse`:** is het klaar voor `main`, en wordt de `Gate`-reeks een processiedeur (`procession` in plaats van
   `sequence`)? _Aanbeveling:_ zet hem op `main` zoals hij is en speel de processie in de lock-editor voordat je kiest.
3. **De Hal van Osiris zonder geest:** _Aanbeveling:_ schrijf `tomb.masterB`. Elke andere tombe heeft een scène.
4. **De offerboog:** _Aanbeveling:_ beslis vóór de master-release. Bouw je hem niet, verplaats dan `bond.master` naar
   een plek waar hij wel speelt, anders verdwijnt hij.
5. **Activiteiten:** _Aanbeveling:_ ga uit met de 4 die er zijn. De andere 4 kunnen later, want een activiteit
   verzet geen muur.
6. **Open punten van akte 4** (zegel of alleen toestemming; is het kamp van `master_3` te veel een lijk; weigering
   in 4 of 6 regels): _Aanbeveling:_ beantwoorden vóórdat de beats vast worden gezet.

Kleine fouten in de docs, ter info: `lock-placement.md` zet keyring, relay, clockwork, observatory, counterweight en
plates bij "master", maar de bestanden staan in `expert/`. `PUZZLE_FAMILIES.md` noemt nog futoshiki 7×7.

## 5. Afhankelijkheden

- **Junior-freeze:** zolang `src/data/juniorCarve.json` niet op `main` staat, bakt niemand. Er wordt dus geen master-lock
  geplaatst en geen master-buit geschreven tot sessie junior-release de freeze heeft vastgelegd.
- **Expert (sessie expert-prep):** expert gaat eerst uit, want de kar die master opent ligt in de expert-tombe. Het
  art-proces (eerst wall-face, threshold en ward-deur, dan de props) wordt bij expert ingeslepen; master volgt die
  route. Expert levert ook de eerste props van meerdere cellen en de grote kamers; de master-props bouwen daarop
  voort. De expert-locks observatory (legt niet), counterweight en twoStones (niet te bouwen) zijn ook de bouwstenen
  van het master-curriculum: lost expert ze op, dan profiteert master daarvan.
- **Eigen freeze:** als master uitgaat, krijgt het een eigen carve-freeze (`tierCarveFreeze.testing.ts`). Tot die tijd
  mag de master-carve vrij veranderen.
