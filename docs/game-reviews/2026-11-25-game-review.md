# Game review — starter tier

Datum: 2026-11-25 · build: dev (branch `sound-sync`, na v0.48.4)

**Methode:** ~20 min gespeeld als nieuwe speler op telefoonformaat (430×900): kamp, beide starter-reizen,
eerste Blokkade, mozaïek, Alle reizen. Kort op desktop (1440×900) gekeken. Junior en hoger niet gespeeld.
Omvang ingeschat uit de design-docs.

## Wat goed is

- **Fez en de verkenner dragen het spel.** Dialoog echt grappig, spreektaal. "Dat ging snel." / "Het was een
  deur." / "Ik had er een week over gedaan." Of: "Ik ben nou eenmaal een hagedis. Als het mij uitkomt."
  Sterkste troef; geeft het spel een eigen gezicht.
- **Rekenpiramide buiten is een perfecte instap.** Klein bord, regel komt uit de mond van een personage
  ("Elke steen is die twee eronder bij elkaar!") in plaats van een tutorialscherm. Tweede bord vraagt al om
  terugrekenen. Goede opbouw.
- **Binnenkant ziet er goed uit.** Geschilderde tegels en props, fakkellicht, mist die wegtrekt. Voelt als
  plek, niet als spelbord.
- **Puzzels netjes gemaakt.** Blokkade: duidelijke regels, ongedaan maken, hint, toetsen erbij. Toetsenbord en
  controller ondersteund.
- **Kamp is een fijne hub.** Buit-overzicht na een tocht ("Je buit van deze tocht", Uitpakken) voelt als
  thuiskomen. Alle reizen laat in één blik zien waar je staat.

## Wat niet goed is

1. **Twee spellen in één jas.** Binnen en kamp: geschilderde art. Buiten: platte CSS-gradient, gele cirkel als
   zon. Eindschermen: generieke webcomponenten (felblauwe knop, groene kop, grijs "Puzzel Voltooid"-kaartje).
   Op desktop is de buitenpiramide een postzegel in een zee van geel. Elke overgang naar buiten haalt je uit
   de wereld.
2. **Weinig puzzel in de eerste 10 minuten.** Piramide 1 binnen: geen puzzel, alleen lopen, praten, kisten.
   Piramide 2: één. Een nieuwe speler ziet de belofte van een puzzelspel pas laat.
3. **Lopen kost te veel input.** Stap voor stap met pijltjes, ~2 s animatie per stap. Tik op een verre plek
   zet ook maar één stap. In een kamer verschijnen niet altijd de verwachte richtingen. Teruglopen naar een
   bekende uitgang is puur geduld.
4. **Elke vondst is een schermvullende popup**, ook "1 munt". Breekt het ritme. Kleine buit beter als toast of
   icoontje dat naar de teller vliegt; popup bewaren voor fragmenten, kaartdelen, schatten.
5. **Toon zakt op het hoogtepunt.** Na de Fez-regels eindigt de expeditie met "Gefeliciteerd met het voltooien
   van de expeditie!" (verscheen twee keer). Juist daar moet Fez iets zeggen.
6. **Mozaïek beloont te weinig.** Na een hele expeditie één reepje van een zwart vlak (298 stappen totaal).
   Grote lege crèmebanden boven en onder. Werkt pas veel later als beloning.
7. **Gates zonder signaal.** Paarse en groene tralies zonder hint dat ze "voor later" zijn. Als slapende
   content de kern is, moet de speler het zo lezen: slot-icoon of één zin van Fez.

## Kleine dingen

- **Eerste opstart:** popup "Een nieuwe versie! Het spel is flink veranderd… je reis begint opnieuw."
  Mogelijk oude opslag in het testprofiel; checken of een verse installatie die melding krijgt.
- **"Openen" onder een kist** oogt als knop, tikken doet niets (het is een `<p>`); alleen de kist werkt.
- **Puzzelvenster verschoof ~70px** tijdens spelen; sleepacties misten.
- **Camera** zet speler op telefoon vaak bovenin, grote lege donkere vlakte eronder.
- **Alle reizen** zegt "1 van 5 klaar" bij drie zichtbare regels.
- **"⏱ 35s"** op het voltooiingskaartje suggereert tijdsdruk; spel straalt verder nergens haast uit.

## Grotere zorg

Enorme diepte onder de motorkap: ~1566 commits, lock-solver, web-locks, carve-engine, ~20 puzzelfamilies
(deel alleen ontworpen), verhaal in vijf aktes. Uitgebracht: starter en junior. Playtest-backlog ~180 regels
die nog niemand speelde. Engine loopt ver voor op wat een speler ziet. Spel wint meer bij vaker spelen en
polijsten (punten 1–5) dan bij nog een mechaniek.

Doelgroep vraagt om een keuze. Rekenpiramides en Fez-humor wijzen naar kinderen en gezinnen;
metroidvania-sleutels over tiers heen naar volwassen puzzelaars. Beide kan, maar de eerste 20 minuten moeten
één van de twee overtuigen.

## Oordeel

Charmant, vakkundig gebouwd, sterke stem. Voelt nog als verzameling goede onderdelen die niet allemaal in
dezelfde stijl zijn afgewerkt. Cijfer nu **6,5**, met duidelijk pad naar een 8: één visuele stijl overal,
eerder en vaker een echte puzzel, sneller lopen, minder popups.
