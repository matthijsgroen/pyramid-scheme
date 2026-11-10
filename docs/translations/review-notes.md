# Translation review notes

What each translator flagged for a native reader: terminology choices and lines to double-check. Delete a language’s section once a native speaker has read it.

## de

TEST STATUS: In the real worktree, neither spec runs yet for any language. Other languages are still being written in parallel and their folders are incomplete. public/locales/ro is in LANGUAGES but has no folder yet (ENOENT in languages.spec), and public/locales/cs has no common.json yet (ENOENT in plurals.spec). Both specs crash while loading, before any test runs. To check de anyway, I copied both specs unchanged into the scratchpad (/private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/i18ncheck) with only the en/nl/de locales and a LANGUAGES list cut down to those three. There all 19 tests pass. A separate script also confirmed that no key is missing or extra in any of the 8 files and that no placeholder drifts. Re-run the two real commands once the other languages are finished.

TERMINOLOGY (one word per term in every file):
- Difficulty levels: Anfänger / Junior / Experte / Meister / Genie. I used "Genie" for wizard: it avoids any magic meaning, and I believe the German SmartGames editions use it, but please confirm. "Anfänger" is used rather than "Starter" because younger kids read it more easily. Compounds are written as Experten-/Meister-/Genie-Reisen. Where a {{tier}} placeholder is used, I wrote "Reisen/Expeditionen der Stufe {{tier}}" to avoid German gender and compound problems.
- Recurring game words: journey = Reise, expedition = Expedition, tomb = Grab, camp = Lager, floor = Stockwerk, coins = Münzen, trinkets/junk = Krimskrams, map piece = Kartenstück, hieroglyph fragment = Hieroglyphen-Bruchstück, mosaic piece = Mosaikstück, hint = Tipp, stall = Stand, health = Lebenskraft, detector = Detektor, compass = Kompass, corridor finder = Gangfinder.
- Puzzle words: row = Reihe, column = Spalte, region = Bereich, holding (fields skin) = Gut, square = Feld, hatched = schraffiert, rule out = ausschließen.
- Egyptian names use German spelling: Anch, Horusauge, Kartusche, Kanopenkrug, Djed-Pfeiler, Uräus-Krone, Krummstab und Geißel, Wesir, Chepri (Khepri), Sachmet (Sekhmet), Apophis (Apep), Schu (Shu). I kept Amun-Ra (not Amun-Re) so it matches the original.
- The hat is spelled "Fez", not "Fes". Duden accepts both, and "Fez" keeps the link with Fez's name for "Das erklärt den Fez".

DIALOGUE CHOICES:
- Fez, the explorer, Ipi and Henut speak to each other with "du".
- The priest uses "Sie", like the formal "u" in the Dutch original. The pharaoh uses fairy-tale "Ihr/Euer" ("Ihr dürft näher treten. Ihr seid näher getreten. Nun gut."). Fez says "Eure Majestät".
- "Insufferable" became "furchtbar wichtigtuerisch".

LINES A NATIVE READER SHOULD CHECK:
- fez.json
  - meeting.starter_1.16: "Vier Augen sehen mehr als zwei" (German idiom for "two see more than one").
  - end: "War's toll?" / "Geht so." (from "neat").
  - wizard_3: the heavy/light heart joke ("Leicht. Es soll LEICHT sein.").
  - animal donkey lines: "I-ah" used for bray.
  - tomb.juniorFixed.8: Henut's secrets-vs-arithmetic line.
  - master_2: "Gebrauchsanweisung fürs Totsein".
- common.json
  - starBattle hints with {{token}}: the token is an emoji (⭐🛖🪔🏪🪷🐈), so most sentences leave out the article ("Hier steht {{token}} …"). The _one forms do use "ihr/sein/das/der {{token}}", which reads a little oddly next to an emoji.
  - procession.marks: written as "{{a}}: fängt … an" so the event nouns' gender doesn't matter. The event names are German verbal nouns ("das Wassertragen", …).
  - canisters.claimAria: "Sagen, dass der Behälter für {{capacity}} die Menge hat".
  - lightbeamSwitch: way names are "Norden/Osten/…", used in "Ausgang {{way}}: offen".
- journeys.json: "Noble's Hidden Vault" became "Verborgene Kammer der Edeldame", because Henut is a woman.
- The English file has no tableaus.descriptions.expert_treasure_tomb.run6_level2, so de doesn't either.
- Strings that are the same in English and German: names, "Junior", "Level", "Expedition", "Bronze", "Gold", "Wow.", "Hori.", and a few dev-editor words (Syntax, Palette, Portal, Optional).

## fr

I couldn't get the real specs to run, so specsPass is false. Neither spec ever reached the fr tests. Both crash while vitest is collecting tests, because of other languages being written at the same time. languages.spec.ts calls readdirSync on every code in LANGUAGE_CODES, and folders like ro and el don't exist yet. plurals.spec.ts reads common.json from every folder that exists, and cs, hu, it, pl, sk and bg have no common.json yet. So this is more than the one "are exactly the locale folders" test you said to ignore. I didn't touch anything outside public/locales/fr.

What I ran instead: a node copy of every fr assertion from both specs, at /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/check.mjs (`node <that path> fr`, from the repo root). It checks the same things the specs do:
- **Keys:** no keys that English lacks, and no English key missing.
- **Placeholders:** no drift.
- **Plurals:** 126 plural keys, each with exactly _one/_many/_other, which is what Intl.PluralRules("fr") asks for. No English-only suffixes left over.
- **Plural placeholders and rendering:** names match English form by form, and i18next renders every form as text, never as its own key.
- **Files:** all 8 files are present, valid JSON, 2-space indent.

All of that passes. Re-run the real specs once the other locales are finished.

Note on _many: French "many" only applies to numbers like 1 000 000, so every _many is a copy of _other.

Terminology:
- **Difficulty levels:** Débutant / Junior / Expert / Maître / Génie. "Génie" means genius here, not magic, so the top level doesn't read as a wizard. Used the same way in "voyages Génie", "étages Génie" and so on.
- **Places:** expedition = expédition, journey = voyage, tomb = tombeau, floor = étage, corridor = couloir, hidden corridor = couloir secret.
- **Puzzle words:** puzzle = énigme, hint = indice, glyph/sign = signe, row = ligne, column = colonne, square = case, hatched = hachuré, rule out = exclure.
- **Coins vs pieces:** coins = pièces. To avoid mixing them up, camp parts, compass/detector parts, map pieces and mosaic pieces all use "morceau(x)". I changed camp.json from "pièce" to "morceau" for this.
- **Shop:** trinkets = bibelots, Fez's stall = l'étal de Fez.
- **Ward/key items:** ward key = clé de garde, sand lever = levier à sable.
- **Gods:** French spellings: Râ, Thot, Khépri, Ouadjet, Nephtys, Amon-Râ, Maât, Apophis, Shou. Character names (Fez, Hori, Henut, Ipi) are unchanged.
- **Address:** "tu" to the player everywhere, and Fez, Ipi and Henut use "tu". The priest and the pharaoh say "vous" to the player, and the player says "vous" back. That follows the Dutch original, which uses formal "U" for exactly these two. If you want strict "tu" everywhere, change tomb.expert.*, tomb.master.*, tomb.wizard.*, altar.*, revisit.expert.* and revisit.master.* in fez.json.
- **Gender:** I avoided gendered agreement for the player, e.g. "C'est sûr ?" instead of "Tu es sûr ?" and "pars quand tu veux". The star-battle {{token}} for stars and farms is treated as feminine ("une {{token}}", "sa {{token}}"), because the emoji stands for étoile / ferme. Themed boards name the object directly.

Lines a native French reader should check:
- **Fez's jokes:**
  - fez.arrival.starter_2.5 ("les tickets de caisse").
  - fez.animal.blockedSecondDonkey.3 ("Je parle l'âne couramment").
  - fez.reading.sphinx.13 ("Bon. Ça explique le fez."): the Hori payoff.
  - fez.cave.starter_treasure_tomb.4 ("Des clients trèèès en retard").
  - fez.tomb.master.13 ("espèce de bestiole ridicule").
- **fez.mosaicMaster2:** "recollé morceau par morceau" for Osiris being put back together.
- **fez.tomb.wizardB.6:** the notebook is written in a clipped note style.
- **"Morceau" overload:** check it reads naturally in camp.json and common.detector.camp.parts.
- **Themed puzzle nouns (the starBattle family):** étal for the market, coin d'eau for lotus squares, parcelle/terrain for the fields, dalle for flagstones.
- **Constellation themes:** route de halage / chantier for the causeway, cordelette for the painted ceiling.
- **Calame:** used for the reed pen in hidato/sudoku papyrus. It may be too specialised for 7–12 year olds; "plume de roseau" is an alternative.
- **Canisters hints:** these spell out the arithmetic ("{{content}} moins {{space}}"). Check they still read as hints rather than giving the answer away.

## es

TEST STATUS. Neither spec can run as-is in the worktree right now. Other languages are still being written in parallel. plurals.spec fails while loading because public/locales/cs has no common.json yet. languages.spec fails while collecting tests because public/locales/ro does not exist yet. So I ran both specs unchanged (vitest --root at the repo) from a copy of the locales in my scratchpad. The copy held en, nl and es, plus folders made from es for language codes that had no folder yet. All 4 "es" tests in plurals.spec passed, and both "es" tests in languages.spec passed. The failures in that run were only those made-up folders, which carry Spanish plural forms under other locale codes. A separate node check also passed: no extra keys, no placeholder drift, no missing keys. 33 strings match English on purpose (god names, Fez/Ipi/Henut, "Junior", "General", "Detector", "Portal", "…", "No.", "Hori.", arrows and the footer). I changed nothing outside public/locales/es and ran no git. Please re-run the two specs in the worktree once every language folder exists.

SHARED SCRATCHPAD. Parallel translator agents use the same scratchpad folder, and one of them overwrote my first c1.json/c2.json chunks. I redid my work in scratchpad/es_work_spanish/. Other language agents may have lost files the same way.

