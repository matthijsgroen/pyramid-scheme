# Expert: voorstellen voor de drie stand-ins

Drie expert-plekken houden nog een stand-in (`src/worldGen/spec/expert.ts`, `lock-placement.md`):

| plek             | staat er nu                 | bedoeld was                               |
| ---------------- | --------------------------- | ----------------------------------------- |
| expert_3, site 1 | leverSwapsDoors (les)       | counterweight (geeft een waarschuwing)    |
| expert_3, site 2 | dropHome (junior-duplicaat) | observatory (legt niet: bord met 5 wegen) |
| expert_4, site 1 | stoneOnAPlate (les)         | twoStones (geeft een waarschuwing)        |

Per plek twee kandidaten. Ze staan als echte `.lock`-bestanden in `src/game/locks/expert/proposals/`. De catalogus
leest die map mee, dus `yarn lock <naam>` werkt en ze staan in de tabel van `yarn lock`. Ze staan nergens in de
wereld: de bake verandert niet.

Elke kandidaat haalt `yarn lock`: oplosbaar, elke regio bereikbaar, geen doodlopend punt, elke dichte deur gezien
voor zijn bediening, elk stuk draagt. Ik heb ze ook los op het rooster gelegd (zonder vloerinhoud, seeds 1-20):
alle zes leggen 20 van 20; observatory legt er 0. Alleen bestaande mechanieken en realisaties.

Kies je er een, dan: het bestand naar `expert/`, de koppelingen in `LOCK_BINDINGS` (`onFloor.ts`), de plek in
`expert.ts` en de rij in `lock-placement.md`. De andere voorstellen gaan weg.

## expert_3, site 1 — de Nijldelta begint

Waar het voor is: de eerste stenen-lock van de reis. Hij leunt op stoneOnAPlate en dropDown. De les van
counterweight: de zipline neemt geen steen mee, dus een steen gaat een andere weg dan jij.

### quayStairs

Je komt boven binnen, de uitgang staat beneden en wil een steen boven in de loft en een in de cisterne. Beide
stenen liggen boven. De zipline neemt geen steen; de hendel beneden opent óf de trap óf de cisterne. Draag de
steen de trap af en zet de hendel terug, met de steen in je hand.

```
in -- hall
hall -- loft
hall >> well
well -[S]- hall
well -[S:a]- cistern
well -[p+q]- out
S toggle @well
p plate @loft
q plate @cistern
heap plate @loft stone
shelf plate @loft stone
```

- `yarn lock`: 6 acties — in ▸ hall ▸ ⤓well ▸ S:b ▸ hall ▸ loft ▸ steen van heap ▸ op p ▸ steen van shelf ▸ hall
  ▸ well ▸ S:a ▸ cistern ▸ op q ▸ well ▸ out
- Mechanieken: hendel, stenen, val, deur-wacht-op-twee.
- Koppelingen: `toggle: "handle"`, `weights: "stonePlate"`, `"one-way": "zipline"`.
- Lijkt het meest op **counterweight** (twee niveaus, zipline zonder steen) en **throwItBack** (hendel heen en
  terug). Anders: hier opent een hendel de trap, niet een steen van onderen, en dezelfde hendel sluit de cisterne.
  De steen gaat naar beneden en de hendel moet terug terwijl je hem draagt.

### emptyHanded

De uitgang wil een steen in de opslag. Steen en hendel liggen in de groeve; de hendel opent de opslag en sluit de
groeve achter je. De ziplines tussen groeve en opslag nemen geen steen. Dus: steen eerst naar buiten, neerzetten
op het plateau in de yard, dan pas de hendel.

```
in -- yard
yard -[p]- out
yard -[A:a]- quarry
yard -[A]- store
quarry >> store
store >> quarry
A toggle @quarry
p plate @store
rest plate @yard
heap plate @quarry stone
```

- `yarn lock`: 5 acties — in ▸ yard ▸ quarry ▸ steen van heap ▸ yard ▸ op rest ▸ quarry ▸ A:b ▸ ⤓store ▸ yard ▸
  steen van rest ▸ store ▸ op p ▸ yard ▸ out
- Mechanieken: hendel, stenen, val.
- Koppelingen: `toggle: "handle"`, `weights: "stonePlate"`, `"one-way": "zipline"`.
- De zipline terug (store ▸ quarry) is de weg terug voor wie de hendel te vroeg omzet: zonder hem loopt het vast
  (`yarn lock` meldt dan een doodlopend punt).
- Lijkt het meest op **dropHome** en **cellar** (hendel sluit de weg terug, een val brengt je thuis). Anders: daar
  is de val de oplossing; hier is de val het probleem, omdat hij geen steen meeneemt. De volgorde (eerst de steen,
  dan de hendel) is de hele puzzel.

## expert_3, site 2 — bord, prijzen, één val

Waar het voor is: de les van observatory: een bord met drie wegen, prijzen erachter, een val. observatory zelf
legt niet, omdat zijn bord in `in` staat, op de route, en dan vijf wegen nodig heeft. Beide kandidaten zetten het
bord zo dat het past.

### starWell

De uitgang wil twee prijzen. Een zipline laat je in de sterrenput vallen, en het bord daar is de enige weg verder:
oost naar de ene prijs, west naar de andere, en terug naar het hof. Het bord los je drie keer op.

