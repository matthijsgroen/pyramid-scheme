# Wizard: wat er moet gebeuren voordat het uit kan

Stand van `main` op 2026-11-13. Dit is alleen een inventaris: er is niets gebouwd of gebakken. Master staat in `../master/readiness.md`.
Wizard is gewoon de hoogste moeilijkheidsgraad. Het komt na master uit, en de tweede ezel uit de master-tombe opent het.
Het einde van het spel (de Sfinx, Hori) zit in deze tier.

## 1. Wat er staat

| Onderdeel               | Stand                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Journeys                | `wizard_1` Ra (4 pyramides), `wizard_2` Sfinx (5), `wizard_3` Kamer van Ma'at (6), `wizard_4` Eeuwige piramide (6). Dat zijn 21 pyramides met elk 2 hoofdvloeren en een ward-vleugel; alles is gebakken. Wizard is de enige tier met vrije volgorde.                                                                                                                                                                                    |
| Tombes                  | De Kluis der Goden, Rijk der Kosmische Krachten en Troon der Eeuwigheid. Elk heeft een grot van 3 vloeren, een tombe van 4 vloeren en een winkel, en alle drie zijn gebakken.                                                                                                                                                                                                                                                           |
| Sfinx-route             | Gebakken. De ward-trap van `starter_1` gaat langs de grot naar de Sfinx: 5 puzzels en dan `reading.sphinx`. Wie de trap opent, beslist de sleutel `wizard_a_1` uit de Kluis. Volgens de handover is die sleutel nog niet te krijgen.                                                                                                                                                                                                    |
| Locks                   | De map `wizard/` is leeg en er is geen enkele lock geplaatst. Ook `chamberOfMaat.web` bestaat nergens, niet op `main` en niet op `designer/lock-drafts`.                                                                                                                                                                                                                                                                                |
| Zandpiramide `wizard_3` | De engine staat: vrije volgorde, buiteninputs, web-regel, walk, rapport, bake-check en `webPulled`. Er staat nog niets in de DSL of in de wereld. Slice 11 wacht op de content van de designer.                                                                                                                                                                                                                                         |
| Puzzels                 | Elke familie heeft een wizard-config: 38–66 per familie in de pyramides, en in de tombes 72 tableau en 12 krokodil. Rolgaten: `wizard_2` heeft geen rol die past, en `wizard_4` (kosmos) wordt maar door één familie bediend (`journeys.md` §9).                                                                                                                                                                                        |
| Kamers                  | Er is geen map `src/game/rooms/wizard/`. Gewenst zijn 9 activiteiten. Er zijn er 4 genoemd (weging van het hart, Nuts hemel, zonnebark, oerwateren), maar geen ervan staat in de code.                                                                                                                                                                                                                                                  |
| Verhaal                 | Gekoppeld zijn `arrival.wizard_1..4`, `tomb.wizard`, `tomb.wizardB`, `tomb.wizardC`, `bond.wizard`, `revisit.wizard.*` en `reading.sphinx`. Als concept bestaan de 9 beats voor grot, pilaar en grot-zaal, en `camp.chapterWizard`. Wel geschreven maar nooit afgevuurd: `end.1-2`, het einde, waarvan de plek nog niet beslist is. `formula.wizard.*` heeft geen muur. `reading.wizard` bestaat niet.                                  |
| Art                     | De vloer is geschilderd (#330). `wall-face` en `threshold` staan in de queue, nog met de oude art. Voor `door/ward-wizard` is er een bestand maar geen prompt. De 16 godenprops (onder andere `chestProp`), de 6 patroonvarianten, rubbleSpill en mat staan in de queue en zijn nu placeholders. De Sfinx-vloer is geschilderd; de andere 3 Sfinx-vlakken en het naampaneel staan in de queue. Er zijn geen landmarks behalve de Sfinx. |
| Economie                | 1048 puzzelkamers, waarvan 379 met buit (36 %). Verder 59 kisten, 275 padeinden, 13 dingen in de winkel, 214 vallen en 113 waterzakken. De stevige kar opent tombe `_b` en het karavaanvaandel opent niets.                                                                                                                                                                                                                             |

## 2. Wat ontbreekt, op volgorde van wat een speler het eerst mist

| #   | Gat                                                                                                                                                                                                 | Waar de speler het ziet                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 1   | Props zijn nog placeholders, de `light`-mechanismen staan op `default` en `wall-face` en `threshold` zijn de oude art                                                                               | Op de eerste wizard-vloer                |
| 2   | Er staat geen enkele lock op de 21 wizard-sites                                                                                                                                                     | Op de eerste wizard-vloer                |
| 3   | Het zandweb van `wizard_3` ontbreekt: het web zelf, de wizard-locks met buiteninputs en het bouwen ervan. Zonder dit is `wizard_3` gewoon een piramide en ontbreekt het kenmerk van de tier.        | Zodra de speler bij `wizard_3` aankomt   |
| 4   | Er zijn geen kamers en geen activiteiten (0 van de 9)                                                                                                                                               | Meteen                                   |
| 5   | Voor `wardChest`, `wardChestOpen`, `chestPropOpen` en `door/ward-wizard` is geen prompt                                                                                                             | Bij de eerste ward-vleugel               |
| 6   | Buit: `wizard_3` en `wizard_4` krijgen 10–15 % buit en geen puzzelgeld                                                                                                                              | Bij de grote journeys                    |
| 7   | Tombes: de concept-beats moeten vastgesteld worden. De formulemuur van wizard is niet geplaatst, dus de hint speelt nooit. `reading.wizard` ontbreekt.                                              | In de tombes                             |
| 8   | De sleutel van de Kluis moet te krijgen zijn, en de route naar de Sfinx moet een keer helemaal gelopen worden (ward-trap, grot, klim, 5 puzzels)                                                    | Aan het einde                            |
| 9   | Beats onderweg naar de Sfinx (de eerste vloer, de grot, de klim, warm licht op de laatste trap), even rondkijken op de Sfinx-vloer, en de Sfinx-vlakken plus de inscriptie in 2 standen geschilderd | Aan het einde                            |
| 10  | `end.1-2` moet ergens afgevuurd worden. Nu heeft het spel geen einde.                                                                                                                               | Allerlaatst, en het blokkeert de release |
| 11  | Fez' regel bij het vrijmaken van het zand, en het notitieboek van `wizard_b` (een encounterfamilie die nog niet gebouwd is)                                                                         | `wizard_3` en `wizard_b`                 |

## 3. Wie maakt wat

| Werk                                | Designer                                                                                                           | Claude                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Wizard-locks en `chamberOfMaat.web` | schrijft beide: blokken, plekken, zandpotten, sleutels en bindingen                                                | slice 11: het web in de DSL, de locks plaatsen, baken, de bake-check groen krijgen                                            |
| Art                                 | schildert via `yarn repaint` (wall-face, threshold, 16 props, patroonvarianten, de Sfinx-vlakken en de inscriptie) | schrijft de ontbrekende prompts, importeert en zet het in `rebuild.sh` (de wizard- en Sfinx-vloer hebben daar nog geen regel) |
| Kamers                              | noemt de 5 ontbrekende activiteiten, of besluit dat 4 genoeg is                                                    | prefabs en activiteiten                                                                                                       |
| Verhaal                             | stelt de concepten vast, schrijft de beats naar de Sfinx en Fez' zandregel, en beantwoordt `script-act-5.md` §Open | plaatst de muren, koppelt het einde en de beats, en zorgt dat de sleutel te krijgen is                                        |
| Economie                            | geeft akkoord                                                                                                      | schrijft buit voor `wizard_3` en `wizard_4`                                                                                   |

## 4. Open beslissingen (met aanbeveling)

1. **Waar speelt het einde (`end.1-2`)?** _Aanbeveling:_ direct na `reading.sphinx`, op de Sfinx-vloer, en daarna
   opgenomen in het verhaallogboek (`ALL_SCENES`).
2. **Hoeveel wizard-locks?** _Aanbeveling:_ eerst alleen wat het web nodig heeft, dus de locks waarvan `wizard_3`
   buiteninputs vraagt. Daarna één sluitstuk per journey. De rest houdt vloersleutels, net als bij master.
3. **Het web klein beginnen?** _Aanbeveling:_ ja. Eén journey met hendels en één zandpot voor de hele `wizard_3`
   bewijst slice 11 van begin tot eind. Daarna uitbreiden.
4. **Rolgaten (`wizard_2` zonder rol, `wizard_4` met één familie):** _Aanbeveling:_ accepteren voor deze release.
   Nieuwe families volgen de ranglijst in `journeys.md` §9, waar funerair het grootste gat is, niet de tier.
5. **`reading.wizard`:** _Aanbeveling:_ schrappen. Bij wizard is de Sfinx de leesmuur, en de formulemuur van de tombe
   (`formula.wizard`) is genoeg.
6. **Open punten van akte 5** (de pauze na "Whose?", het notitieboek dat te netjes is, "I have been selling the
   walls", wat er wegvalt zonder offerboog): _Aanbeveling:_ beantwoorden samen met de master-beslissing over de
   offerboog. Die hangen samen.

## 5. Afhankelijkheden

- **Junior-freeze:** er wordt niet gebakken tot `src/data/juniorCarve.json` op `main` staat. PR #382 verplaatst één
  wizard-kist, en daarvoor is eerst de keuze van de designer nodig.
- **Expert en master:** wizard gaat pas uit na master, en master pas na expert. De art-route en de props van meerdere
  cellen komen via expert (sessie expert-prep). De mechanieken die master nog mist (counterweight, twoStones) en de
  beslissing over de offerboog raken ook wizard.
- **Engine:** de zandpiramide staat op `main`. Er is geen engine-werk dat het web blokkeert, alleen de content.
- **Eigen freeze:** bij de release komt er een wizard-carve-freeze. Tot dan mag de carve vrij veranderen.