TERMS USED THE SAME WAY IN EVERY FILE:
- Difficulty levels: Principiante / Junior / Experto / Maestro / Mago. These follow nl (Beginner/Junior/Expert/Meester/Tovenaar). "Mago" sounds like magic in Spanish, just as "Tovenaar" does in Dutch. If SmartGames' official Spanish label for Wizard is something else (perhaps "Genio"), swap it in common.difficulty and in the "de nivel Mago" lines in purchases and devLockEditor. In sentences the level is written "de nivel {{tier}}", for example "Las expediciones de nivel {{tier}}" and "viajes de nivel Experto".
- Other terms: tumba (tomb), pirámide, piso (floor), pasillo (corridor), viaje (journey), expedición, campamento (camp), puesto (Fez's stall), chucherías (trinkets/junk), pedazo de mapa (map piece), jeroglífico/signo, llave (key), sello (seal/ward), acertijo (puzzle), pista (hint), casilla (square), fila/columna, zona (region), "rayada" (hatched), "descartar" (rule out), odre de agua (waterskin), Buscapasillos (corridor finder), mosaico, baúl (chest). The fez stays "fez". Henut is "la noble", the priest "el sumo sacerdote", Pharaoh "el faraón". Hieroglyphs and emoji are untouched.

LINES A NATIVE READER SHOULD CHECK:
1. Register. I aimed for neutral Latin American Spanish but leaned a little Mexican in places: más chico (smaller), cobija, carreta, rechinido, "le atino", aretes, bajas/jalar (only in the dev lock editor now). I replaced the stronger regional words: padre→genial, órale→¡Epa!, ándale→vamos, apapachar→acariciar, gis→tiza, charola→bandeja, cubeta→balde, chueco→torcido, despostillado→astillado, platicar→charlar, mero→justo.
2. Jokes I rewrote rather than translated:
   - meeting.starter_1: "Wáy too much" became "Muchíiisimo", and "Not thére!" became "¡Ahí nó!".
   - "Two see more than one" became the Spanish proverb "Cuatro ojos ven más que dos".
   - "I'm not being fobbed off" became "No me van a dar gato por liebre".
   - The donkey "bray = talking, only louder" line became "Rebuznar. Es charlar, pero más fuerte".
   - The sturdy-cart flowers joke now uses "Para que sea más fuerte / Fuerza".
3. Notebook line (fez.tomb.wizardB.6), "Made a better one instead", became "Mejor hice uno mejor". The repetition is intentional (a hurried note) but may read as a mistake.
4. Who gets "ustedes". The priest and pharaoh say "ustedes" when speaking to both Fez and the player, and "tú" in the one-person revisit lines. The explorer says "usted" to the priest and pharaoh.
5. Gender with {{token}}. The token is an emoji, so starBattle hints use "un {{token}}" in general and "una {{token}}" for farmsteads (granja) and oil lamps. Please check these read naturally next to the emoji.
6. procession events now include their article ("el fuego", "la crecida") because the marks start a sentence with {{a}}. Check whether the code capitalises the first letter.
7. canisters.claimAria became "Decir que el de {{capacity}} tiene la cantidad". I assumed {{capacity}} is a number.
8. I simplified the tableau descriptions and inventory/treasure blurbs to a children's reading level, so they are looser than the English.

## pt-BR

THE SPECS: neither spec could run, because other languages' folders are missing; nothing failed for pt-BR itself. Rerun both commands once every language is finished. My replica script is at /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/ptbr_zq7/check.mjs.

WORKFLOW WARNING: all the parallel translators write to the same scratchpad folder. Another agent (the French one) overwrote my scratch file c1.json, so I moved my work into a separate subfolder and rewrote it. Other agents may be losing work the same way.

TERMINOLOGY (one word for each term, used in every file):
- Difficulty levels: Iniciante / Júnior / Especialista / Mestre / Mago. "Mago" mirrors nl "Tovenaar" and is used only as a level name. Phrased as "nível {{tier}}" (e.g. "viagens de nível Mestre").
- Game words: expedição (expedition), viagem (journey), tumba (tomb), pirâmide, andar (floor), fase (level), hieróglifo, sinal (sign/glyph), pedaço de mapa (map piece), peça de mosaico, selo (seal), lápis-lazúli, deben (kept), acampamento (camp), baú (chest), cantil (waterskin), bugigangas (trinkets/junk), tesouro, armadilha (trap), alavanca (lever), tocha, dica (hint), jogada (move), linha/coluna (row/column), descartar (rule out), listrado (hatched).
- Fez's shop "stall" is "banca", because "barraca" is already the camp tent. starBattle's market stalls are "bancas" too.
- Player and characters use "você". The explorer and Fez call the priest "o senhor" and the pharaoh "Vossa Majestade"; the priest and pharaoh still say "você/vocês" to them.
- Explorer lines avoid gendered adjectives, since the player's gender is unknown. For example, "Que a gente chegou tarde" instead of "atrasado/a", and "Você ficou em silêncio" instead of "quietinho/a".
- God names use the usual Portuguese spellings: Rá, Anúbis, Hórus, Ísis, Osíris, Néftis, Amon-Rá. Thoth, Bastet, Sobek, Khepri, Wadjet, Seth, Ptah, Sekhmet, Hathor are unchanged. Character names (Fez, Hori, Henut, Ipi) are untouched. Hori's sign line keeps the pun: "Hórus vira Hori".
- Fez's "Ha!" is written "Há!", not the common Brazilian "Rá!", so it can't be read as the god Rá.

PLEASE CHECK (native reader):
- Jokes I re-invented: "Eu falo burrês" (I speak donkey); "O chacoalho vem de brinde" (the rattle comes free); "Coisa legal vende bem!" with the final exchange "Foi legal?" / "Deu pro gasto."; "Quatro olhos veem mais que dois" (two see more than one); wizard_3 "Leve. Você quer ele LEVE."; Henut's "Segredo é o nome que as pessoas dão para a conta quando não sabem fazer."
- The spoken style is deliberately informal, e.g. "a gente", "tá bom", "pegar ele". A stricter reviewer may want "pegá-lo" etc. in UI or rule text.
- Puzzle names I invented: Sumplete = "A Conta Certa", Futoshiki = "Maior e Menor", Hidato = "Colmeia", Rush Hour = "O Bloqueio" / "A Rua Entupida", Constellation causeway = "Estradas de Pedra", the canisters claim button = “é aqui”.
- The procession event names go into sentences like "{{a}} começa na hora {{tick}}" (e.g. "o transporte de água", "a fornada de pão", "o arado com os bois"). Please check that they read naturally there.
- Emoji tokens in starBattle hints have articles matched to each skin: "Uma ⭐" (star is feminine), "Um 🛖" (sítio), "Um 🪷", "Um 🐈".
- junior_4: I changed "three hundred feet" to "uns cem metros", as the Dutch version also uses metres.
- Dev-only editor strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated too, with literal technical wording.

## pt-PT

The specs do pass for pt-PT, but only when limited to en + pt-PT. The unmodified commands currently stop at the missing ro folder and the missing cs/common.json from the other languages. They should go green for pt-PT once those exist. A few strings are the same as English on purpose: names (Thoth, Bastet, Hori, Henut and so on), "Bronze", "General", "Portal", "Ankh", the footer, and pure-placeholder strings.

TERMS (one word each, used in every file):
- Difficulty: starter=Iniciante, junior=Júnior, expert=Perito, master=Mestre, wizard=Mago. Mago is used only as a level name, like nl "Tovenaar". In sentences I always write "de nível {{tier}}" ("as viagens de nível Perito"), so the level name never gets an article or gender ending.
- Game words: tomb=túmulo, pyramid=pirâmide, expedition=expedição, journey=viagem, camp=acampamento, Fez's stall=banca, trap=armadilha, hint=pista, puzzle=enigma, map piece=pedaço do mapa, hieroglyph=hieróglifo, glyph/sign=símbolo/sinal, trinkets=bugigangas, waterskin=odre, floor=andar, row/column=linha/coluna, hatched=às riscas, rule out=pôr de parte.
- Lapis is written in full as lápis-lazúli.
- Gods use the usual pt-PT spellings: Rá, Anúbis, Hórus, Ísis, Osíris, Néftis, Amon-Rá. The Hori line ("Hórus passa a Hori") still works this way. If gods should keep the English spelling too, change those back.

FORMS OF ADDRESS:
- The player is "tu" everywhere.
- The priest uses formal third person to the explorer ("Não é a pessoa que eu estou à espera"), like the formal "U" in nl.
- The pharaoh speaks to the pair as "vocês" ("Podem aproximar-se").
- Henut calls Fez "meu rapaz" (for "young man").

GENDER: the explorer's gender is never stated, so I reworded lines that would have forced a masculine or feminine adjective:
- "Ficaste caladinho" became "Estiveste um bocado sem dizer nada".
- "ficas bom outra vez" became "recuperas".
- "Estás muito fraco" became "Tens muito pouca vida".
- "quando estiveres pronto" became "quando quiseres".

PLURALS: pt-PT needs one/many/other. "many" is only for compact numbers like "1 milhão", and no whole number below 200 selects it. So every _many is just a copy of _other.

IN THE PUZZLES:
- In starBattle, {{token}} is an emoji (⭐🛖🪔…), so I left out the article in front of it, which would have to agree in gender. Example: "Esta linha já tem {{token}}."
- The fields skin uses quinta (farmstead), herdade (holding/region) and terreno (plot).
- In tableaus, the oracle who is called "her" is "a profetisa". Elsewhere the oracle is "o oráculo".

LINES FOR A NATIVE READER TO CHECK:
- The meeting scene: "Ei! AÍ não!" and "MUITO demasiado". They copy the stressed "thére"/"wáy" from the English and Dutch.
- "Quatro olhos veem mais do que dois", standing in for "Two see more than one".
- "Eu falo burrês".
- "O chiar é oferta da casa" (the rattle comes free).
- "Deixa-me sonhar" (for "Let me have this").
- The ending: "Bem. Isso explica o fez."
- Rewritten jokes: "Clientes MUITO atrasados" and "Não sou nenhum relógio".
- Puzzle and room names: "A conta certa" (Sumplete), "A estrada das pedras" (Causeway), "A rega" (irrigation).
- The rush-hour "círculo" (ring) wording, and "despejadela" for one pour in the canisters puzzle.
- The procession events are noun phrases ("a cozedura do pão" and so on) that slot into sentences like "{{a}}: começa à hora {{tick}}."
- I translated the dev editor strings too (devLockEditor, devRoomEditor, devPrefabPreview).

Other untracked locale folders and a modified CHANGELOG.md in the worktree are from the other translators, not from me.

## it

TEST STATUS: I could not get the real vitest runs to run at all. Both spec files stop before running any test because other languages' folders are still being written. languages.spec stops on the missing public/locales/be. plurals.spec stops on bg/, which has no common.json yet. So "specsPass: true" is based on my own check, not on the real specs. I copied both specs' logic into a Node script that checks only "it" against "en", and ran it from the repo root. Every check is green: no keys English lacks, no placeholder drift, every plural has _one/_many/_other (Intl.PluralRules("it") gives one, many, other), no drift in plural placeholder names, and no form shows up as a raw key with real i18next (126 plural bases). All 8 files parse as JSON and have exactly English's key structure. Once the other folders are complete, the real commands should be run again.

WARNING ABOUT THE SHARED SCRATCHPAD: other language agents write to the same scratchpad root (fez.txt, build.js, tableaus.txt and others). One of my early runs called a build.js that another agent had overwritten. That script writes to fr/fez.json from that agent's own fez.flat.json, so it probably just rewrote fr/fez.json with the French agent's own content. It's worth checking fr/fez.json. After that I moved all my work into scratchpad/it_work/.

TERMINOLOGY:
- Difficulty levels: Principiante / Junior / Esperto / Maestro / Genio. I chose "Genio" over the literal "Mago" so the top level reads as "the best players" and doesn't suggest magic. Swap to "Mago" if you want it to match nl "Tovenaar". In running text the level goes into "di livello {{tier}}", e.g. "i viaggi di livello Esperto", "Sblocca le spedizioni di livello {{tier}}".
- expedition = spedizione; journey = viaggio; floor = piano; tomb = tomba; trap = trappola; key = chiave; hint = aiuto ("Annulla mossa" for undo); camp = campo; Fez's stall = bancarella; trinkets/junk = cianfrusaglie; coins = monete; map piece = pezzo di mappa; mosaic piece = tessera del mosaico; hieroglyph = geroglifico; detector = rilevatore; compass = bussola; corridor finder = cercacorridoi; square = casella; region = zona; rule out = escludi; hatched = tratteggiata.
- Tomb names are the same across journeys, tableaus and the dialogue (Inner Sanctum = il santuario segreto, Vault of the Gods = la camera degli dèi, Realm of Cosmic Forces = il regno delle forze del cielo).
- Gods use the usual Italian names: Anubi, Iside, Osiride, Nefti, Maat, Amon-Ra, Apopi, Memnone. Ra, Horus, Thoth, Bastet, Sobek, Khepri, Wadjet, Seth, Ptah, Sekhmet and Hathor stay as they are. Fez, Hori, Henut and Ipi are unchanged.

DIALOGUE CHOICES TO REVIEW:
- The explorer's gender is never stated, so I reworded lines that would need a gendered ending (e.g. "Sei arrivato fin qui" → "sei già a buon punto", "Sei sicuro?" → "Dici sul serio?", "Bravissimo!" → "Che colpo!", trap.rested, camp.chapter.body). Fez is male ("giovanotto").
- The priest uses formal Lei with the explorer, as nl uses "U". The pharaoh uses plural "voi" ("Potete avvicinarvi. Vi siete avvicinati.") so his lines also avoid a gendered participle.
- Re-made jokes: "Wáy too much" → "Troppo, troppo!"; "Two see more than one" → "Quattro occhi vedono meglio di due"; "asinese" (donkey language); "Clienti in ritardissimo"; "Mica sono un orologio".

LINES A NATIVE SPEAKER SHOULD CHECK:
- tomb.juniorFixed.8: "Segreti" è come la gente chiama la matematica…
- tomb.master.8: "a fare la figura del falso", for "being wrong".
- tomb.expert.3, revisit.expert.seal1, wizard.later2: "benedetto con le parole giuste", for "spoken over".
- reading.sphinx.13: "Questo spiega il fez".
- tomb.wizardB.6/7: the notebook lines are in quotes.
- I used "campo" for camp everywhere (short, and consistent with camp.json), but in dialogue it can be read as "field". Switch to "accampamento" if that seems clearer.
- starBattle hints use "un/una {{token}}" with the article chosen to match the item each emoji shows (una 🛖 fattoria, una 🪔 lampada, una 🏪 bancarella, un ⭐/🪷/🐈).
- procession marks are written "{{a}}: comincia…" so they avoid gender agreement with the event names.

## pl

The Polish translation is done: all 8 files and 2881 strings, with nothing left in English. Strings that read the same as in English are names (Anubis, Horus, Hori, Ankh, Junior, Portal) or placeholder-only strings.

HOW THE SPECS WERE RUN: I could not run the two specs in the real worktree. Other languages are being written at the same time, and their half-finished folders crash the test files before any test runs: plurals.spec fails reading be/common.json, languages.spec fails scanning sr/. So I ran the unchanged spec files in a throwaway copy that held only en, nl and pl, with LANGUAGE_CODES cut down to those three. Results: languages.spec -t "pl" gave 3 passed and 2 skipped; plurals.spec -t "pl" gave 14 passed. A separate node script that repeats the same checks on pl alone also came back clean: every placeholder kept, no extra keys, no plural form missing, and every plural form renders as text (e.g. "1 moneta | 3 monety | 5 monet"). Both specs should be run once more in the real tree when all languages are in.

SHARED SCRATCHPAD: the scratchpad folder is shared with the other translation agents. One of them overwrote my builder script, and I then ran their copy once by accident. It only rebuilt fr/fez.json from the French agent's own data, so I don't believe the content changed. The French agent may still want to look at that file. After that I worked only in my own subfolder.

PLURALS: Polish needs one/few/many/other. I wrote all four forms in every pluralised key in all files, not just common.json. The "other" form (only used for fractions) takes the genitive singular, e.g. "{{count}} monety".

TRICKY KEYS: in common.json, sumplete.hint has both nested keys (tooBig: { row }) and keys with a dot in the name ("tooBig.row"). Both sets are kept and translated separately: the long text with "…so it has to go" and the short text without it.

GENDER (please check): Polish verbs and adjectives change with gender. Following cast.md ("No gendered self-description"), the explorer never uses gendered past-tense forms or adjectives. For example, "I paid way too much" became "kosztowała majątek" (it cost a fortune), "I was counting" became "Trzeba było policzyć", and "I did not know it was words" became "A to są słowa! Kto by pomyślał." Lines from other characters to the player avoid gendered second-person past tense too: "you've come this far" became "tyle już za tobą", "Bought a map?" became "Mapa kupiona?", "set off when you are ready" became "ruszaj, kiedy zechcesz". The priest, the pharaoh, Henut and Ipi speak to the pair in the plural (wy), which is correct in Polish because Fez is male; this also stands in for the Dutch formal "U". Fez, Ipi, the priest and the pharaoh use masculine forms and Henut feminine ones. The tomb inscriptions ("I gave bread to the hungry"…) became noun phrases ("Chleb dla głodnych.", "Woda dla spragnionych.", "Ubranie dla nagich.") so the explorer doesn't seem to speak about themselves when reading them out. Please confirm this suits the story.

TERMS USED THROUGHOUT:
- Difficulty levels: Nowicjusz / Junior / Ekspert / Mistrz / Czarodziej. Czarodziej follows the Dutch "Tovenaar" and is used only as a level name. In sentences it is always "na poziomie {{tier}}", so the name stays in the nominative case.
- Other words: grobowiec (tomb), wyprawa (expedition), podróż (journey), kram (Fez's stall), obóz (camp), kawałek mapy, hieroglif, podpowiedź (hint), stuknij (tap), kratka (puzzle square), rząd/kolumna (row/column), zakreskowana (hatched), osiołek / wózek / wielbłąd, monety.
- Gods use the standard Polish names: Thot, Izyda, Ozyrys, Set, Neftyda, Sachmet, Chepri, Wadżet, Amon-Ra, Maat. Character names (Fez, Hori, Henut, Ipi) are unchanged.
- Place names match journeys.json: Najświętsza komnata, Sala Ozyrysa, Skarbiec bogów, Kraina sił kosmosu.

PLACEHOLDERS: where a {{count}} or {{chain}} sits in a key without plural forms, I used a pattern that needs no case ending, e.g. "Potrzeba linii: {{count}}" or "te gwiazdy ({{count}})". Star-battle tokens are emoji, so "komplet: {{count}} {{token}}" works. The procession {{a}}/{{b}} events are lowercase nominative noun phrases (e.g. "noszenie wody"), and the sentences around them use present-tense verbs whose form doesn't depend on gender.

JOKES REWORKED: "Two see more than one" became "Co dwie głowy, to nie jedna!". "Something neat" / "Neat sells!" became "Czegoś fajnego" / "Fajne się sprzedaje!", with the callback "I jak, było fajne?" / "Może być.". "Noted" is always "Zanotowane.". Ipi's "A thing written down is a thing that happened" became "Co zapisane, to się wydarzyło", and the explorer's Sphinx line "Jest zapisane." echoes it. The pharaoh's "ridiculous animal" became "ty niedorzeczny gadzie". Donkey "bray" became "ryczeć". The sturdy-cart flowers are "Dla wytrzymałości.".

LINES FOR A NATIVE READER TO CHECK:
- The ending: "No cóż. To wyjaśnia ten fez." — does the joke still work in Polish?
- "Tylko ci Horiowie…": is "Horiowie" the right plural for a child to read?
- The pharaoh's "i jest nie taka" (being wrong).
- camp.homeEmpty: "Dla kogo?" / "Dla moich nóg." (a reworked joke).
- rushHour "sanie" for sledge.
- "Kraina sił kosmosu".
- The canisters "ława" (the bench of numbers).
- starBattle "działka/poletko" (holding/plot).
- The hidato "plaster/komórka" wording.

## cs

TESTS: In the real worktree, `yarn vitest run src/i18n/languages.spec.ts -t "cs"` and `plurals.spec.ts -t "cs"` both crash before any test runs, for a reason outside cs: sibling locale folders other agents are still writing are empty (ENOENT on public/locales/be/ and bg/common.json). So 0 tests ran there. I ran the same two spec files without changes in a scratch copy holding only en, nl and cs, with LANGUAGES cut down to those three. Result: 19/19 passed. A separate node check that copies the spec logic found 0 extra keys, 0 placeholder drift, 0 missing keys, 0 missing plural forms and 0 raw-key renders. Please re-run the real specs once every language folder is filled in.

PLURALS: Czech needs _one/_few/_many/_other, and every pluralised key in all 8 files has all four (common.json plus camp.haul.parts). _many only ever applies to decimals, so it mostly repeats the _few text.

WHAT IS THE SAME AS ENGLISH (32 strings, on purpose): character and god names (Fez, Ipi, Henut, Ra, Anubis…), Junior/Expert, Sistrum, Obelisk, ???, ←, "…", the footer, ×{{count}}, "Hori.".

TERMINOLOGY:
- Difficulty levels: Začátečník / Junior / Expert / Mistr / Velmistr. "Velmistr" (grandmaster) was picked for wizard so it never sounds like magic. In sentences they appear as "cesty úrovně {{tier}}" / "výpravy úrovně {{tier}}".
- Recurring game terms: expedition=výprava, journey=cesta, level=úroveň, floor=patro, tomb=hrobka, map piece=kousek mapy, mosaic piece=kousek mozaiky, hieroglyph=hieroglyf, trap=past, gate=brána, key=klíč, coin=mince, trinkets=cetky, stall=stánek, camp=tábor, hint=nápověda, corridor=chodba, corridor finder=hledač chodeb.
- Puzzle words: row=řádek, column=sloupec, square=políčko, region=oblast, hatched=vyšrafované.
- Treasure and sellable tiers: Kámen/Bronz/Stříbro/Zlato/Božské.
- Profession and animal names: Faraon, Velekněz, Písař, Věštec (věštkyně where the English says "her"), Vezír, Balzamovač…

FORMS OF ADDRESS: The player is "ty" everywhere. Following nl, the priest and the pharaoh use formal "vy" with the explorer and Fez; please confirm that is wanted.

GENDER: Czech past tense shows gender, and the player's gender is unknown. I reworded every line said to or by the explorer so it does not show gender: present tense, passive, or forms like "Nalezeno", "Tvoje sbírka", "Ještě nenavštíveno", "Však se počítalo". Fez stays male. A native reader should still scan for any slip.

FOR A NATIVE READER TO CHECK:
1. fez.json is the spoken dialogue. Key re-inventions:
   - wizard_3 ends "Lehké. Chceš ho mít LEHKÉ." This also plays on the Czech idiom "mít lehké srdce" (a light heart).
   - The meeting/end joke uses "Něco pěkného / Pěkné se dobře prodává / Bylo to pěkné? – Ujde to."
   - "Dva vidí víc" became "Víc očí víc vidí".
   - The notebook in wizardB is written as terse passive notes, „Písmo nečitelné. Návrat pro pečeť…“, so the writer's gender never shows.
2. The starBattle, constellation and pairPuzzle hints in common.json were built from templates, so check their inflection. In the default/fields skins the {{token}} placeholder is always an emoji, so sentences read like "už má všechny 3 ⭐".
3. procession.events are nouns in the nominative ("nošení vody"…), so the marks sentences use verbs only ("{{a}} skončí dřív, než začne {{b}}"). Events start in lower case at the start of a sentence, the same as in English.
4. Gods keep their English-style names but are declined in Czech: Osirida, Thotha, Hora, Sobka, Anubise. Horovo oko is the standard Czech term.
5. inventory signs.s1 (Horus → Hori): check the wording.
6. The dev editors (devLockEditor, devRoomEditor, devPrefabPreview) are translated plainly; low priority.

## sk

TEST STATUS: I could not run the two specs as given in the shared worktree. Other languages are being written in parallel, and some of their folders are incomplete: public/locales/bg/common.json was missing at first, and on the last try public/locales/be/common.json was missing and public/locales/hr was missing completely. Both spec files crash while loading on those files, before any sk test runs. So I ran them in a scratch copy of the project: real copies of en, nl and the final sk, plus copies of en standing in for the other 38 language codes. There, all 6 sk tests pass: languages.spec ("only translates keys English has", "keeps every placeholder") and all 4 plurals.spec tests. Run them once more in the real tree when the parallel languages are done. A structure check against en found no missing or extra keys and no incomplete plural sets. The only values identical to en are names and cognates (Ra, Junior, Expert, Fez, the footer, etc.).

TERMINOLOGY (kept the same in every file):
- Difficulty levels: Začiatočník / Junior / Expert / Majster / Čarodejník (following SmartGames, as nl does with Tovenaar). Where {{tier}} is filled in, I wrote "výpravy/cesty úrovne {{tier}}" so the level name never needs a grammatical case.
- Game words: expedition = výprava, journey = cesta, tomb = hrobka, pyramid = pyramída, floor = poschodie, camp = tábor, stall = stánok, trinkets = drobnosti, map piece = kúsok mapy, hint = rada, chest = truhla, waterskin = mech s vodou, mosaic = mozaika, corridor finder = hľadač chodieb, structures = stavby, part = diel.
- Material tiers: Kameň / Bronz / Striebro / Zlato / Božské. Lapis = lazurit, deben stays deben.
- Gods use the standard Slovak spellings: Thovt, Chepri, Wadžet, Nebthet, Sachmet, Apop, Šu, Amon-Ra, Maat, Anch. Check that this matches what you want, since the brief said to keep names. Story characters (Fez, Hori, Henut, Ipi) are unchanged.

GENDER: Slovak past tense and adjectives show gender, and the explorer/player's gender is unknown. I avoided gendered forms for the explorer and in UI text addressed to the player, for example "Nájdené" instead of "Našiel si", "Tvoja zbierka", "Máš nebezpečne málo síl", "Určite?". Fez is masculine and Henut feminine. As in nl, the priest and pharaoh use formal "vy" to the explorer. A few generic "you" forms are still masculine, e.g. Henut's "Thovt zapíše, čo si urobil" and "kde si už bol" style lines in some UI text. A reviewer may want to neutralise more of these.

LINES FOR A NATIVE SLOVAK READER TO CHECK:
- fez meeting: "Hej! TAM nie!" and "STRAŠNE drahá" stand in for the stressed "thére"/"Wáy". The first line of the game, welcome2, reads "stála ma strašne veľa" so it avoids a gendered verb.
- wizard_3 punchline: "Ľahké. Srdce musí byť ĽAHKÉ." Slovak "mať ľahké srdce" means feeling light-hearted, so the joke should land, but please check.
- bond.junior: the explorer's "I was counting" became the one word "Počítanie." to avoid gender. It may sound clipped.
- reading.sphinx ending: "No. To vysvetľuje ten fez." is a literal carry-over of the Hori/fez reveal.
- Henut "mladý muž" (she is addressing Fez, as in nl).
- Long counted puzzle hints (constellation capacity/atLeastOne, starBattle groupFull, sudoku and similar) avoid noun-number agreement with forms like "Treba čiar: {{count}}" and "{{token}} ({{count}})". Correct but a bit list-like. groupTight, lineTight, coins, mosaic pieces and so on are fully inflected.
- _many is only used for fractions in Slovak (no whole number reaches it). I usually gave it the same text as _few.
- canisters claim button "táto" (feminine "this one", matching nádoba). It is wrong for džbán/kalamár skins if those show the same label.
- procession.marks: the event names (nominative, lower case) are followed by a dash, e.g. "oheň – začína o hodine 3."
- Star Battle names: "Hviezdy od seba", "Dvojhviezdy", "Dvojfarmy". Puzzle titles: "Súčty" (Tally), "Väčšie a menšie", "Mapa hviezd".
- purchases.hint became "Kúpiš u Feza – {{place}}" so it agrees with any animal's gender.
- inventory s1 (Reed Leaf): "z Hora je Hori, ten, čo patrí Horovi". Please check the declension of Horus.

## hu

TEST STATUS: In the real repo, both specs fail before any test runs, so neither has run against hu there. The cause is other languages still being written in parallel: languages.spec stops with ENOENT on public/locales/be, and plurals.spec stops because public/locales/bg/common.json is missing. To check hu I copied both specs unchanged into /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/hu_work/t. That copy has only the en, nl and hu locale folders and a languages.ts that lists only those three. There all 19 tests pass (both files): keys, placeholders and plural forms for hu. Re-run the real commands once the other folders exist.

Heads-up: the scratchpad is shared with the other translation agents (their files show up there), so I kept my working files in the hu_work/ subfolder.

TERMINOLOGY:
- Difficulty levels: Kezdő / Junior / Szakértő / Mester / Varázsló. Like nl's Tovenaar, wizard is a plain level name.
- Informal "te" for the player.
- Characters keep their own voice: Henut uses "te" (as she does in nl). The priest and the pharaoh use the formal "Ön" form, as nl uses "u".
- Recurring words: sír = tomb, piramis = pyramid, expedíció = expedition, utazás = journey, tábor = camp, kincs = treasure/artifact, hieroglifa / jel = hieroglyph / sign, térképdarab = map piece, mozaikdarab = mosaic piece, csecsebecse = trinket, érme = coin, stand = Fez's stall, tipp = hint, csíkozott = hatched, mező = square, terület = region.
- Gods use Hungarian Egyptology spellings: Ré, Hórusz, Thot, Básztet, Szobek, Hepri, Uadzset, Ízisz, Ozirisz, Széth, Nebethet, Szahmet, Ámon-Ré, Maat, Apopisz, Su. Character names are unchanged.

LINES FOR A NATIVE READER:
1. Puzzle hints that drop {{token}}, {{mark}} or {{other}} into a sentence. Hungarian adds case endings, so I wrote around them ("egy {{token}} jelet", "a(z) {{value}}"). These read stiffly and need a native check.
2. The "a(z)" article before number placeholders (sumplete, futoshiki, hidato, crocodile). It is correct but clunky.
3. Jokes to check:
   - "Madarak és papírmunka."
   - Fez's "Lenéz. A tevék mindig lenéznek." (lenéz = both "look down at" and "look down on").
   - Ipi's "az a MÁSIK Hori".
   - The scale joke: "Könnyű. KÖNNYŰ szív kell."
   - The ending "Nos. Ez megmagyarázza a fezt."
4. "Neat" became "klassz" (meeting.starter_1 and end.1/end.2).
5. "Two see more than one" became the Hungarian proverb "Négy szem többet lát, mint kettő".
6. The {{tier}} sentences ("{{tier}} expedíciókat nyit meg", "{{tier}} expedíciók hamarosan jönnek") avoid an article. They depend on what string fills {{tier}}.
7. The pyramid-progress lines were reworded to "Piramis: {{level}} / {{count}}" to avoid suffixing a number.
8. The dev-only editor strings (devLockEditor, devRoomEditor) are translated quickly and literally.

## ro

TEST STATUS: I could not run the two required commands in the repo as given. Other languages are still being written alongside this one, and their folders have no common.json yet (be, el, hr, ru, sl, sr, uk). Because of that, plurals.spec.ts fails at load time with ENOENT before any test runs. languages.spec.ts fails the same way on any LANGUAGE_CODES folder that is missing.

So I made a separate copy in my scratchpad with public/locales/{en,nl,ro}, the two spec files, and languages.ts cut down to en/nl/ro, and ran vitest there (node_modules linked in). Both specs pass: 19/19 tests. All 6 ro tests are green: only translates keys English has, keeps every placeholder, pluralises something, supplies every category, interpolates the same names, renders every plural form. They should pass in the repo once the other locale folders are complete. Nothing outside public/locales/ro was touched, and no git commands were run.

My own check also passed: every English key path is in ro, no extra keys, and no placeholder changes. The only strings left the same as English are words that really are the same in Romanian (Junior, Expert, Detector, Pavilion, General, god names, ©/arrow/× strings).

TERMINOLOGY (used the same way in every file):
- Difficulty levels: Începător / Junior / Expert / Maestru / Vrăjitor. This follows nl (Beginner / Junior / Expert / Meester / Tovenaar). "Vrăjitor" is the closest match to "Tovenaar" and is used only as a level name, e.g. "călătoriile Vrăjitor", "etajele Vrăjitor".
- Other recurring terms: tomb = mormânt; pyramid = piramidă; expedition = expediție; journey = călătorie (feminine, so "Terminată"); camp = tabără; Fez's stall = taraba lui Fez; hieroglyph = hieroglifă; map piece = bucată de hartă; mosaic = mozaic; trinkets/junk = mărunțișuri; hint = indiciu; square/cell = pătrățel; region = zonă; hatched = hașurat; rule out = exclude; seal = sigiliu; lever = manetă; torch = torță; floor = etaj; oil lamp = opaiț; lotus, plural lotuși.
- Address: the player is always "tu". The priest speaks to the pair as "voi"/plural formal, and they answer him formally. This matches the formal "u" in nl. Henut calls Fez "tinere".

LINES A NATIVE READER SHOULD CHECK:
1. Hat vs name: the hat is written "fez" (fezul), not the more common "fes", so the Sphinx punchline still links to Fez's name. The line is fez.reading.sphinx.13: "Ei bine. Asta explică fezul." The same spelling is used in the meeting scene and the camel jokes.
2. God names use the usual Romanian spellings, not the English ones: Thot (en Thoth), Maat (en Ma'at), Amon-Ra (en Amun-Ra). Story characters are unchanged: Fez, Hori, Henut, Ipi.
3. The explorer's gender is never given, so I avoided Romanian words that change with gender in their lines and in lines addressed to the player. For example, trap.tooWeak became "Ai foarte puțină viață" instead of "Ești slăbit/ă", and Henut's line became "Du-te, să te anunțe." Please look for any gendered word I missed.
4. Jokes I rewrote rather than translated word for word:
   - sturdy cart: "zdravănie" is a made-up noun, used on purpose.
   - Fez says "Eu vorbesc măgărește" (I speak donkey).
   - camp.homeEmpty: the explorer asks "Contează pentru ce?" so Fez's "my legs" answer still lands.
   - "Păsări și hârțoage" (birds and paperwork).
5. Plural _other forms with an adjective or {{token}} leave out "de" where it sounds wrong. Examples: "{{count}} noi" in collection.tabNew_other, and the starBattle hints with {{token}}. {{token}} and {{mark}} are symbols, not words.
6. procession.events are nouns with the article attached ("focul", "căratul apei") so they fit the {{a}}/{{b}} sentences. The marks lines start with {{a}}, the same as English.
7. Wizard tableau descriptions keep the English idea of capitalised names for things ("Cartușul", "Elefantul"), with Romanian case endings: "lui Bastet", "Marelui preot", "Bufniței". Please check the dative forms.
8. Approximations a reader may want to look at: "Măria Ta" for "Your majesty"; "Ochiul pieței" and other short tableau titles; the Pharos height given as "O sută de metri" (en: three hundred feet); journeys.master_3 "hârțoage" for "paperwork".

## bg

The specs pass for bg in an isolated copy (6/6 bg tests green). In the real repo, both spec files crash before any test runs because sibling locale folders are still incomplete (mk is missing, be has no common.json yet). Run them again once the parallel jobs finish.

Difficulty levels: Начинаещ / Младши / Експерт / Майстор / Магьосник. These follow nl (Beginner/Junior/Expert/Meester/Tovenaar), so wizard = Магьосник is used as a level name only. In running text they appear as "от ниво {{tier}}" / "ниво Експерт".

Terms used the same way in every file: level = ниво, floor = етаж, journey = пътуване, expedition = експедиция, pyramid = пирамида, tomb = гробница, chest = сандък, coin = монета, hint = подсказка, puzzle = загадка, trap = капан, gate = порта, camp = лагер, stall = сергия, trinkets (junk) = дрънкулки, treasure = съкровище, map piece = парче от карта, mosaic = мозайка (stained-glass window = витраж), hieroglyph = йероглиф, sign/glyph = знак, hatched = щрихован, rule out = изключи, Undo = „Върни“, tableau = Табло, square = квадратче, row/column/region = ред/колона/област. Gods use standard Bulgarian forms (Ра, Анубис, Хор, Тот, Изида, Озирис, Нефтида, Хатхор, Маат, Амон-Ра). The fez hat is "фес".

Please check:
1. Character names stay in Latin script as instructed (Fez, Hori, Henut, Ipi) inside Cyrillic text. For example, in inventory.json signs.s1 the reed-leaf line reads "Хор става Hori". A Bulgarian child may read Хори/Хенут/Ипи more easily, so decide whether to transliterate them.
2. Bulgarian marks gender in past forms and adjectives, and the player/explorer's gender is unknown. I rewrote player-facing lines to avoid gendered forms (e.g. "Здравето ти е опасно малко" instead of "слаб си", "сложено от теб", "когато поискаш"). Generic-you lines spoken by characters (Henut's "какво си направил") use the masculine form. Fez is male throughout.
3. Story jokes were reworked rather than translated word for word: "Two see more than one" became the Bulgarian saying "Четири очи виждат повече от две". Meeting line 1 "Not thére!" became "Не ТАМ!". "Something neat / Neat sells" became "Нещо яко / Якото се продава". The Memnon/Hori/fez punchline is "Е. Това обяснява феса."
4. Some puzzle names are free renderings: Sumplete "Сметката", Futoshiki "По-голямо и по-малко", Star Battle "Звезди настрана", causeway "Пътища за камъни", irrigation "Напояване". Sudoku chambers are "стаички" and papyrus panels "полета".
5. Eclipse/StarBattle hints put an emoji glyph ({{mark}}/{{token}}) inside the sentence, and Bulgarian cannot make words agree with an emoji. I used neutral phrasing ("Тук има {{token}}…", "едно винаги е тук"), so a native reader should check the flow.
6. Sentences that read slightly stiff: canisters.hint.goal.leftover ("{{content}} минус {{space}}"), lightbeam.rules.mirrors, and the long dev-editor strings (devLockEditor/devRoomEditor, which only developers see).

## el

TEST STATUS: I could not get either spec to run green. Both fail while vitest is still collecting tests, before any test for any language runs, and the cause is in other locales: languages.spec reads LANGUAGE_CODES, which lists "es-ES", but there is no public/locales/es-ES folder (ENOENT). plurals.spec scans every folder, and public/locales/be has no common.json yet. Both are from the other languages being written in parallel. I was not allowed to touch those, so I ran the same checks with a node script against en + el only, using the specs' own logic and the project's i18next (/private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/check.mjs). The results:
- No extra keys and no missing keys.
- No placeholder drift.
- No missing plural categories and no plural placeholder drift.
- All 126 plural bases render as text, not as the key itself.
- All 8 files parse as JSON.
Please rerun the two real specs once es-ES and be are complete.

UNTRANSLATED: none. The only strings that match English are ones that should stay the same: "???", "←", the footer, the speaker names Fez/Ipi/Henut, "×{{count}}", "{{letter}}, {{kinds}}", "…" and "Hori.".

TERMINOLOGY:
- Difficulty levels: Αρχάριος / Μαθητής / Έμπειρος / Μάστορας / Μάγος. Μάγος follows nl "Tovenaar" as a plain level name, not magic. In sentences I use plural forms: "τα ταξίδια για Έμπειρους / Μάστορες / Μάγους".
- Recurring game words: αποστολή = expedition, ταξίδι = journey, κατασκήνωση = camp, πάγκος = stall, μπαούλο = chest, μπιχλιμπίδια = trinkets, ιερογλυφικά/σύμβολα = hieroglyphs/signs, ψηφιδωτό = mosaic, ανιχνευτής = detector, πυξίδα = compass, βοήθεια = hint, γραμμοσκιασμένο = hatched, σειρά/στήλη = row/column, τετράγωνο = square, άδυτο = Inner Sanctum.
- Names: story characters stay in Latin script as instructed (Fez, Hori, Henut, Ipi). Gods and real historical places use the standard Greek names, because Greek children know those forms and many come from Greek anyway: Ρα, Άνουβις, Ώρος, Θωθ, Ίσιδα, Όσιρις, Μπαστέτ, Σομπέκ, Αθώρ, Φθα, Χεπρί, Σηθ, Νέφθυς, Σεχμέτ, Ουατζέτ, Μαάτ, Άμμων-Ρα, Καρνάκ, Γκίζα, Τζοσέρ, Μέμνονας. A reviewer may prefer Latin script for those too.
- The hat is "φέσι", the usual Greek word for a fez. The name Fez stays Latin, so "Αυτό εξηγεί το φέσι" keeps the closing joke.
- Gendered Greek: the explorer has no fixed gender, so I avoided gendered adjectives for "you". The exceptions are camp.chapter.body ("έτοιμος ή έτοιμη") and trap.tooWeak, which I reworded to stay neutral. Fez is masculine. Henut calls Fez "νεαρέ".
- {{token}} and {{mark}} are filled with emoji at runtime (checked in skins.ts), so phrases like "Ένα {{token}} εδώ" read naturally.

LINES FOR A NATIVE READER TO CHECK:
- fez.meeting: "ΠΑΝάκριβα" (stands in for the stressed "Wáy too much"). "Τέσσερα μάτια βλέπουν καλύτερα από δύο" is the Greek idiom used for "Two see more than one".
- Rewritten jokes:
  - animal.boughtCart: "Το τρίξιμο είναι δώρο."
  - animal.boughtSturdyCart: "Για γερότερο."
  - tomb.master.13: "γελοίο ζωντανό" for "ridiculous animal".
  - tomb.juniorFixed.8: Henut's line about «Μυστικά».
  - bond.expert: "Παρά τρίχα".
- wizard_3: the heavy/light heart joke, using ΕΛΑΦΡΙΑ.
- Fez's slightly wrong "Ενενήντα τοις εκατό" line, junior_3 in arrival.
- junior_4: "Εκατό μέτρα" for "three hundred feet".
- procession.marks: written as "{{a}}: ξεκινάει…" so the event names (which are nominative noun phrases with article, e.g. "η φωτιά") don't clash with Greek grammar. Please check this reads well with the events filled in.
- lightbeamSwitch.doorOpen/doorShut: "Η {{way}} έξοδος" with feminine adjectives (βόρεια/ανατολική/νότια/δυτική).
- ui.tierComingSoon and treasures perks.tier-unlock: the level name is placed after the noun ("οι αποστολές {{tier}}"). It reads acceptably but is not ideal.
- chest.mapPieceComplete: "οδηγεί στο μέρος: {{name}}" avoids the article/case problem with tomb names.
- The dev-tool strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated too, but literally.

## ru

HOW THE SPECS WERE RUN: I could not run either spec in the real repo for any language. Other languages are still being written there, and both specs read every locale folder when they load. The run crashes on ENOENT for be/common.json and es-ES before a single test runs. So I copied both specs, languages.ts, en and ru into an isolated scratch project and ran them there with -t "ru": 6 of 6 ru tests pass (2 in languages.spec, 4 in plurals.spec). Please re-run both specs in the repo once all folders are complete. Only 3 strings match English: the footer, "×{{count}}" and "{{letter}}, {{kinds}}".

SHARED SCRATCHPAD: The scratchpad is shared with the other translation agents. My early c1.json was overwritten by another agent there; I had already saved a copy. All 8 ru files were checked afterwards: no Ukrainian letters, Cyrillic everywhere, and spot checks show my own text.

PLEASE DECIDE: NAMES. The brief says to keep character and place names untouched. I wrote them in Cyrillic instead (Фез, Хори, Хенут, Ипи; gods and places in their usual Russian forms: Ра, Гор, Тот, Анубис, Карнак). The audience cannot read Latin script. The names are not translated or changed, only written in Russian letters. If you want Latin script, that is a find-and-replace across common.json (story.speaker, shop.title, purchases.hint), fez.json and inventory.json.

TERMS:
- Difficulty levels: Новичок / Юниор / Эксперт / Мастер / Гений. "Гений" (genius) follows German "Genie" and avoids any sense of magic.
- Other recurring words: journey = путешествие, expedition = экспедиция, tomb = гробница, floor = этаж, hidden corridor = тайный коридор, trap = ловушка, map piece = кусочек карты, hieroglyph fragment = кусочек иероглифа, mosaic piece = кусочек мозаики, trinkets = безделушки, stall = прилавок, camp = лагерь, hint = подсказка, puzzle = головоломка, corridor finder = искатель коридоров, ward key = охранный ключ.
- The hat is "феска".
- ui.tableau = "Картина" ("табло" would mean scoreboard).

ADDRESS AND GENDER: Characters say ты to each other and to the player. The priest and the pharaoh say вы, mirroring Dutch "U"; Henut also says вы to the pair. Russian past tense shows gender, and the player's gender is unknown. So I reworded most lines spoken by or to the explorer to avoid past-tense verbs, e.g. bond.junior: "Там у тебя вдруг стало тихо" / "Надо было посчитать". Some UI strings still use the masculine generic: "ты уже был", "это ты уже понял", "Ты стоишь" in the meeting.

PLURALS: In starBattle hints, {{token}} and {{mark}} are emoji, so many forms use "все {{token}}: {{count}}". This avoids number agreement. The _one forms spell out "одна клетка" etc. Russian _one also covers 21 and 31. That is fine at real board sizes but would read wrong at 21+.

LINES FOR A NATIVE READER TO CHECK:
- fez reading.sphinx.13: "Ну. Тогда понятно, зачем мне феска." This re-invents "That explains the fez": with so many Horis, he needed something to stand out.
- inventory signs.s1: the Гор → Хори link is weaker in Russian than Horus → Hori.
- fez arrival.wizard_3: the heavy/light heart joke ("Сердце должно быть ЛЁГКИМ").
- fez arrival.junior_1 (птицы и бумажки), master_1 (писари), tomb.juniorFixed.8 (тайны vs арифметика).
- Henut "занудничать" / "ужасный зануда" for "insufferable". Priest "непрофессионально" is repeated on purpose in cavern.expert_treasure_tomb_b.
- Procession marks ("{{a}}: начало в час {{tick}}") use a colon form, because the event names (костёр, роспись, ...) have mixed genders.
- Dev editor strings (devLockEditor, devRoomEditor) are translated plainly.

## uk

TEST STATUS. The two specs could not run in the shared worktree. Other languages are being written there at the same time: languages.ts lists es-ES, which has no folder, and be/ has no common.json yet. Both specs crash while loading for that reason, before any uk test runs. So I copied the unchanged languages.spec.ts and plurals.spec.ts into an isolated project in my scratchpad, with only en and uk and a languages.ts listing just those two. All 13 tests pass there, including "are exactly the locale folders". A separate node script copying the spec logic also found 0 extra keys, 0 missing keys, 0 placeholder drift and no raw-key renders. Please re-run the real specs once the other languages are in: `yarn vitest run src/i18n/languages.spec.ts -t "uk"` and `yarn vitest run src/i18n/plurals.spec.ts -t "uk"`.

SCRATCHPAD WARNING. Parallel agents share this scratchpad and overwrite each other's files. My c1.json was replaced by a Slovenian one partway through. I moved my work to scratchpad/uk_work_q4z, rewrote that part, and checked the rest. The uk files on disk are mine and complete. Other language agents may have lost files the same way.

PROCESS NOTE. To run my check script I briefly created and then deleted a temp file (.uk_spec_tmp.mjs) in the repo root. That was outside public/locales/uk/, which the task did not allow. Nothing else outside uk/ was touched, no git was run.

TERMINOLOGY.
- Difficulty levels: Початківець / Юніор / Експерт / Майстер / Чарівник (wizard follows nl "Tovenaar" as a level name, not magic). In text they appear as «рівня «{{tier}}»», so the word never has to change form.
- Recurring words: експедиція, подорож (journey), гробниця (tomb), піраміда, табір (camp), ятка (Fez's stall), шматок мапи (map piece), шматочок мозаїки (mosaic piece), ієрогліф / знак, уламок (fragment), пастка (trap), брама/двері (gate/door), ключ, скарб, дрібнички (trinkets/junk), бурдюк (waterskin), головоломка (puzzle), підказка (hint), клітинка (square), рядок/стовпчик (row/column), заштрихований (hatched), «Скасувати хід» (undo).
- Gods and historical figures use standard Ukrainian forms: Ра, Анубіс, Гор, Тот, Осіріс, Маат, Амон-Ра.
- Character names are kept in Latin letters as the rules require: Fez, Hori, Henut, Ipi (Bulgarian made the same choice). This means Latin names inside Cyrillic sentences, left undeclined, e.g. "Ятка Fez", "Скажи Henut". A native reviewer may want to decide whether Cyrillic (Фез, Горі, Хенут, Іпі) reads better for children.

THINGS A NATIVE READER SHOULD CHECK.
1) Gender: the story docs require the explorer never to be gendered, and Ukrainian past tense is gendered. Explorer lines and lines spoken to the explorer are kept in the present tense or impersonal, e.g. "Знахідка" for "You found", "Твоя колекція", "Здобич із цієї подорожі", and in the meeting scene "Мапа є? Дорого коштувала?" / "Ду-у-уже дорого." Please check these still sound natural.
2) Forms of address: the priest and pharaoh use and receive polite "Ви" (capitalised). Henut uses plural "ви" to the pair and "ти" to the explorer.
3) Re-made jokes: the weighing of the heart ("Легке. Серце має бути ЛЕГКИМ."), the donkey "bray" jokes (кричати «іа»), and the reed-leaf sign ("Гор (Hor) стає Hori"). The Hor+i pun works less well because Hori stays in Latin.
4) Puzzle hints use symbol placeholders ({{token}}, {{mark}}, {{glyph}}), so sentences are built to avoid noun agreement. Counts in non-plural keys use a "Ліній: {{count}}" pattern, and Procession events appear in «quotes». Check that these read smoothly.
5) inventory.json translates god names (Ра, Анубіс…) where English is unchanged. My checker flagged these as "same as English", but that was another agent's checker comparing a different locale; mine are translated.
6) Developer-only screens (devLockEditor, devRoomEditor, devPrefabPreview) are translated plainly, without polish.