```
in -- court
court -[K+L]- out
court -- gallery
gallery >> well
well -[Y]- court
well -[Y]- east
well -[Y]- west
Y fork @well
K activator @east
L activator @west
```

- `yarn lock`: 5 acties — in ▸ court ▸ gallery ▸ ⤓well ▸ Y:well-east ▸ east ▸ K ▸ well ▸ Y:well-west ▸ west ▸ L
  ▸ well ▸ Y:well-court ▸ court ▸ out
- Mechanieken: bord, prijs (activator), val, deur-wacht-op-twee.
- Koppelingen: `"fork-switch": "lightbeamSwitch"`, `activator: "torch"`, `"one-way": "zipline"`.
- Lijkt het meest op **observatory** (bord met drie wegen, prijzen) en **twoLamps** (de uitgang wil twee dingen,
  het bord geeft er een tegelijk). Anders: je valt ín de kamer van het bord, en de derde weg is de weg naar huis.
  De val is nodig, geen kortere weg, en het bord staat naast de route, dus het legt.

### balconyKey

De uitgang wil de prijs in het oosten, en de oostweg van het bord wacht ook op een sleutel. Die sleutel ligt onder
het noordbalkon: spring de crypte in, en de sleutel daar opent de deur terug naar boven.

```
in -[Y]- north
in -[Y]- -[K]- east
in -[L]- out
north >> crypt
crypt -[K]- north
Y fork @in
K activator @crypt
L activator @east
```

- `yarn lock`: 4 acties — in ▸ Y:in-north ▸ north ▸ ⤓crypt ▸ K ▸ north ▸ in ▸ Y:in-east ▸ east ▸ L ▸ in ▸ out
- Mechanieken: bord, prijs (activator), val.
- Koppelingen: `"fork-switch": "lightbeamSwitch"`, `activator: "torch"`, `"one-way": "zipline"`.
- Een bord met twee wegen, niet drie: in `in` past er niet meer bij.
- Lijkt het meest op **cellar** (val in een cel die zijn eigen sleutel heeft) en **keyring** (sleutelketen).
  Anders: de sleutel opent hier twee deuren, de cel én een weg van het bord, dus het bord moet twee keer.

## expert_4, site 1 — Djoser, de steen komt eerst

Waar het voor is: de eerste lock van de bouwplaats, vóór throughTheWall (pijp en smalle doorgang, site 2) en
scaffold (site 3). Alleen wat al geleerd is: steen, fakkel, tegels. De les van twoStones: een steen die twee keer
werkt. scaffold doet "stut, dan verbruiken" al met twee stenen, dus de kandidaten moeten daar ver genoeg van af.

### proppedVault

De uitgang wil de fakkel in de kluis aan en een steen op het plateau van de dais, en er is één steen. Die houdt
eerst de kluis open terwijl je de fakkel aansteekt, en gaat daarna naar de dais.

```
in -- yard
yard -[T+p]- out
yard -- porch
porch -- dais
yard -[v]- vault
T torch @vault
v plate @porch
p plate @dais
ledge plate @porch stone
```

- `yarn lock`: 5 acties — in ▸ yard ▸ porch ▸ steen van ledge ▸ op v ▸ yard ▸ vault ▸ T aan ▸ yard ▸ porch ▸
  steen van v ▸ dais ▸ op p ▸ porch ▸ yard ▸ out
- Mechanieken: fakkel, stenen, deur-wacht-op-twee.
- Koppelingen: `flame: "torch"`, `weights: "stonePlate"`.
- Lijkt het meest op **twoStones** en **scaffold** (een stut die je later verbruikt). Anders: één steen, niet
  twee; jij zet de stut zelf; achter de stut ligt een fakkel, geen tweede steen. Wel dezelfde familie als
  scaffold, twee sites verder: kies je hem, dan staat "stut en verbruik" twee keer in Djoser.

### stoneSteps

De uitgang wil twee tegels op volgorde: eerst het heiligdom, dan de groeve. Het heiligdom gaat pas open als er een
steen op het plateau in de groeve ligt, en de enige steen ligt daar ook. Je eerste bezoek aan de groeve bederft dus
de reeks: zet de steen, reset bij de deur, en loop de tegels dan in volgorde.

```
in -- yard
yard -[P]- out
yard -- quarry
yard -[h]- shrine
h plate @quarry
heap plate @quarry stone
P sequence shrine quarry reset yard-out
```

- `yarn lock`: 6 acties — in ▸ yard ▸ quarry ▸ tegel fout ▸ steen van heap ▸ op h ▸ yard ▸ reset ▸ shrine ▸ tegel
  1 ▸ yard ▸ quarry ▸ tegel 2 ▸ yard ▸ out
- Mechanieken: tegels, stenen. Onder master heeft geen lock die twee samen; alleen weighingOfTheHeart (master)
  heeft ze allebei.
- Koppelingen: `sequence: "pressure-plate"`, `weights: "stonePlate"`.
- Let op: tegel en steenplateau zijn allebei een plaat op de vloer. Ze moeten er duidelijk anders uitzien.
- Lijkt het meest op **tilesInOrder** en **plates** (tegels op volgorde, de deur reset). Anders: de eerste tegel
  zit achter een deur die een steen openhoudt, en die steen ligt bij de tweede tegel. Het bederven en resetten is
  hier geen fout maar de weg.