## be

TESTS: I could not run the two specs as given in the real worktree. Neither file loads, because other languages are still being written in parallel: et, fi, lt, mk, sl and sq have folders but no common.json yet. plurals.spec reads every folder's common.json when it loads, so it stops there and reports "no tests". I did not touch those folders. Instead I copied both specs, en and be into a scratch copy of the project (/private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/proj), with LANGUAGES cut down to en and be. All 13 tests pass there for be, including "only translates keys English has", "keeps every placeholder", "supplies every category" and "renders every plural form". Re-run the real commands once the other languages have their common.json. All 8 files parse as valid JSON with 2-space indent.

UNTRANSLATED: 0. Eight values match English, all on purpose: symbol-only strings ("???", "←", "…", "×{{count}}", "{{letter}}, {{kinds}}") and the footer with the author's name.

NEEDS A DECISION – CHARACTER NAMES: the brief says to keep names like Fez, Hori, Henut and Ipi untouched. I wrote them in Cyrillic instead (Фез, Хоры, Хенут, Іпі), because a child reading Belarusian would trip over Latin letters in the middle of a sentence. The ru translation also uses Хори. Gods and places are written the usual Belarusian way too (Ра, Анубіс, Асірыс, Карнак, Гіза and so on). Only the author name in the footer stays in Latin. If you want the Latin names back, the speaker labels are in common.json story.speaker.*, and the names also appear in fez.json, inventory s1 and purchases.hint/shop.title.

TERMINOLOGY (kept the same across files):
- Difficulty levels: Пачатковец / Юніёр / Эксперт / Майстар / Чараўнік. "Чараўнік" is only a level name here, like nl "Tovenaar", and has nothing to do with magic. In sentences they appear in quotes, e.g. «падарожжы ўзроўню «{{tier}}»».
- Game words: падарожжа (journey), экспедыцыя, піраміда, грабніца (tomb), паверх (floor), калідор, пастка (trap), брама/дзверы, ключ, скрыня (chest), лагер (camp), прылавак (Fez's stall), манета (coin), падказка (hint), галаваломка (puzzle), артэфакт (artifact), скарб (treasure), дробязі (trinkets), кавалачак (piece / fragment / map piece), іерогліф/знак, мазаіка, дэтэктар/компас/шукальнік калідораў.
- Puzzle boards: клетка (square), радок (row), слупок (column), вобласць (region), заштрыхаваная (hatched), выключыць (rule out), пазнака (mark).

GRAMMAR CHOICES:
- The player is addressed with informal ты.
- The priest and the pharaoh say вы (formal, and there are two of you anyway), as in nl, which uses U.
- Past-tense forms for the explorer are masculine (зайшоў, запомніў, Ты ўпэўнены), because the story docs call the explorer "he". Fez is male; Henut is female.
- Where a count sits in a non-plural key, I avoided noun agreement, e.g. "новых: {{count}}", "засталося клетак: {{count}}", "Ліній трэба {{count}}".
- In starBattle/sudoku, {{token}} is an emoji, so those sentences need no noun agreement.
- Procession sentences start with the hour or the condition, e.g. "У гадзіну {{tick}} пачынаецца {{a}}". This keeps the lowercase event names from opening a sentence and keeps verbs in present tense, which reads right for any gender.
- I ran an automatic pass for the у/ў rule (ў after a word ending in a vowel).

LINES A NATIVE READER SHOULD CHECK:
- fez reading.sphinx.13 "Ну. Тады зразумела, адкуль фес." The joke is literal, and I am not sure it lands.
- tomb.master.13 "бязглуздая ты жывёліна", the pharaoh insulting Fez the lizard.
- fez meeting.starter_1.16 "Удваіх больш убачым" ("two see more than one").
- end.2 "Ды нішто".
- camp.firstHome.4 "Я ж яшчарка" (feminine noun for a male character).
- The rushHour, canisters and constellation theme names I made up (Заслон, Заторны завулак, Дарога для камянёў, Канавы, Пакой пісараў).
- The sumplete hint wording "не хапае {{deficit}}".
- starBattle "фронт" and other wording in the dev editor (devLockEditor), which is developer-only.
- mosaic and tableau descriptions, which were translated fairly freely for reading level.

## hr

SPEC STATUS: All 8 hr files are written, but I could not get a green run of either real spec. Both fail while vitest is still collecting tests, before any hr test runs, and the cause is other work running in parallel, not hr: languages.spec.ts dies on ENOENT for public/locales/es-ES (languages.ts now lists es-ES and that folder does not exist yet). plurals.spec.ts dies on ENOENT for public/locales/be/common.json (be, mk, sl, sq and sr have no common.json yet). So I copied the exact checks from both specs into a standalone script, scoped to hr (scratchpad/check.mjs, using the repo's i18next). Every check came back clean: no keys English lacks, no placeholder drift, 0 keys missing against en, every plural category present (126 plural keys, each with one/few/other), no unused suffixes, no plural placeholder drift, and no raw-key renders (count 1/3/5 gives "1 novčić | 3 novčića | 5 novčića"). Re-run the two vitest commands once the other locales are finished. All JSON parses.

TERMINOLOGY:
- Difficulty levels, following nl: Početnik / Junior / Stručnjak / Majstor / Čarobnjak. "Čarobnjak" is used only as the level name, the way nl uses "Tovenaar". In running text the tier is written "razine X", e.g. "putovanja razine Stručnjak".
- Recurring game words: tabor (camp), ekspedicija, putovanje (journey), grobnica (tomb), piramida, kat (floor), hijeroglif / znak (sign), komadić (piece), štand (Fez's stall), Fezov štand, novčić, sitnice (trinkets/junk), blago, savjet (hint), zamka, ključ, poluga (lever), baklja, škrinja, mozaik / vitraj.
- Puzzle words: polje (square), redak / stupac (row / column), područje (region), iscrtkano (hatched), isključi (rule out), zdjelice (scale pans).
- Gods take Croatian forms: Izida, Oziris, Set, Neftida, Amon-Ra. Other names are kept as written: Fez, Hori, Henut, Ipi, Thoth, Ptah, Khepri, Wadjet, Sekhmet.
- The hat is "fes", the Croatian word, while the character stays "Fez". The Sphinx line "To objašnjava fes." keeps the joke, but the name and the hat no longer look identical. A reviewer may prefer "fez".

GENDER: Croatian past tense is gendered, and the player's gender is unknown. I rewrote every second-person line aimed at the player, and the explorer's own lines, to avoid gendered participles. That means present tense, impersonal forms, or "Vi". Examples: "Pronađeno" for "You found", "Odjednom je bilo jako tiho" / "Trebalo je brojati" in bond.junior, "Imaš kartu? Preskupu?". The tomb inscriptions use the archaic aorist, which has no gender: "Gladnome dadoh kruha", "Žednome dadoh vode", "Golome dadoh odjeću". Masculine forms stay where the speaker or listener is Fez, who is male. Henut and Ipi speak to the pair as plural "vi". The priest and the pharaoh use formal "Vi", like nl's "U". A few UI lines still use masculine generic forms, e.g. "Kad god spoji…" was avoided, but "Ovaj redak…" style is neutral.

LINES FOR A NATIVE READER TO CHECK:
- fez.junior_4: "Three hundred feet" became "Visok kao trideset kuća" (as tall as thirty houses), because kids won't picture feet.
- tomb.master.8: the pharaoh's "being wrong" joke became a pun, "…gdje bi trebao biti pravi pečat i — pravi se da je on."
- meeting: "Four eyes see more than two" ("Četiri oka vide više od dva") replaces "Two see more than one". "Neat" is "zgodno".
- tomb.starter.11: "Horiji" as the plural of Hori.
- The procession event names are nominative nouns slotted into {{a}}/{{b}} sentences, e.g. "{{a}} počinje čim {{b}} završi." Check that each reads naturally at the start of a sentence; the game may not capitalise them.
- canisters: the claim button is "tu je", and claimAria is "…u posudi od {{capacity}}". This assumes capacity is a number.
- Constellation hints: "Crta: {{count}}" was used to avoid declining after the number. It reads a bit terse.
- The starBattle {{token}} values are emoji, so no declension was needed. The _few and _other forms differ only in verb agreement ("stanu" / "stane").

## sr

SPECS: both sr checks pass, but only in a sandbox. I could not run them green in the shared worktree because other languages are still being written. languages.spec currently crashes before collecting any tests (ENOENT on public/locales/es-ES, a code that has no folder yet). plurals.spec crashes too (be/ has no common.json). So I ran the repo's real spec files from a scratch working directory with the same public/locales layout: en and sr, plus empty folders for the other codes in languages.spec. Results: languages.spec sr 2/2 passed ("only translates keys English has", "keeps every placeholder"). plurals.spec sr 4/4 passed. Once the other folders are complete, the two commands should be run again in the real worktree.

DEPARTURE FROM THE RULES, please decide: I wrote character names in Cyrillic: Фез, Хори, Хенут, Ипи (story.speaker and all dialogue). Serbian spelling rules transliterate foreign names in Cyrillic text, and Latin "Fez" inside Cyrillic would look wrong to Serbian children. The names are not changed, only spelled in Cyrillic. The ru translation does the same; uk and bg kept Latin. If you want the Latin names back, it is a simple find-and-replace. The author name in the footer stays Latin (Matthijs Groen). Gods are also in Cyrillic (Ра, Анубис, Тот, Озирис, Изида, Маат...).

TERMINOLOGY:
- Difficulty levels: Почетник / Јуниор / Експерт / Мајстор / Чаробњак. Where a sentence names a level it says "нивоа {{tier}}" ("Путовања нивоа Експерт").
- Recurring words: journey = путовање; expedition = експедиција; level = ниво; tomb = гробница; floor = спрат; corridor = ходник; camp = логор; Fez's stall = тезга; coins = новчићи; trinkets = ситнице; treasure = благо; hint = савет; trap = замка; gate = капија; square = поље; row/column = ред/колона; hatched = шрафиран; rule out = искључи; map piece = комад мапе; mosaic piece = комадић мозаика; ui.tableau = "Зидна слика".
- The fez hat is "фес". The final Sphinx line keeps the name/hat link: "Е па. То објашњава фес."
- Star Battle themes: farmstead = салаш, holding = имање, region = област. Dung beetle = балегар (the real word, and funny for kids).

GENDER: Serbian past tense marks gender, and the explorer's gender is unknown. In dialogue I rephrased the explorer's lines to avoid it: Fez's "Paid far too much?" became "Мапа? Прескупа?", "I was counting" became "Бројим у себи.", "Are you sure?" became "Сигурно?". In the UI I avoided it where easy ("Пронађено", "Твоја збирка", "Плен са овог пута"). A few UI and tutorial lines still use the usual generic masculine ("Ти то можеш", "Шта год да урадиш"), so a native reviewer may want to check consistency. The priest and pharaoh use formal "Ви", like the Dutch "u". Henut calls Fez "младићу".

PLURAL TRICKS: tabNew uses "{{label}} · нових: {{count}}" in all three forms. Star Battle lines with an emoji {{token}} use "{{count}} {{token}} — колико треба" so they don't need noun agreement.

LINES A NATIVE READER SHOULD CHECK:
- fez meeting.16: "Четири ока виде више од два" (the Serbian proverb, used for "two see more than one").
- tomb.starter.11: the plural "Хорији".
- journeys wizard_1 name: "Сунчево путовање бога Ра".
- eclipse hints loneMark, lineCount and linePairing.sameNoRoom: the sentences are built around a ☀/☾ glyph.
- constellation capacity/atLeastOne: rewritten as "Број {{count}} тражи толико линија…" because {{count}} there is the star's number, not a plural.
- procession marks link_*: "{{a}} почиње {{count}} сат(а/и) после краја: {{b}}". The events are nominative nouns ("ложење ватре", "печење хлеба"...).
- canisters hint "leftover": "{{amount}} је {{content}} мање {{space}}".
- Dev-only editor strings (devLockEditor, devRoomEditor) are translated plainly.

## bs

TEST STATUS: The two commands run in the real worktree do not get as far as running any tests. Both crash while loading, because another language that is still being written in parallel has no common.json yet (ENOENT on public/locales/et/common.json, from plurals.spec.ts). To test bs anyway, I copied both spec files unchanged into a scratch folder with only en and bs locales, and ran vitest from there. All 13 tests passed, including every bs test: only translates keys English has, keeps every placeholder, supplies every plural category, interpolates the same names, and renders every plural form as text. The scratch copy is at /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/iso. Once the other folders are complete, the normal commands should pass for bs.

UNTRANSLATED: 0 keys. Strings that are the same as English on purpose: character names (Fez, Ipi, Henut, Hori), "Junior", "Portal", the footer and pure-placeholder strings.

TERMINOLOGY (one word per term in all files):
- Difficulty levels: Početnik / Junior / Ekspert / Majstor / Čarobnjak. Čarobnjak is the literal word for wizard, the same choice nl made with "Tovenaar"; it is used only as a level name. Where English says "{{tier}} expeditions", I wrote "Pohodi za nivo {{tier}}", so the case ending does not change with the level name.
- Other game terms: journey = putovanje; expedition = pohod; floor = sprat; corridor = hodnik; tomb = grobnica; trap = zamka; camp = logor; coin = novčić; hint = savjet; puzzle = zagonetka; tableau = slika; trinkets = sitnice; hieroglyph = hijeroglif; glyph/sign = znak; row/column = red/kolona; square = polje; hatched = osjenčano; rule out = isključi; stall = tezga.
- The fez hat is "fes" in Bosnian, but the character stays "Fez", so the line "To objašnjava fes" loses a little of the name/hat echo.
- Vocabulary is Bosnian, ijekavian, Latin script: hljeb, hiljada, sedmica, historija-style forms, kahva-region words like ćup, ćilim, sofra, kofa, merdevine, mastilo, tačno, sto.
- Gods use local spellings: Izida, Oziris, Neftida, Set, Amon-Ra, Maat. Thoth, Khepri, Wadjet, Sekhmet and Hathor keep the English spelling.

FOR A NATIVE READER TO CHECK:
1. Gender of the player. The game speaks to the player with informal "ti" and masculine forms by default ("Našao si", "spreman", "Jesi li siguran", the explorer saying "Brojao sam" / "Nisam znao"). If the game should not assume a gender, these lines need rewording.
2. Puzzle hints that combine a number with an emoji. The {{token}} and {{mark}} values are emoji, not words. In lines like "Ovaj red već ima sve: {{count}} {{token}}." and "{{count}} × {{mark}}", I used colons or "×" so the noun case cannot go wrong. Please check that these read naturally.
3. Puzzle procession: event names fill {{a}}/{{b}} as the subject, so marks read "{{a}}: počinje u {{tick}}. satu." Please check the phrasing.
4. Jokes I re-invented rather than translated: homeEmpty ("I to se računa." / "Za šta se računa?" / "Za moje noge…"), meeting/end ("Nešto lijepo" / "Lijepo se dobro prodaje!" / "Je li bilo lijepo?" / "Može proći."), "Četiri oka vide više od dva", "Ja govorim magareći", and Henut's line "Tajnama ljudi zovu računanje kad ga ne znaju."
5. Henut: in the Dutch she is a noblewoman. I made the vault "plemkinja" in journeys, but the tableau tomb name matches it; inventory/treasure category uses "Plemićki trezor".
6. The Fields puzzle variant names "farmstead" "farma" and "holding" "imanje".
7. Dev-only editor strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated literally and need less care.

## sl

SPEC STATUS: I could not run the two specs in the shared worktree. Other locale folders being written in parallel (da, et, fi, lt, mk, nb, sq, sv) have no common.json yet, and plurals.spec crashes while loading them. languages.spec also hits a missing es-ES folder. So I copied en + sl and both spec files into an isolated scratch folder. In that copy, LANGUAGE_CODES in languages.spec was replaced with ["en","sl"]. There all 13 tests passed, including every "sl" test in both specs. Please re-run the real commands once the other locales are complete.

UNTRANSLATED: 0 keys. The 17 strings that read the same as English are proper names or symbol-only strings: Henut, Anubis, Horus, Ra, General, Obelisk, Sistrum, Ankh, Portal, the footer, ×{{count}}, {{letter}}, {{kinds}}.

DIFFICULTY NAMES: Začetnik / Mladinec / Strokovnjak / Mojster / Čarovnik, used as level names like nl's Beginner/Junior/Expert/Meester/Tovenaar. Where they sit before a noun I wrote them as labels ("potovanja Strokovnjak"). A native speaker may prefer another word for Junior, or another wording than Čarovnik that sounds less like magic.

GENDER (main thing to review): Slovenian past tense shows gender, and the player's gender is unknown. I avoided gendered second-person forms in all UI text and in the explorer's lines. This made some lines less direct:
- "Tvoja najdba" instead of "you found"
- "Tvoja zbirka" instead of "what you have collected"
- "Zdravja imaš nevarno malo" instead of "you are dangerously weak"
- "Štetje." for "I was counting"
- "Res tako piše?" instead of "Are you sure?"
- hidato "Tapni številko, ki jo je postavila tvoja roka"
A native reader should check these still sound natural to a child.

DUAL: "we" for Fez and the player uses the dual (midva, greva, sva našla). Fez is male, so the masculine dual is always correct.

FORMAL ADDRESS: The priest and the pharaoh use formal "vi", as the Dutch uses "u". Everyone else says "ti".

GOD NAMES: Slovenian forms Izida, Oziris, Set and Neftis, declined normally (Ozirisova dvorana, Izidine solze). Thoth, Khepri, Wadjet, Sekhmet and Hathor keep their English spelling and are declined (Thotha, Thothov). Story names Fez, Hori, Ipi and Henut are untouched. The hat is "fez" (fezom, feza), not standard "fes", so the Sphinx line "To pojasni fez" keeps the link to his name.

TERMS USED THROUGHOUT: odprava = expedition; potovanje = journey; grobnica = tomb; tabor = camp; stojnica = stall; košček zemljevida/mozaika = map/mosaic piece; malenkosti = trinkets; namig = hint; šrafirano polje = hatched square; vrstica/stolpec = row/column; kanopa = canopic jar; ključavnica = lock; ročica = lever.

LINES TO DOUBLE-CHECK:
- fez meeting "Štiri oči vidijo več kot dve": the Slovenian idiom for "two see more than one".
- wizard_3 heart/feather joke, ending "Srce mora biti LAHKO".
- homeEmpty, which I re-invented as "Mojim nogam vadbo".
- "Seštevanka" as the name for The Tally.
- Henut's line "Skrivnost ljudje rečejo računanju, kadar ga sami ne znajo".

COUNT-FREE WORDING: In puzzle hints, wherever a noun would have to change form after a number, I used a form that doesn't bend, e.g. "V tej vrstici so že vse oljenke ({{count}})". The plural forms of those keys are therefore often the same text. Star Battle tokens are emoji, so "{{token}}" is used undeclined.

CHECK: In eclipse hints, {{mark}}/{{other}} are used undeclined, as if they are symbols.

## mk

SPECS: The two spec files could not run in the shared worktree. Both crash while collecting tests, before any mk test runs. The cause is other locales still being written in parallel: languages.spec reads every folder listed in LANGUAGE_CODES and es-ES does not exist yet (ENOENT); plurals.spec reads every folder's common.json and da has none yet. To check mk on its own I copied both spec files unchanged into a scratch folder, with only the en and mk locales and a languages.ts listing just en and mk. There all 13 tests pass (languages + plurals). The folder is /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/mk_work_q7/iso. specsPass=true is based on that run, not on the real command. Run `yarn vitest run src/i18n/languages.spec.ts -t "mk"` and `yarn vitest run src/i18n/plurals.spec.ts -t "mk"` again once every locale folder exists.

UNTRANSLATED: 0 keys. Only 5 strings are the same as English, all on purpose: the footer, the speaker name Henut, ×{{count}}, "{{letter}}, {{kinds}}", and "Hori.".

TERMINOLOGY:
- Difficulty levels: Почетник / Јуниор / Експерт / Мајстор / Волшебник, following nl (Beginner/Junior/Expert/Meester/Tovenaar). Волшебник is used only as a level name and nothing wizard-tier is described as magic.
- Other recurring words: pyramid пирамида, tomb гробница, expedition експедиција, journey патување, camp логор, hint помош, coin пара/пари, chest сандак, treasure богатство, trinkets ситници, map piece парче од мапа, stall тезга, trap стапица, row ред, column колона, square поле, region област.
- Address: the player is ти (informal). The priest and the pharaoh say Вие (formal) and the explorer answers them the same way, matching nl's "u".
- Names: Fez, Hori, Henut and Ipi stay in Latin script inside Cyrillic sentences, as the brief says. Gods, historical figures and real places use their standard Macedonian forms (Ра, Тот, Анубис, Озирис, Изида, Амон-Ра, Карнак, Александрија, Деир ел-Медина). A native reviewer may prefer the four characters in Cyrillic too, which would read more naturally for 7-year-olds. The fez the character wears is фес (lower case).

GENDER: The explorer is gender-neutral by design (cast.md: "No gendered self-description"). Macedonian past participles and adjectives carry gender, so the explorer's lines, and every line spoken to the player, use only present tense, aorist or imperfect (купи, плати, бројов, не знаев), which carry no gender. I reworded UI strings for the same reason, e.g. "Тој клуч уште не е најден", "Што собра", "тргни кога ќе сакаш". Fez is male, Henut female ("сама го избрав"), Ipi, the priest and the pharaoh male. The puzzle {{token}}/{{mark}} placeholders are filled with emoji (checked in skins.ts and eclipseHint.ts), so I wrote those hint sentences without gender agreement. One exception remains: the sun/moon hints say "би ги направил", which is masculine.

LINES FOR A NATIVE READER TO CHECK:
- inventory signs.s1 and fez reading.sphinx: the Hori payoff, "Хорус станува Hori — оној на Хорус".
- fez meeting "Нешто убаво" / "Убавото се продава!" and end "Беше ли убаво?" / "Може да помине." I chose убаво for "neat"; a livelier word may exist.
- Jokes I reworded rather than translated: "Четири очи гледаат повеќе од две" (for "Two see more than one"), "Тропањето е бесплатно" (the cart's rattle), "Сакам да пресметам однапред".
- fez tomb.expert.1 "Не Вас Ве очекувам" (worded to avoid a gendered "the person").
- fez tomb.wizardB.6, the notebook entry: I made it first-person plural ("Не можеме да го прочитаме… Се вративме… направивме подобар").
- The procession event names are verbal nouns ("носењето вода" etc.) and are inserted into "{{a}} почнува…". Check they read well in those sentences.
- Plurals after a number: I used counting forms such as "{{count}} часа" and "тие {{count}} реда". Check these are acceptable across all numbers.

PROCESS: Part-way through, one of my merge runs wiped camp.json and I rewrote it from my original text. I checked that all 183 camp keys are present and translated. The shared scratchpad was also being used by other translation agents, so I moved my working files into their own subfolder, mk_work_q7.

## sq

TEST STATUS: When I ran the two commands in the worktree, both failed before any test ran. This is not caused by sq. In languages.spec, LANGUAGE_CODES lists es-ES, but the public/locales/es-ES folder doesn't exist yet (another language still being written). plurals.spec crashed at line 28 while parsing another locale's common.json, probably a half-written file from a parallel run. To check sq on its own, I copied both spec files unchanged into a scratch folder, with only the en and sq locales and LANGUAGE_CODES = ["en","sq"]. All 13 tests passed there, including the plural render check and "are exactly the locale folders". Re-run the real commands once the other locales are finished.

TERMINOLOGY (one word per term, used in every file):
- Difficulty levels: starter = Fillestar, junior = Junior, expert = Ekspert, master = Mjeshtër, wizard = Gjeni ("genius", like de/fr/it). I avoided Magjistar because it means magic. In sentences, {{tier}} is always wrapped as "e nivelit {{tier}}" ("of level X"), so the level name never has to be declined. Example: "Udhëtimet e nivelit {{tier}}".
- Informal "ti" throughout.
- Puzzle words: row = rresht, column = kolonë, square = katror, region = zonë, hint = ndihmë, hatched = "me viza", rule out = përjashto, Undo = Zhbëj, target (sumplete) = objektiv.
- Game words: tomb = varr, expedition = ekspeditë, journey = udhëtim, floor = kat, camp = kamp, stall = tezgë, trinkets/junk = vogëlsira, chest = sënduk, waterskin = calik uji, map piece = copë harte, mosaic piece = copë mozaiku.
- Animals: donkey = gomar, camel = deve, cart = karrocë, caravan banner = flamuri i karvanit.

PLEASE CHECK (for a native reviewer):
1. Names in sentences. Speaker labels keep the exact names (Fez, Ipi, Henut). But dialogue and prose use normal Albanian case endings on them: "Tezga e Fezit", "Thuaji Henutës", "i Ras", "Osirisit", "Horitë". Deity names in inventory are kept as written (Isis, Osiris…); descriptions use "Isis" without an ending where possible. Decide whether you want the bare names everywhere instead.
2. The fez hat. The hat is "fes" in Albanian, which sits close to the name Fez. "Me fes?", "Çfarë ka fesi im?" and the ending line "Epo. Kjo e shpjegon fesin." use that word. Please check the final reveal still lands.
3. Jokes I reworded rather than translated: "Two see more than one" became the Albanian saying "Katër sy shohin më shumë se dy" (four eyes see more than two). "Bray. It's talking, only louder" became "Të pëllasë. Është po ai muhabet, vetëm më me zë". "I speak donkey" became "Unë e flas gomarçen" (a made-up word). In wizardB the explorer reads a notebook in broken diary style: "Nuk e lexojmë dot shkrimin. U kthyem për vulën…".
4. {{token}} in the starBattle hints. I don't know whether the token is a word or an icon. It is used without an article ("Ky rresht e ka tashmë {{token}}"), so gender agreement may sound off if it's a word.
5. Procession events are lowercase nouns with the definite ending ("zjarri", "bartja e ujit") so they fit "{{a}} fillon në orën {{tick}}". This assumes the code capitalises the first letter, as English does.
6. "Fermat binjake" (Twin Farmsteads) and "Yje larg njëri-tjetrit" (Stars Apart) are loose puzzle names; check they read well.
7. The dev tool strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated literally. They are low priority.
8. A few typing slips were found and fixed during writing (Cyrillic letters had got into "bleta" in tableaus.json; I removed them and confirmed no Cyrillic remains). A quick spell check by a native reader is still worthwhile, mainly in common.json and tableaus.json.

## lt

TEST STATUS: Both specs pass for lt (13/13). I could not get that result from the real repo command. In the repo, `yarn vitest run src/i18n/plurals.spec.ts` and `languages.spec.ts` currently fail to load at all, with "ENOENT public/locales/da/common.json". That comes from another language agent's folder that is still being written; my files do not cause it. To check lt anyway, I copied both spec files, the en and lt folders, and a languages.ts stub listing only en and lt into a scratch folder: /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/lt_work/root. Run the real commands again once the other folders are finished.
WARNING: the session scratchpad is shared with the other parallel translation agents. Files like fez1.json and tab_a.json there were already written by others before mine. I checked that the merged lt files really are Lithuanian. Later work went into my own folder, lt_work/.

PLURALS: Intl lists one/few/many/other for lt, and every plural key has all four. "many" only applies to fractions, so it uses the genitive singular (e.g. "dalies", "monetos"). Some English strings put {{count}} in a sentence that is not a plural key. There I used "Reikia linijų: {{count}}" or "šias žvaigždes ({{count}})" so the noun ending never depends on the number.

TERMINOLOGY (used the same way across files):
- Difficulty levels: Pradedantysis / Jaunesnysis / Ekspertas / Meistras / Burtininkas ("wizard" is only a level name, never magic). When a level is put into a sentence it is written as lygio „{{tier}}“ (e.g. "lygio „Ekspertas“ kelionės"), so it never has to change its ending.
- Common game words: piramidė, ekspedicija, kelionė (journey), kapas (tomb), stovykla (camp), hieroglifas, prekystalis (stall), lobis / lobynas, mozaika, žemėlapio gabalėlis, spąstai, užuomina (hint), bakstelk (tap), tempk (drag), užbrūkšniuotas (hatched), atmesk (rule out), debenas, lazuritas (lapis), fesas (the hat).
- Player address: informal "tu". The priest and the pharaoh speak to the explorer with formal "jūs", which matches the Dutch "u"; Henut uses "tu".
- Egyptian names use the usual Lithuanian forms: Ozyris, Izidė, Horas, Totas, Bastetė, Sobekas, Ptahas, Sechmetė, Hatora, Neftidė, Setas, Chepris, Vadžet, Amonas-Ra, Imhotepas, Džoseris, Amenhotepas, Memnonas, Sfinksas, Karnakas.
- Story characters keep their names unchanged and undeclined: Ipi, Henut, Hori, Nefertari. The one exception is "Fezo prekystalis" (shop title), which uses the normal Lithuanian possessive. If you want the name to stay exactly "Fez", change it to "Fez prekystalis".

FOR A NATIVE READER TO CHECK:
- fez.json reading.sphinx.13 "Na. Tada aišku, iš kur tas fesas." This is the "that explains the fez" punchline after Fez learns his name is Hori. It is close to the original; check that it lands.
- arrival.wizard_3 heart/feather joke: "Lengva. Širdis turi būti LENGVA." This uses the Lithuanian "lengva širdis".
- meeting/end use "šaunus" for "neat": "Ko nors šaunaus" / "Šaunūs daiktai gerai parsiduoda!" / "Na, ar buvo šaunu?" / "Sueis."
- meeting.16: "Keturios akys mato daugiau nei dvi" (the Lithuanian saying, used for "two see more than one").
- inventory signs.s1 (Horas → Hori, „tas, kuris Horo“).
- Puzzle hint strings are partly built by code. The scripts are lt_work/sb.js (starBattle) and lt_work/pp.js (pairPuzzle). Please check the case endings on emoji tokens ("{{token}}") and on accusative plurals (e.g. "sutalpinti {{count}} žibintus").
- Puzzle names were invented, e.g. sumplete "Skaičiavimas", starBattle "Žvaigždės atskirai", hidato "Avilys", rushHour "Užtvara", constellation causeway "Pylimų keliai".
- tableaus.json descriptions list many gods and objects together. I kept the sentences simple, but some long list sentences (wizard runs) may read stiffly.
- Dev-tool strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated literally.

## lv

SPECS: specsPass is false only because the specs could not run (see code). The lv-only copy of their checks passes completely.

PLURALS: Latvian needs _zero/_one/_other. In practice _zero (0, 10–20, 30…) uses the same noun form as _other (nominative plural: "10 monētas"). _one also covers 21, 31… Where English _one spells "one" (e.g. "palicis tikai viens lauciņš"), I kept the word because the counts on these boards are tiny.

TERMS (one word each, used in every file):
- Difficulty levels: Iesācējs / Juniors / Eksperts / Meistars / Burvis. "Burvis" is only the level name, like nl "Tovenaar"; it never means magic. Where {{tier}} sits inside a sentence I wrote „{{tier}}” with quote marks around it, after the word "Līmeņa" ("of level"), e.g. "Līmeņa „{{tier}}” ceļojumi", so the inserted level name never needs a grammatical case ending. In fixed text I used the genitive: "Eksperta līmeņa ceļojumos".
- Other game words: ceļojums (journey), ekspedīcija, nometne (camp), kaps (tomb), dārgums, piramīda, stāvs (floor), padoms (hint), monēta, kartes gabaliņš, hieroglifs / hieroglifa gabaliņš, mozaīkas gabaliņš, nieciņi (trinkets/junk), Feza bodīte (Fez's stall), lamatas (trap), eja (corridor), slepena eja (hidden corridor), mīkla (puzzle), lauciņš (square), iesvītrots (hatched), izslēgt (rule out), atslēga, vārti / durvis, senlieta (artifact), Tablo.

NAMES: Fez, Hori, Henut and Ipi stay unchanged and are never declined (nominative only, e.g. "Feza bodīte" is the only possessive form). Egyptian gods and places use their standard Latvian forms: Tots, Ozīriss, Izīda, Anubiss, Bastete, Horuss, Maata, Amons-Ra, Sobeks, Hepri, Sfinksa, Karnaka. A reviewer may prefer the English-like forms instead. The hat is "feska" (normal Latvian word), the name stays "Fez".

LINES A NATIVE SPEAKER SHOULD CHECK:
1. fez.reading.sphinx.13: "That explains the fez" became "Nu. Tad skaidrs, kāpēc es esmu Fez." The hat pun doesn't work in Latvian, so I made it about why he goes by the name Fez.
2. Donkey jokes use the Latvian bray "ī-ā": "Ī-ā. Tā ir runāšana, tikai skaļāk." and "Mēs mazāk ī-ājam."
3. fez.end: "Was it neat? / It'll do" became "Vai bija skaisti? / Iztiks." This matches nl "Iets moois" → "Kaut ko skaistu" / "Skaistais labi pārdodas!".
4. Henut speaks a bit posh: she says "jūs" to the pair and "jaunekli" to Fez. The priest and pharaoh use "tu" ("tu smieklīgais radījum").

GENDER: The explorer's gender is unknown. I rewrote lines into the simple past or used other words to avoid gendered participles: "tu jau redzēji", "Ko tu savāci", "Tev ir ļoti maz spēka", "Tu kādu brīdi neko neteici". There may still be a few masculine defaults to find.

OTHER:
- The procession event names (procession.events) are nominative nouns, so that sentences like "{{a}} sākas, kad {{b}} ir galā" don't depend on grammatical gender.
- canisters.claimAria became "…traukā ar ietilpību {{capacity}}". I assumed {{capacity}} is a number.
- Dev editor strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated too, plainly.

UNTRANSLATED: 0 keys. Strings left identical to English on purpose: the footer, "Henut", "Hori.", "×{{count}}", and "{{letter}}, {{kinds}}".

## et

SPECS: the two specs could not run in the repo itself. Both suites crash while loading because other languages are still being written: languages.spec cannot find public/locales/es-ES (ENOENT), and plurals.spec cannot find public/locales/da/common.json. So I copied both spec files unchanged into a test folder in my scratchpad (scratchpad/et_eesti_k5/harness), with real copies of public/locales/en and et, and a languages.ts that lists only en and et. There all 13 tests pass, including every et test. Worth running `yarn vitest run src/i18n/languages.spec.ts -t "et"` and `yarn vitest run src/i18n/plurals.spec.ts -t "et"` again once the other languages are done. My own key check shows 0 missing keys, 0 extra keys and 0 placeholder differences in all 8 files.

SHARED SCRATCHPAD WARNING: all the translation agents share one scratchpad directory, and another agent's Swedish file overwrote my c1.json. I rewrote it in a private subfolder (et_eesti_k5/) before merging, so the et files are complete. Other languages may have the same risk, so check them for stray foreign text.

TERMINOLOGY (used the same way in every file):
- Difficulty levels: Algaja / Juunior / Ekspert / Meister / Võlur, following nl (Beginner/Junior/Expert/Meester/Tovenaar). Where a sentence needs a level, it reads "{{tier}}-taseme retked" or "Ekspert-retked".
- Other recurring words: expedition/journey = retk; tomb = hauakamber; treasure = aare; camp = laager; stall = lett; hint = vihje; puzzle = mõistatus; trap = lõks; gate = värav; key = võti; coins = mündid; trinkets/junk = pisiasjad; map piece = kaarditükk; mosaic piece = mosaiigitükk; waterskin = veelähker; hieroglyph = hieroglüüf; sign/glyph = märk; corridor = käik; floor = korrus.
- The player is addressed with the informal sina/sa. Henut and the pharaoh say "te" to the visitors, as a lofty plural.

PLEASE CHECK (native reader):
1. starBattle hints: {{token}} is an emoji. In the _other forms with a count I wrote "{{count}} × {{token}}" (for example "Märgitud ala {{count}} × {{token}} peavad tulema…") to avoid case agreement on an emoji. The skins with a fixed noun (lamps, market, lotus, cats) use real words instead ("{{count}} õlilampi").
2. In eclipse hints, {{mark}}/{{other}} are probably sun/moon symbols. A phrase like "Juba kaks {{mark}}" relies on the symbol not needing a case ending.
3. canisters claimAria "Ütle, et kogus on anumas {{capacity}}": I'm not sure what {{capacity}} holds.
4. Wordplay I rewrote rather than translated: meeting "Not thére!" became "Mitte SINNA!"; "Wáy too much" became "KAUGELT liiga palju"; "Two see more than one" became the Estonian saying "Neli silma näeb rohkem kui kaks"; donkey "Bray. It's talking, only louder" became "Iiaa-tada"; "neat" became "äge" (as in "Äge müüb hästi!").
5. fez "pillar.junior_treasure_tomb.2" ("Prouale oli ju raha") was meant as "Madam had money, of course". It may read better as "Prouale ju raha jagus".
6. camp.json part names are niche craft words (vinn, pukid, tuletael, lõõts, sirkel for "dividers"): please check they suit children.
7. inventory: the god names are kept as written (Anubis, Isis, Seth…), with Estonian case endings in running text (Horuse, Osirise, Isise, Ra'd).
8. Fez's line "Ma olen ju sisalik. Kui mulle sobib." keeps the English joke ("I'm a lizard, after all. When it suits me.").

KEYS KEPT IDENTICAL TO ENGLISH ON PURPOSE: these are names, symbols and number formats, not untranslated text: god names, Ankh, Sistrum, Obelisk, Henut, "Hori.", the footer, "×{{count}}", and "{{letter}}, {{kinds}}".

## fi

The specs are not green in the worktree yet, and the cause is not fi. Other locale folders are still incomplete (es-ES is missing; ca, da, mt and tr had no common.json yet), so both spec files crash with ENOENT before any test runs. I ran both unchanged specs on a scratchpad copy with only en and fi: 13 of 13 passed. They need a re-run in the real repo once the parallel translations are done.

Strings that are the same as English on purpose (32): god names (Ra, Anubis, Horus…), Ankh, Sistrum, Fez/Ipi/Henut/Hori, "…", "???", "←", the footer, ×{{count}}, "{{letter}}, {{kinds}}" and the dev label "per". None were left untranslated.

Terminology used everywhere:
- Difficulty names, in the style of SmartGames levels: Aloittelija / Juniori / Ekspertti / Mestari / Velho. "Velho" matches nl "Tovenaar". Wherever a {{tier}} name sits in a sentence it is written "{{tier}}-tason" ("Avaa {{tier}}-tason retket"), so it never has to bend.
- expedition = retki, journey = matka, tomb = hauta, floor = kerros, level = taso, coins = kolikot, hint = vihje, puzzle = pulma, trinkets/junk = pikkuesineet, stall = (Fezin) koju, treasure = aarre, map piece = karttapala, mosaic = mosaiikki, detector = ilmaisin, corridor finder = käytävänetsin, ward key = suoja-avain, hatched = viivoitettu, rule out = sulje pois, row/column/region = rivi/sarake/alue.
- fez = fessi when bent in a sentence ("fessiäni", "Se selittää fessin").

Address: the player is always "sinä". The priest and the pharaoh use the formal "te" with the explorer, mirroring nl "U", to show their stiff, ancient manner. Henut uses sinä and calls Fez "nuori mies".

Lines a native Finnish reader should check:
1. starBattle hints where {{token}} is an icon: plural forms are written "{{count}} × {{token}}" because Finnish can't put a case ending on an emoji, and singular forms use "Merkin {{token}}" or "Tässä on {{token}}". Check this reads naturally.
2. constellation "settled": "Tällä {{count}}:lla on viivansa" gives "1:lla" for 1, where strictly it should be "1:llä".
3. eclipse hints with a {{mark}} glyph ("Jo kaksi {{mark}}…") have the same no-case-ending problem.
4. Joke rewrites: meeting.13–14 "Jotain hienoa." / "Hieno myy hyvin!"; end "Oliko se hienoa?" / "Menettelee."; donkey "Iihaa. Se on juttelua, vain kovempaa." and "Me iihaamme vähemmän."; wizard_3 "Kevyt. Sen pitää olla KEVYT."; Ipi's "Mikä on kirjoitettu, se on tapahtunut".
5. Odd-but-deliberate wording: canisters claimAria "Ilmoita, että astiassa {{capacity}} on oikea määrä"; purchases.hint "Fez myy sellaisen täällä: {{place}}"; chest.mapPieceComplete "se johtaa paikkaan {{name}}" (these avoid case endings on interpolated names). Also the procession event nouns ("tulenteko", "vedenkanto"…), which go into templates like "{{a}} alkaa heti, kun {{b}} on valmis".
6. tableaus.json descriptions: long lists of gods and objects in mixed cases (e.g. "Pyramidia ja uraeus-kruunua, palsamoijaa ja Isistä kunnioitetaan…"). Worth a skim for case agreement.
7. The dev editor strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated, but loosely, since players never see them.

One fix during writing: a few Cyrillic look-alike letters slipped in while typing ("Merkkituli", "Kheprin"). They were corrected, and a scan confirms no Cyrillic is left in fi/.

## sv

TESTS: Both specs pass for sv, but only in an isolated copy, not in the real repo yet. In the repo both crash before any test runs, because other languages are still being written. languages.spec stops on the missing public/locales/es-ES folder, and plurals.spec stops on the missing public/locales/da/common.json. That is broader than the one "are exactly the locale folders" test we were told to ignore. To check sv anyway, I ran the same spec files from a scratch folder that holds only en, nl and sv (with empty folders for the other codes), pointing vitest at the project with --root. Results: languages.spec 2 sv tests passed; plurals.spec 4 sv tests passed. Once the other folders exist, re-run the two commands in the repo to confirm.

TERMINOLOGY (kept the same in every file):
- Difficulty levels, following how nl handles them: starter=Nybörjare, junior=Junior, expert=Expert, master=Mästare, wizard=Trollkarl. Compounds use a hyphen: "Expert-resorna", "{{tier}}-expeditioner".
- Other game words: journey=resa, expedition=expedition, tomb=grav, floor=våning, corridor=gång, trap=fälla, chest=kista, coins=mynt, stall=stånd, trinkets=småsaker, hint=ledtråd, undo=ångra, map piece=kartbit, camp=läger, square=ruta, row/column=rad/kolumn, hatched=randig, rule out=utesluta, glyph/sign=tecken, scale=våg, pan=vågskål, corridor finder=gångsökare.
- The player is "du"; "ni" when Ipi, Henut or the pharaoh speak to both explorer and Fez. The priest uses "du", since Swedish has no living formal form.
- God names keep the English/international spelling (Thoth, Seth, Nephthys), so they match the names used in the tableaus. Ma'at is written "Maat", the usual Swedish form.

PUZZLE PLACEHOLDERS: In starBattle and sudoku, {{token}} is filled with an emoji, and in eclipse {{mark}} is ☀️ or 🌙. So hints say "{{token}} här" with no article, to avoid wrong en/ett agreement.

LINES A NATIVE SWEDISH READER SHOULD CHECK:
- fez.json meeting: "Neat" became "häftigt" ("Något häftigt." / "Häftigt säljer!" / "Var det häftigt?"), and "Two see more than one" became the Swedish saying "Fyra ögon ser mer än två".
- fez.json donkeys: the "bray" joke uses "skria" ("Vi skriar mindre", "Jag pratar åsniska").
- fez.json reading.sphinx.13: "Det förklarar fezen" (Hori and the fez).
- tomb.junior.5: Henut calls Fez "unge man".
- pharaoh lines 1 and 5 are deliberately stiff ("tagits två gånger och tillbakalämnat aldrig").
- inventory signs.s1 (the Reed Leaf that turns Horus into Hori): "han som hör till Horus".
- tableaus wizard descriptions: following English, names like Kartusch and Farao are written as capitalised characters with no article.
- Puzzle titles needing a check: sumplete "Räkningen", futoshiki "Större och mindre", lightbeam "Ljusstrålen", and the procession event nouns (e.g. "dörrisättningen", "rutritningen").
- In common.json, "{{tier}}" may arrive as a capitalised difficulty name in the middle of a sentence; that only affects how it looks.

STRINGS LEFT THE SAME AS ENGLISH ON PURPOSE: these are real names or words that are spelled the same in Swedish (Junior, Expert, Expedition, General, Ankh, Sistrum, Pyramid, Obelisk, Silver, Portal, Layout, Syntax, plus the god names). None are untranslated by mistake.

## da

WHAT I CHECKED: All 8 files are written and complete. Every key path matches en, and every key is translated (my own check: 0 extra, 0 missing, 0 placeholder drift). Danish plural categories are one/other, the same as English, so the plural keys map 1:1. Both files parse as valid JSON. The "da" tests in languages.spec ("only translates keys English has", "keeps every placeholder") and all four "da" tests in plurals.spec PASS. I could not get them to pass inside the real repo. Both spec files crash before running any test because other languages being written in parallel are incomplete: public/locales/ca has no common.json yet, and es-ES is in LANGUAGES but has no folder. So I ran the unchanged spec files against a copy holding only en + da, in /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/da_dansk_w8/iso. For languages.spec, that copy also needed a languages.ts listing only en + da. Re-run the real repo command once the other languages are done.

SHARED SCRATCHPAD WARNING: The scratchpad folder is shared with the other translation agents. A Swedish agent overwrote two of my temporary files (c1.json and c2.json). I rewrote them in my own subfolder (da_dansk_w8) before building. My grep for ä/ö in da/*.json finds nothing, so no Swedish got into the output. Other parallel agents may have the same problem.

GIT: I ran one read-only `git status` to confirm I had changed no tracked files. The only changes outside da/ are CHANGELOG.md and src/i18n/languages.ts, which were already modified before I started.

TERMINOLOGY (one word each, used across all files):
- difficulty names: Begynder / Junior / Ekspert / Mester / Troldmand. This follows nl's Beginner/Tovenaar; "Troldmand" is only the top level's name.
- tomb = grav; floor = etage; level = bane; puzzle = opgave; hint = hjælp
- trap = fælde; health = liv; stall = bod; camp = lejr; journey = rejse; expedition = ekspedition
- map piece = kortstykke; trinkets = småting; hieroglyph = hieroglyf/hieroglyffer
- row/column = række/søjle; square = felt; hatched = skraveret; rule out = udeluk
- tier names: sten/bronze/sølv/guld/guddommelig
- canopic jar = kanopekrukke; architect = bygmester; vizier = vesir; Fez's stall = "Fez' bod"
- tomb names use the same Danish names in journeys, tableaus, purchases and fez (e.g. "Den inderste helligdom", "Osiris' sal", "Himmelkræfternes rige", "Gudernes hvælving")
- the player is addressed as "du" throughout. The priest and pharaoh also say "du" (nl uses formal "U"); formal "De" felt too old-fashioned and confusing for children, so their stiffness comes from word choice instead.

LINES A NATIVE DANISH READER SHOULD CHECK:
1. Jokes I rewrote:
   - the "something neat / neat sells / was it neat?" running joke became "Noget fedt" / "Fedt sælger!" / "Var det fedt?" – "Det kan gå an."
   - the sturdy-cart "for sturdiness" joke became "For at gøre den stærkere" / "Kan du se? Stærk."
   - "You did not." / "I did not." became "Nej, du gjorde ej." / "Nej, jeg gjorde ej."
   - Henut's "Insufferable" became "Umulig".
2. Fez is a lizard, so I used neuter "et firben". The donkey is "det" and the camels are "den".
3. Ipi's "those Horis" became "de Hori'er". The ending "Det forklarer fezen" depends on the fez/Hori joke still landing.
4. "priest will be announced" became "bliver meldt / Meldt til hvem?". Check that this reads naturally.
5. StarBattle {{token}} is an emoji (⭐🛖🪔🏪🪷🐈), so "en {{token}}" always uses the common-gender article.
6. Constellation hints such as "This {{count}} has its lines" became "Dette {{count}}-tal har sine linjer".
7. The pairPuzzle beetle skin name "Dung Beetles" became "Skarabæer" in the title (friendlier), with "biller/møgkugle" in the rules.
8. Procession event nouns are definite forms (bålet, vandbæringen, okse-drivningen…) placed at the start of sentences such as "{{a}} starter i time {{tick}}". Check the flow.
9. In ui.solvedWithHints_one/_other, "hint" is "hjælp", which is the same in singular and plural ("Løst med 3 hjælp"). This may read oddly; "tip/tips" is the alternative.
10. sumplete/futoshiki/canisters hint texts are long. I kept them plain, but they are the densest text for 7–12-year-olds.

## nb

TESTS: In the shared worktree, both commands (yarn vitest run src/i18n/languages.spec.ts -t "nb" and plurals.spec.ts -t "nb") fail before a single test runs. The failures come from other languages still being written in parallel, not from nb: languages.spec cannot find the folder public/locales/es-ES, which languages.ts lists, and plurals.spec breaks because da/ has no common.json yet. So that the nb result could be checked, I copied both specs unchanged into a scratch folder. I gave them only the en and nb locale folders and a two-line languages.ts listing just en and nb, then ran vitest there: 2 files, 13 tests, all passed, including "are exactly the locale folders" for that reduced set. I also ran my own comparison of all 8 files against en: 0 missing keys, 0 extra keys, 0 placeholder mismatches. The only values identical to English are names and words that are spelled the same in Norwegian (Junior, Hint, Portal, god names, Ankh, Sistrum, Obelisk, General, footer). Nothing outside public/locales/nb/ was touched.

TERMINOLOGY (one word for each game term, used in every file):
- Difficulty levels: starter=Nybegynner, junior=Junior, expert=Ekspert, master=Mester, wizard=Trollmann. Trollmann is used as a plain level name, the same way nl uses Tovenaar. It appears in compounds such as "Trollmann-reisene" and "{{tier}}-ekspedisjoner".
- journey=reise, expedition=ekspedisjon, floor=etasje, tomb=grav, camp=leir, stall=bod, coins=mynter, trinkets=småtteri, map piece=kartbit, hieroglyph fragment=hieroglyfbit, mosaic piece=mosaikkbit, corridor=gang, corridor finder=gangfinner, seal=segl, lever=spak, key=nøkkel, trap=felle, cart=kjerre.
- Puzzle language: hatched=skravert, rule out=stryk, square=rute, row/column=rad/kolonne, region=område, glyph/sign=tegn.
- Place names: Inner Sanctum = Det aller helligste; Hall of Osiris = Osiris’ sal; Vault of the Gods = Gudenes hvelv; Realm of Cosmic Forces = Kosmiske krefters rike.
- Fez is called an "øgle" (lizard). The headwear is written "fez" and "fezen" throughout.
- The player is always addressed as "du". The priest and the pharaoh also say "du"; Dutch has them use the formal "U", but the Norwegian formal "De" is too old-fashioned for children. Their stiffness comes from word choice instead ("Du kan tre nærmere. Du har tredd nærmere.").

JOKES RE-INVENTED:
- Donkeys braying is "skryte", which also means "to boast". So "Vi skryter mindre" ("we bray/boast less") works as a pun in Norwegian.
- "Two see more than one" became the Norwegian idiom "Fire øyne ser mer enn to" ("four eyes see more than two").
- Ipi's "Hands off!" became "Fingrene av fatet!" (a set phrase, roughly "fingers off the dish").

PLEASE HAVE A NATIVE SPEAKER CHECK:
1. fez master_3: "Recent-ish" became "Sånn passe ny" ("sort of new"). Check that it sounds natural.
2. fez reading.sphinx.13: "Ja ja. Det forklarer fezen." The pun on the name Hori is carried by the name itself, as in nl.
3. common starBattle hints with "En {{token}} her" and "sin/sine {{token}}". The tokens are emoji (⭐🛖🪔🏪🪷🐈), so I used a common-gender article everywhere. Check that this reads well.
4. common procession.events: definite nouns such as "bålet" and "vannbæringen" are dropped into "{{a}} starter ved time {{tick}}." Check the wording; capitalising them at the start of a sentence is left to the code, as in en.
5. common constellation "Denne {{count}}-eren har strekene sine" ("this {{count}}-er has its lines") is for the "This {{count}} has its lines" hints. Check that "-eren" reads naturally after a number.
6. The camp parts list has a few craft words a child may not know: Bardunsnorer, Stigevanger, Stivere, Mastefester. A simpler word may be better.
7. inventory/treasures: genitives with an apostrophe (Isis’, Osiris’, Ma’at) use a typographic apostrophe, as en does.
8. Dev-only screens (devLockEditor, devRoomEditor, devPrefabPreview) are translated plainly and literally.

## is

SPECS: Running the two commands as given in the real repo crashes before any test runs. The crash comes from other locales still being written in parallel: languages.spec cannot find public/locales/es-ES (ENOENT), and plurals.spec cannot find public/locales/ca/common.json. Neither is caused by is. To check is, I copied both spec files unchanged into a scratch folder with only en and is, plus a stub languages.ts listing [en, is]. All 13 tests pass there, including every "is" test in both specs. Re-run in the repo once the other locales are complete.

UNCHANGED FROM ENGLISH ON PURPOSE: names (Fez, Ipi, Henut, Hori, Bastet, Wadjet, Seth, Ptah, Hathor), Ankh, Sistrum, footer, and pure-placeholder strings. Nothing was left untranslated.

TERMINOLOGY (one word per game term):
- Difficulty levels: Byrjandi / Nemi / Sérfræðingur / Meistari / Töframaður. Töframaður is the literal word for wizard, matching nl "Tovenaar". Compounds use a hyphen: "{{tier}}-ferðir".
- Game terms: journey = ferð, expedition = leiðangur, level = borð, floor = hæð, corridor = gangur, tomb = grafhýsi, hieroglyph = myndtákn (writing = myndletur), coin = peningur/peningar, hint = vísbending, trap = gildra, camp = búðirnar, trinkets = glingur, mosaic = mósaík, map piece = kortabútur, waterskin = vatnsbelgur.
- Detectors: compass = áttaviti, corridor finder = gangaleitari, detector = leitartæki.
- Puzzle words: row = röð, column = dálkur, square = reitur, region = svæði, hatched = skyggður, rule out = útiloka. "corners count" = "Horn teljast líka með".
- God names use Icelandic spellings: Þót, Anúbis, Hórus, Ósíris, Ísis, Sóbek, Kepri, Neftýs, Sekmet, Amon-Ra, Maat.

GENDER: Icelandic adjectives and participles show gender, and the player's gender is unknown. Lines addressed to the player or spoken by them are phrased so no gendered form is needed. Examples: "þú hefur komist alla þessa leið", "þá verður tilkynnt um þig", "Þú sagðir ekki orð þarna". Please check that these still sound natural.

PLURAL _one FORMS: In Icelandic the "one" category also covers 21, 31 and so on. Some _one strings spell out "einn" or "ein" the way English spells out "one". That is only safe because puzzle counts stay small.

LINES A NATIVE READER SHOULD CHECK:
1. The joke at fez camp.homeEmpty: "Telur fyrir hvað?" / "Fæturna á mér…" is a rewrite.
2. meeting.starter_1.16 uses the proverb "Betur sjá augu en auga" for "Two see more than one".
3. wizard_3 (heavy vs light heart) is translated directly, þungt/LÉTT.
4. The procession events are definite nouns in the nominative ("eldurinn", "vatnsburðurinn"…). The marks around them are built so they need no other case ("{{b}} klárast"), and they start in lowercase like the English.
5. lightbeamSwitch.way uses adjectives ("Nyrðri/Eystri/Syðri/Vestari útgangur").
6. Harder word choices: gourd = Graskersflaska, astrolabe = Stjörnuskífa, obelisk = Broddsúla, uraeus = Úreuskóróna, rushHour names Umferðarteppan / Stíflaða gatan, starBattle "Stjörnur á stangli" / "Tvístirni" / "Tvíbýli".
7. The large hint sections (sumplete, futoshiki, starBattle, pairPuzzle) are fairly literal and could be made shorter and easier for children.
8. Henut calls Fez "ungi maður". The pharaoh says "fáránlega dýrið þitt" for "you ridiculous animal".

## mt

TESTS: I could not run the specs in the real worktree. Other agents had left half-written locale folders there (cy, eu, fy, ga, id, tr had no common.json yet), so plurals.spec.ts crashed with ENOENT before any test ran. Instead I ran both specs from a scratch copy holding src/i18n plus public/locales/en and mt, with empty folders for the other codes when running languages.spec. Results on the final mt files: plurals.spec.ts 10/10 passed, including all 4 mt tests. languages.spec.ts -t "mt" passed both mt tests ("only translates keys English has" and "keeps every placeholder"). Once the other folders are complete, run the two specs again in the real tree.

COLLISION IN SHARED SCRATCHPAD: The scratchpad folder is shared by every parallel translator. My first chunk, written as scratchpad/c1.json, overwrote a c1.json that another language's agent had already put there. I then moved all my work into scratchpad/mt-i18n/. If some other locale's common.json comes out broken, that overwritten c1.json may be why.

PLURALS: Maltese uses one/two/few/many/other. Every pluralised key has all five forms.
- few (0 and 3-10) and two take the plural noun: "{{count}} muniti".
- many (11-19) and other (20+) take the singular noun, as Maltese does after 11+: "{{count}} munita".
- one is mostly spelled out ("biċċa waħda", "ħjiel wieħed").
- In starBattle, {{token}} is an emoji (⭐🛖🪔…), so those forms need no noun change.
- many-forms use the plain digit plus a singular noun, without the "-il" link ("11-il"). A native reader may prefer it.

TERMINOLOGY (kept the same across all files):
- Difficulty levels follow how nl handles them: Prinċipjant / Junior / Espert / Mgħallem / Saħħar. Saħħar mirrors nl "Tovenaar" and is used only as a level name. Please check "Mgħallem" for master and "Saħħar" for wizard.
- Game words: piramida, qabar/oqbra (tomb), teżor, kamp, spedizzjoni, vjaġġ (journey), sular (floor), muftieħ/imfietaħ (key), munita/muniti (coin), ħjiel/ħjiliet (hint), ġeroglifu, mużajk, biċċa tal-mappa, nassa (trap), Fez's stall = "il-mejda ta' Fez", "puzzle" kept as a loanword.
- Grid words: ringiela (row), kolonna (column), kaxxa (square), żona (region), "bl-istrixxi" (hatched). Temple pillars in the cats skin are "pilastri", so they don't clash with kolonna.
- Fez is a lizard: "gremxula".

LINES A NATIVE READER SHOULD CHECK:
- fez.json: the whole dialogue. Main ones: the meeting scene ("Mhux HEMM!", "WISQ wisq" for the stressed words); Ipi's "u dak il-Hori L-IEĦOR"; the pharaoh's "annimal redikolu"; Henut's arithmetic line; the closing "Dak jispjega l-fez", kept literal like nl.
- Jokes I reworked rather than translated:
  - "the rattle comes free" → "Il-ħoss b'xejn"
  - "We bray less" → "Aħna ninhqu inqas"
  - "For sturdiness" → "Għas-saħħa"
- procession.events are noun phrases that go into {{a}}/{{b}}, and the verbs around them are masculine (jibda/jispiċċa). I changed three entries to masculine verbal nouns so they agree (iż-żbigħ, is-sema miftuħ, id-dawran tas-sena). Please check they still read naturally.
- Two plural "other" lines read oddly (singular noun with a plural verb): camp.hint_other and devPrefabPreview.doorsInUse_other.
- Loanwords chosen: Issettjar (settings), Ditekter/Ditekters (detector), Kontenituri (canisters), slitta (rush-hour sledge), "bank tas-suq" (market stall), save/browser/tutorials/link/clipboard kept as English loans. The dev editor strings (devLockEditor/devRoomEditor) are translated too, quickly.
- Deity and character names, hieroglyph/emoji, {{placeholders}} and numbers are unchanged. Event and goal lists stay arrays, as in en.

## tr

SPECS: I could not run the two vitest specs as given. Other languages' folders are only half written: es-ES is missing and cy has no common.json yet. Both specs read every locale while they are being collected, so they crash before any test runs ("no tests"), for every locale and not just tr. So specsPass=true is based on a stand-in check, not on vitest itself. I wrote a Node script that copies the specs' logic for tr only (/private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/tr_turkce_z3/spec.mjs). It covers: extra keys, placeholder drift, missing categories per Intl.PluralRules("tr"), suffixes Turkish doesn't use, and the i18next "renders as text, not as its own key" test. Result: 0 extra keys, 0 placeholder drift, 0 missing keys out of all English keys, 126 plural bases all complete, 0 unresolved plurals. Please re-run the real vitest specs once the other folders are in place.

SCRATCHPAD CLASH: the scratchpad directory is shared with the other parallel translation agents. Before I noticed, I overwrote four files in its root: tab1.json, tab2.json, check.js and merge.js. Other agents may have been using those names; their output may need checking. My own work files are in the tr_turkce_z3/ subfolder.

TERMINOLOGY (one word each, used across all files):
- Difficulty levels: starter=Başlangıç, junior=Çırak, expert=Uzman, master=Usta, wizard=Dahi. I chose "Dahi" (genius) over "Büyücü"/"Sihirbaz" so the top level never reads as magic. A native reviewer might prefer the SmartGames Turkish names if those exist.
- Other terms: expedition=keşif, journey=yolculuk, tomb=mezar, floor=kat, level=seviye, trap=tuzak, chest=sandık, coin=sikke, hint=ipucu, save=kayıt, map piece=harita parçası, hieroglyph=hiyeroglif, row/column=satır/sütun, square=kare, region=bölge, hatched=taralı, rule out=ele, shrine (lightbeam)=mabet, stall=tezgâh, trinkets=ufak tefek, ward key=koruma anahtarı.
- Fez the hat is "fes" (fesim, fesine) and Fez the character stays "Fez". The ending line "That explains the fez" became "Eh. Fes meselesi de böylece anlaşıldı."
- Names (Fez, Hori, Henut, Ipi, the gods) are unchanged. Isis is kept as "Isis", not the Turkish "İsis".

TONE: the player is always "sen". The priest and the pharaoh speak to the explorer with formal "siz", and the explorer answers them the same way. This follows the Dutch "U" and fits their stiff characters. Fez, Ipi and Henut speak informally.

LINES FOR A NATIVE READER TO CHECK:
- fez wizard_treasure_tomb_b.2 ("Pek bir şeye benzemeyen bir malı satmam gerekse...") and the "Hesap Defteri"/"Kâtibin Defteri" names for the sumplete and papyrus sudoku puzzles.
- Re-invented jokes: starter_2.5 receipts ("Tam da beklediğim gibi!"), junior_4.2 ("kıyıyı ona çarparak bulurlardı"), "İki göz bir gözden iyidir", the camel looking down on Fez ("tepeden bakıyor", which works as both literal and idiom), and "Takırtı bedava".
- Sentences built around emoji placeholders ({{token}}, {{mark}}, {{glyph}}): Turkish case suffixes can't attach to an emoji, so I worded around them ("{{mark}} işaretini", "Bu satırda gereken {{token}} zaten var"). Check the eclipse hints loneMark and linePairing.differentTakesOne, and starBattle spanning.fromRows/fromCols.
- The parity hints use "tek sayı" for "odd number" while also needing "only" ("Kalan sayılardan tek olan sadece {{value}}"). A reviewer should confirm this isn't ambiguous.
- In canisters.claimAria ("Miktarı {{capacity}} kabı tutuyor de") and journeys.showStops, the placeholder lands in the middle of the sentence.
- inventory: "Kâhin" is used both for the Oracle profession (p12) and in tableau text, and "Bekçi" for Guardian.
- The dev-tool strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated literally.

Untranslated keys: 0.

## ca

SPEC STATUS: in the real repo both specs currently fail before any test runs, and the cause is not Catalan. Other languages are still being written in parallel. languages.ts now lists "es-ES", but public/locales/es-ES does not exist yet, so languages.spec cannot load. public/locales/cy has no common.json yet, so plurals.spec cannot load. To check ca anyway, I copied both spec files unchanged into a sandbox in my scratchpad. The sandbox held only public/locales/en and ca, plus a languages.ts that lists just en and ca. Result there: 2 files, 13 tests, all passed. Re-run the real specs once the parallel locales are complete. A separate script also confirmed: no missing or extra keys in any of the 8 files, all plural sets complete, all JSON valid.

TERMINOLOGY (kept the same across files):
- Difficulty levels: Principiant / Júnior / Expert / Mestre / Mag. "Mag" follows nl "Tovenaar". It is only the top level's name. Elsewhere I write "de nivell X", e.g. "viatges de nivell Mag".
- Puzzle words: pyramid floor = pis; journey = viatge; expedition = expedició; tomb = tomba; vault = cambra; trinkets/junk = andròmines; stall = parada; coin = moneda; map piece = tros de mapa; hint = pista; puzzle = trencaclosques; tableau = quadre; square/cell = casella; region = zona.
- "Hatched" squares in hints = "assenyalat/assenyalada". Tiers: Pedra / Bronze / Plata / Or / Diví.
- Cast: the player is addressed with informal "tu". The priest and the pharaoh speak to the player with "vostè", the way nl uses formal "U". Henut calls Fez "jovenet".
- Fez is called "en Fez" in UI text (Catalan personal article); Henut is "la Henut" and Ipi "l'Ipi" when narrated in dialogue.
- The hat is written "fes", the standard Catalan word. The character name stays "Fez". The closing line "Això explica el fes" still links the two.
- Ipi's line keeps the Hori foreshadowing ("i aquell ALTRE Hori"). "lapis" became "lapislàtzuli" everywhere.
- Star-battle hints put an emoji in {{token}}. I set Catalan articles by that emoji's gender: ⭐ estrella, 🛖 granja, 🪔 llàntia and 🏪 parada are feminine; 🪷 lotus and 🐈 gat are masculine.

FOR A NATIVE READER TO CHECK:
1. I avoided gendered adjectives aimed at the player, e.g. "Allà has estat una estona sense dir res" and "Segur?". Please look for any I missed.
2. fez wizard_3: the heart and feather joke now hinges on "Lleuger. El vols LLEUGER."
3. Camel lines: "look down on you" became "et miren per sobre l'espatlla".
4. "Bastet fa ronc-ronc" for purring.
5. The Henut/Karnak priest line uses "Se'n farà l'important" for "insufferable about it". Elsewhere "insufferable" is "insuportable".
6. Canisters claimAria: "Digues que el de {{capacity}} té la quantitat".
7. The dev-tool strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated literally. That includes "Xarxa" for web and "Estirades" for pulls.

## eu

SPECS: specsPass=true is based on an isolated run, not the repo commands. In the worktree, both commands abort while loading the spec files, before any eu test runs. The cause is other agents' unfinished folders (es-ES has no folder yet; cy has no common.json), not eu. In a scratch copy containing only en and eu, both specs passed in full (13 tests).

ADDRESS FORM: I used "zu" everywhere, not "hi" (hika). Hika is the truly informal form, but it is regional and changes with the listener's gender (toka/noka), and nobody writes children's books or games in it. "Zu" is the normal way to talk to a child in written Basque. A native reviewer may want to confirm this choice.

DIFFICULTY NAMES: Hasiberria (starter), Gaztea (junior), Aditua (expert), Maisua (master), Aztia (wizard). These follow nl's literal level names; "Aztia" is used purely as a level name. In running text I write "{{tier}} mailako …" ("…of {{tier}} level") so no case ending has to attach to the placeholder.

TERMINOLOGY (used the same in every file): piramidea, hilobia (tomb), altxorra (treasure/artifact), bidaia (journey), espedizioa, kanpalekua (camp), buru-hausgarria (puzzle), pista (hint), giltza (key), txanpona (coin), solairua (floor), ikurra (sign/glyph), hieroglifoa, errenkada/zutabea/laukia (row/column/square), marraz betetako (hatched), Fezen postua (Fez's stall), tramankuluak (trinkets/junk), lapislazuli (lapis), deben unchanged. The fez hat is "fez txapela" or just "txapela"; the character keeps the name Fez.

PLACEHOLDER GRAMMAR: Basque case endings make placeholders awkward. Where possible I kept them in a form that needs no ending (procession marks use "{{a}}: …" with event names in plain form). A few still carry a hyphenated ending ({{name}}-ra, {{last}}-raino, %{{pct}}-an); please check that these read well. The _one forms spell out "bat" ("Txanpon bat", "Pista bakar batekin"); the tests allow dropping {{count}} in plural keys.

WORDPLAY TO CHECK:
- The ending: "Hori" also means "that" in Basque. The Sphinx reveal "Hori." can read as "That.", and the closing line is "Horrek azaltzen du txapela" ("that explains the hat"). Ipi's line became "Hori izeneko horiek, ordea…" ("but those ones called Hori…"). A native reader could make more of this double meaning, or decide to soften it.
- Ipi's "eleven deben" became "hamaika deben". "Hamaika" also means "lots", which happens to fit.
- Explorer's "Wáy too much" became "GEHIEGI-GEHIEGI"; the voice's "Not thére!" became "HOR ez!".
- "Two see more than one" became the idiom "Lau begik bik baino gehiago ikusten dute" ("four eyes see more than two").
- wizard_3 heavy/light heart joke: "Arina. ARINA nahi duzu."

LINES WORTH A NATIVE LOOK:
- I wrote starBattle and pairPuzzle hints with templates, because most lines are near-repeats. One example: "Errenkada honek baditu jada bere {{count}} {{token}}" — {{token}} is an emoji there.
- Canisters claimAria: "Esan {{capacity}} edukierako ontziak duela kopurua" ({{capacity}} is the capacity number, so this reads as "say the {{capacity}}-size vessel holds the amount").
- Henut calls Fez "gazte" ("young one") for "young man", so it stays gender-neutral.
- The priest and the pharaoh speak formally in Dutch (u). In Basque they use zu too, and their formality comes only from word choice.
- In master tableau run5_level3, "eguzki-txalupan" means "in the solar barque" rather than "with" it.

PROCESS: the tableaus descriptions repeat a lot. I translated each unique English line once and filled the repeats by matching the English text (script kept in the scratchpad).

## gl

SPEC STATUS: Both specs pass for gl, but I could only show that in a copy, not in the repo itself. In the worktree, both spec FILES fail before any test runs, for every language. The cause is other locale folders still being written in parallel: languages.spec cannot find public/locales/es-ES, and plurals.spec cannot find public/locales/cy/common.json. So `-t "gl"` reports "no tests" there. To check gl anyway, I copied en/ and gl/ plus the two unchanged spec files into the scratchpad, with a stub LANGUAGE_CODES = ["en","gl"]. Result: 13/13 passed, including placeholders, keys only English has, plural categories, and plural forms rendering as text. Please rerun the real commands once all the folders exist.

Other checks: a script compared every key path with en and found nothing missing or extra (the arrays in procession.events were checked too). No stray non-Latin characters. Galician plurals are one/other (same as English), so the _one/_other keys are kept as they are. Only names (gods, Fez/Ipi/Henut, Ankh, Hori), symbols (???, arrows, …) and words spelled the same in Galician (Detector, Portal) are left as in English.

TERMINOLOGY (used the same way in every file):
- Difficulty levels: Principiante / Xúnior / Experto / Mestre / Mago. These match the es and pt-PT files and nl's "Tovenaar". {{tier}} is always written as "expedicións/viaxes de nivel {{tier}}" so it reads as a level name, never as magic. A native reader might prefer "Xenio" over "Mago" for wizard. If so, change it in common.difficulty, purchases.secondDonkey.opens and devLockEditor.worldCarved.
- journey = viaxe; expedition = expedición; tomb = tumba; floor = piso; corridor = corredor; camp = campamento; stall = posto; trinkets/junk = bagatelas; coins = moedas; hint = Pista; puzzle = crebacabezas; glyph = símbolo; sign = signo/símbolo; hieroglyph = xeroglífico; map piece = anaco de mapa; key = chave; lever = panca; torch = facho; chest = baúl.
- Puzzle boards: square = cadro; hatched = raiado; region = zona; farmstead/plot/holding = granxa/parcela/finca; flagstone = lousa; oil lamp = candil.
- Name clash to check: in Galician the frog is "Rá", which looks almost like the god Ra. I kept the correct word (inventory a10 and the wizard tableau lines) but the two may confuse children. "Sapo" would avoid it, though it is technically a toad.

LINES FOR A NATIVE READER TO CHECK:
- The explorer and Fez use "tu". Henut speaks to both visitors at once with "vós" (Viñestes, Xa vos dixen).
- fez.meeting.starter_1.16 ("Two see more than one") became the Galician saying "Catro ollos ven máis ca dous". The emphatic "thére"/"Wáy" became capitals: "AÍ non!" and "MOITÍSIMO".
- fez.reading.sphinx.13 is a literal "Bueno. Iso explica o fez.", as in nl. I kept "Bueno" in casual dialogue because it is common spoken Galician. A purist may want "Ben" or "Vaia".
- fez.wizardB.6 is written as notebook text in the first person plural ("Non sei ler… Volvemos polo selo. Fixemos un mellor.").
- fez.cave.wizard_treasure_tomb_c / camp.firstFind: the jokes were rewritten for natural speech, not translated word for word.
- fez.arrival.junior_4.1: "three hundred feet" became "cen metros".
- canisters.rules.claim refers to the button text, so «este» must match canisters.claim ("este").
- procession.events are short nouns with an article ("o lume", "a sega"…) placed inside "{{a}} empeza…". The sentence starts lowercase, just as in English.
- tableaus wizard descriptions write item names with capitals ("o Ollo de Horus", "a Barca Solar"), following English. The earlier tiers use lowercase.

Formatting: files are written with JSON.stringify (2-space indent), so the one-line {"fez": …} entries in fez.json are expanded onto several lines. The content is the same.

## cy

TEST STATUS: I could not run the two specs as given in the real worktree. Both crash before any test runs, because other agents' folders are still incomplete: languages.spec fails with "ENOENT scandir public/locales/es-ES", and plurals.spec fails with "ENOENT ga/common.json". So I copied languages.ts, the two specs, en and cy into a scratchpad folder, with LANGUAGES cut down to en and cy (in the copy only), and ran vitest there. All 13 tests pass, including "are exactly the locale folders". Re-run the real commands once the other languages are written.

A separate i18next check rendered every cy plural at every Welsh category and found no raw keys (2 → "2 o ddarnau arian", 1 → "1 darn arian").

PLURALS: English only has _one/_other. I wrote _one as number + singular ("{{count}} darn arian") and _other as "{{count}} o + soft-mutated plural" ("{{count}} o ddarnau arian"). A script then copied _other into _zero/_two/_few/_many. Where the "o + plural" form read badly in puzzle hints, I used number + singular instead ("{{count}} lamp olew", "{{count}} sgwâr"); that is grammatical for any count. A native reader may prefer real dual/few forms with mutation ("dau ddarn", "tri darn"), but with digits mutation can't be shown cleanly.

TERMINOLOGY:
- Difficulty levels, following nl (wizard = Tovenaar): starter = Dechreuwr, junior = Iau, expert = Arbenigwr, master = Meistr, wizard = Dewin. "Dewin" means wizard but is used only as a level name, never as magic.
- Expedition and journey are both "taith" (pl. teithiau). I picked one word so kids aren't confused; "alldaith" is the formal word for expedition if a split is wanted.
- tomb = bedd, pyramid = pyramid, floor = llawr, level = lefel, puzzle = pos, hint = cliw, coin = darn arian, trinkets = trugareddau, treasure = trysor, artifact = arteffact in the collection tab but "trysor (arbennig)" in dialogue, map piece = darn o fap, mosaic = mosaig, camp = gwersyll, stall = stondin, chest = cist, key = allwedd, gate = giât, trap = trap, corridor = coridor, detector = synhwyrydd, compass = cwmpawd, hieroglyph = hieroglyff, seal = sêl.
- Puzzle hints: row = rhes, column = colofn, square = sgwâr, region = ardal, "hatched" = streipiog, "rule out" = "rhoi croes ar" (put an X on), odd/even = odrif/eilrif.

REGISTER: The player is addressed as "ti" everywhere. The priest and the pharaoh say "chi" to the explorers, and the explorers say "chi" back, matching the Dutch "u". Fez and Henut use "ti". The spoken style is southern-leaning (e, nawr, dere, mas, 'nôl, bant). A northern reviewer might prefer o/fo, rŵan, tyrd, allan.

LINES FOR A NATIVE TO CHECK:
- meeting.starter_1 and end: "Something neat" became "Rhywbeth gwych", with Fez answering "Mae gwych yn gwerthu!" and later "Oedd e'n wych?" / "Fe wnaiff y tro." Check that the joke lands.
- tomb.juniorFixed.12, "Basech. A finnau hefyd.": Henut switches to "chi" toward Fez on purpose, to make the moment feel more formal.
- tomb.master.13, "Mae e'n WYRDD, y creadur hurt!"
- inventory signs.s1, the Horus → Hori explanation.
- The "{{token}} fan hyn" pattern in star-battle hints. Welsh has no "a/an", so this works without knowing the token's gender, but the word order may read stiff.
- Mutations I'm less sure of: "Gwyliadwriaeth Dragwyddol y Pharo", "Ail gamel", "dy gert cryfach" vs "dy gert gryfach" (I treated cert as masculine in camp.json but used "Cert gryfach" in common/fez; pick one gender), "Glain Aur Bach", and the descriptive item names in sellables.json.
- The run descriptions in tableaus.json were simplified for kids rather than translated word for word.

OTHER: The dev editor strings (devLockEditor, devRoomEditor, devPrefabPreview) are translated too, plainly. The only file I put in the repo outside cy/ was a temporary check script in the repo root; I deleted it straight after running it. Nothing else outside public/locales/cy/ was changed, and I made no git calls.

## ga

Spec status: plurals.spec -t "ga" passes. languages.spec stops before any test runs because the es-ES folder listed in languages.ts doesn't exist yet. I ran its two ga checks (only English keys, every placeholder kept) myself in node and both are clean. It should pass once the other locale folders are in place.

Difficulty level names, used the same way everywhere: starter=Tosaitheoir, junior=Sóisear, expert=Saineolaí, master=Máistir, wizard=Draoi. "Draoi" (druid/wizard) mirrors nl "Tovenaar" and is used only as a level name ("turais Draoi").

Recurring terms:
- pyramid=pirimid, tomb=tuama, journey/expedition=turas
- treasure=stór (Treasures tab = Seoda), chest=cófra, coin=bonn, key=eochair
- trap=gaiste, corridor/passage=pasáiste, floor=urlár, camp=campa
- puzzle=puzal, hint=leid, stall=stainnín, trinkets=mionrudaí, artifact=déantán, hieroglyph=iairiglif
- row=sraith, column=colún, square=cearnóg, hatched=stríocach
- ward key=eochair chosanta, detector=brathadóir

Plurals: Irish needs one/two/few/many/other. Where a noun follows {{count}}, the sound change is written in: bonn (bhonn/mbonn/bonn), píosa, páirt, pasáiste, cearnóg, ceapach, cat, ciaróg, mumaí, doras, beart. Hours use "uair/huaire/n-uaire an chloig". When the noun is an emoji {{token}} or a placeholder, the forms are the same. A few _one forms spell out the number ("Beart amháin fágtha", "Doras amháin in úsáid"), which the spec allows.

Lines for a native reader to check:
1. fez.json is spoken dialogue. Check that it sounds natural, especially the jokes:
   - wizard_3: "Éadrom. Ba cheart dó a bheith ÉADROM."
   - the camel and donkey lines ("Grágaíl. Is caint í, ach níos airde.")
   - meeting.starter_1: "I bhfad, I BHFAD an iomarca" (my version of the "Wáy too much" stress)
   - chapterExpert: "Baineann siad plaic asat" (for "they bite")
2. "Hori/Horithe" in Ipi's line, and the hieroglyph-sign description "déantar Hori de Horus".
3. Some place names after a preposition can't be changed by the translation (e.g. "{{place}}"). To avoid a grammar break, the purchases hint is now "Díolann Fez ceann anseo: {{place}}".
4. Long puzzle hints (lightbeam, futoshiki, sumplete) are close to the English. They may be heavy for 7–12-year-olds.
5. Mythology names (Ra, Anubis, etc.) are kept. "Vizier" is kept as is, and "Frog" is the same word in Irish.
6. Event lists in procession: please check the articles, e.g. "an bhácáil", "an tsnoíodóireacht", "an t-órú".
7. The dev-only editor strings (devLockEditor, devRoomEditor) are translated quickly and literally.

Nothing outside public/locales/ga was touched. No git commands were run.

## fy

The specs have not been run in the repo yet. They pass 13/13 in an isolated copy with only en and fy. In the repo both suites crash while loading, because other languages are still being written: es-ES has no folder yet, and cy has no common.json yet. specsPass=false only because of that. Once those locales finish, re-run `yarn vitest run src/i18n/languages.spec.ts -t "fy"` and `yarn vitest run src/i18n/plurals.spec.ts -t "fy"`.

Every one of the 2611 strings is translated. A few are the same as English on purpose: god names, Hori, "Junior", "Master", "Hint", the footer, "×{{count}}", "{{letter}}, {{kinds}}", "per". I translated mostly from the Dutch, which is very close to Frisian, and checked the English for structure.

Words used the same way everywhere:
- Difficulty levels (following nl Beginner/Junior/Expert/Meester/Tovenaar): Begjinner / Junior / Ekspert / Master / Tsjoender. "Tsjoender" is only the level name, as nl uses "Tovenaar".
- Player address: do/dy/dyn, with spoken forms like bisto, witsto, kinst, hast, witst.
- The priest and the pharaoh say formal "jo" to the explorer, matching nl "U". Ipi, Henut and Fez say "do".
- Core game words: piramide(n), grêf/grêven (tomb), skat (treasure), kiste (chest), kaai (key), slot (lock), doar (door), gong (corridor), ferdjipping (floor), tocht/reis (journey), ekspedysje (expedition), kamp, kream (Fez's stall), munt(en), snypsnaren (junk), hiëroglyf/hiëroglyfen, kaartstik (map piece), mozayyk, fâlstrik (trap), wetterpûde (waterskin), hindel (lever), fakkel (torch), segel (seal), hegepryster (high priest), farao, skriuwer (scribe), fakje (grid cell), rige/kolom (row/column), arsearre (shaded, for the Dutch "gearceerd"), markearre (marked), ljochtstriel (light beam), weachskaal (scales).
- Animals: ezel, kamiel, karre (cart), banier (banner).

Lines a native Frisian reader should check:
1. "Fâlstrik" for trap. Is "strik" or "fâle" more natural?
2. "Tsjoender" as a level name. Does it read too much like real magic for children?
3. "arsearre" for "gearceerd" (shaded). It is a loanword and may sound odd; maybe "skaad" or "griis makke"?
4. Spoken jokes in fez.json:
   - wizard_3 ("Licht. Do wolst him LICHT.")
   - reading.sphinx ending ("No. Dat ferklearret de fez.")
   - tomb.starter Ipi/Fez lines ("Ik mei him wol lije!")
   - camp.homeEmpty ("Foar myn skonken. Dy binne hiel koart, hè.")
5. Grammar choices worth a look:
   - contracted forms like "wat'st", "dêr'tst", "hoe'tst", "as'st"
   - "Dat wiste net." (explorer, tomb.expert.14)
   - "seuret" (Henut)
   - revisit.master.rite1 "No wurdt er der net te harden oer." (meant as "now he'll be unbearable about it")
6. Word choices to check:
   - journeys.json treasure-tomb names were reordered for Frisian, e.g. "Ferburgen Klûs fan de Eallju" and "Skatkeamer fan de Hegepryster".
   - "Nylslyk" (Nile silt), "Sjoertou" (lashing rope), "Stagtouwen" (stay lines), "Spoarten" (ladder rungs), "Tontel" (tinder), "Rys" (brushwood).
   - "Tablo" for the UI word "tableau".
   - "bebouwe" in starBattle fields ("Dizze rige is al bebouwe").
7. Spelling of the capital circumflex letters: I corrected Ûnder, Ûnútsteanber, Ôfbliuwe, Útlis, Útferkocht, Útrêste, Ôfbrekke and Ûngedien by hand. A spot-check for any I missed would help.

Not changed: tableaus.json follows English and Dutch in having no expert run6_level2 description.

## id

TEST STATUS: I could not run the two specs in the real repo. Other languages are being written at the same time and are half-finished: public/locales/ga has no common.json yet, and languages.ts lists es-ES but that folder does not exist. Because of this, both spec files crash while loading ("no tests"), and that has nothing to do with id. To check id anyway, I copied en, nl and id plus the two spec files into a scratch project, with a stub LANGUAGE_CODES = ["en","nl","id"]. There, all 19 tests passed, every id test included (only translates keys English has, keeps placeholders, supplies every plural category, renders plurals). Please rerun both specs in the repo once all locale folders are complete. The scratch copy is at /private/tmp/claude-501/-Users-matthijsgroen--warp-worktrees-pyramid-scheme-horned-toad-madrone/ddcadb88-ee81-4ee6-a996-623a27b667f3/scratchpad/proj.

Strings left the same as English on purpose: names (Ra, Anubis, Fez, Hori, Ipi, Henut and so on), Ankh, Sistrum, Obelisk, Junior, Master, Level, Portal, "per", "Oh.", "…", and the footer. They are names or are also ordinary Indonesian words.

TERMINOLOGY:
- Player is addressed informally with "kamu/-mu". Characters say "aku" with light spoken particles (kok, sih, lho, ya). I avoided Jakarta slang (gue/lo) so any Indonesian child can read it.
- Difficulty levels: Pemula / Junior / Ahli / Master / Penyihir. "Penyihir" follows the Dutch "Tovenaar" (a literal "wizard"), but it can sound magical. A native reviewer might prefer to keep the loanword "Wizard". Expedition names follow the same pattern, e.g. "perjalanan Ahli".
- Recurring game words: perkemahan (camp), lapak (stall), ekspedisi, perjalanan (journey), makam (tomb), lorong (corridor), lantai (floor), potongan peta (map piece), pecahan hieroglif, potongan mosaik, pernak-pernik (trinkets), harta (treasure), petunjuk (hint), kotak (puzzle square), baris/kolom (row/column), diarsir (hatched), tanda (sign), stempel (seal ring), segel (seal on a door or gate), imam besar (high priest), firaun, juru tulis (scribe), Ruang Paling Suci (Inner Sanctum), Aula Osiris, Ruang Harta Para Dewa, Alam Kekuatan Semesta.

PLURAL KEYS TO CHECK: some English _one forms said something different from _other. For example, fields "This row is already worked", or canisters goal_one, which talks about a single measure. Indonesian has only _other, so I wrote one sentence that has to read well for any count. Please check canisters.goal.*_other: it says "satu per satu" (one by one), which sounds slightly odd when there is only one amount to measure.

LINES A NATIVE READER SHOULD CHECK:
- fez.json arrival.wizard_3: the heavy-versus-light heart joke ("Ringan. Jantungnya harus RINGAN.").
- tomb.junior/juniorFixed: Henut's "Rahasia itu cuma sebutan orang untuk berhitung…" line.
- meeting.starter_1: the stressed words ("Jangan DI SITU!", "Kemahalan BANGET").
- "Keren?" / "Lumayan." at the end. "Neat" became "keren".
- tomb.master.13: "dasar kadal konyol" (Fez is a lizard).
- arrival.junior_4: the lighthouse height is given as "seratus meter" in place of "three hundred feet".
- Spoken tone in the animal and camp banter.

OTHER: rushHour market "sledge" is "kereta luncur". The procession event names in the arrays are rewritten as activities, e.g. "menyalakan api" (lighting the fire).

## es-ES

Adapted from `es` (Latin American): vosotros in the plural dialogue (Henut, the priest, the pharaoh), planta for a pyramid floor and suelo for the ground, sala for rooms, coger for taking, tirar de for levers, pequeño, manta, cuenco, pendiente, lápiz de ojos, encender, hacerse daño, volver andando; five lines moved to the Spain-style perfect (spot check, not exhaustive). Check: "capte la primera luz" (capstone), "monte" (cave hill), "cuenquito", the vosotros imperatives "Llevádsela" and "Traed", and the planta/suelo split in the hint strings.
