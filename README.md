# TightPrint.md

**Print Markdown, not forests.** TightPrint.md turns a Markdown file into a PDF with the smallest margins and
spacing that still read comfortably, so every A4 page carries as much as possible. Formatting stays intact; wasted
white space goes away.

Dnes jako plugin pro [MarkEdit](https://github.com/MarkEdit-app/MarkEdit) (macOS). Cílem je časem podporovat i další
aplikace, které pracují s `.md` soubory; jádro (Markdown → hustý PDF) je na editoru nezávislé a MarkEdit je zatím
jediný adaptér.

PDF má plný rozměr A4; tiskárna si ho případně nepatrně zmenší o své nutné okraje.

Vychází z rozšíření [markedit-pdf-export-pretty](https://github.com/akurach/markedit-pdf-export-pretty)
(autor akurach, použito se souhlasem autora; upstream repozitář zatím nemá soubor LICENSE).

## Co umí

- **Zhuštění jedním posuvníkem** – okraje, písmo, řádkování, mezery i odsazení se mění společně (Normální / Úsporný / Maximální).
- **Vejít se na N stran** – plugin sám najde nejmenší zhuštění, při kterém se dokument vejde na zvolený počet stran.
- **Bloky kódu a ASCII diagramy** – každý blok dostane vlastní velikost písma, aby se nejdelší řádek vešel bez zalomení;
  diagramy z rámečkových znaků mají řádkování 1,0, takže čáry na sebe navazují.
- **Opravené tabulky** – tabulky s oddělovačem z typografických pomlček (`|—|—|`), které by se jinak vytiskly
  jako surový text, se před renderem převedou na platné.
- **Úzké mezery kolem čar a nadpisů** a řízení zlomů (nadpis nezůstane sám na konci strany, krátké tabulky a kód se nedělí).

## Použití v MarkEditu

Menu **Rozšíření → TightPrint.md**:

| Položka | Význam |
|---|---|
| Tisk… (⌥⌘P) | vygeneruje PDF a otevře nativní tiskový panel macOS |
| Uložit jako PDF… (⇧⌘E) | vygeneruje PDF a otevře dialog uložení |
| Hustota | Normální / Úsporný / Maximální |
| Vejít se na | cíl: 1–10 stran nebo vlastní počet |
| Nejmenší okraj | 3 / 5 / 7 / 10 / 15 / 20 mm, žádný okraj nebude menší |
| Číslo strany v zápatí | zapnuto/vypnuto (potřebuje dole cca 8,5 mm) |
| Písmo textu / Písmo kódu | systémová písma (.ttf/.otf) |

Nastavení se pamatuje v `tightprint.json` ve složce Documents kontejneru MarkEditu.

## Co se zhušťuje

Jediný parametr `t` (0 až 1) lineárně mění: okraje (57 → 20 pt), velikost písma (10,5 → 9,5 pt), řádkování
(1,35 → 1,15), vnější mezery (100 → 30 %), velikost nadpisů (100 → 75 %), vnitřní odsazení tabulek, kódu a panelů
(100 → 40 %). „Vejít se na N stran“ hledá nejmenší `t` půlením intervalu a vrací jen hodnotu, kterou skutečně změřilo.

Bloky kódu mají vlastní pravidla: písmo se zmenšuje jen tolik, aby se vešel nejdelší řádek, ale ne pod 7 pt u běžného
kódu (pod to se zalamuje) a ne pod 5,4 pt u diagramů (jejich zalomení by je zničilo).

## Instalace

```bash
npm install
npm run install-script   # sestaví a zkopíruje do složky skriptů MarkEditu
```

Potom MarkEdit restartujte. Sestavený soubor je i hotový v `dist/tightprint.js`; stačí ho zkopírovat do
`~/Library/Containers/app.cyan.markedit/Data/Documents/scripts/`.

## Vývoj

```bash
npm run build       # dist/tightprint.js
npm run typecheck
npm run smoke       # test/out/*.pdf: tři hustoty, „vejít se na N stran“, ASCII diagramy a tabulky
```

## Omezení (stav k prvnímu sestavení)

- Ověřeno jen v Node (pdfmake, jsdom); v samotném MarkEditu zatím ne.
- `showPrintPanel` vyžaduje novější MarkEdit (API 0.39.0); ve starších se plugin nabídne uložit PDF.
- Obrázky: jen PNG/JPEG/SVG (omezení pdfmake), matematika (KaTeX) není podporována.
- Prahy čitelnosti (nejmenší písmo 9,5 pt, řádkování 1,15) jsou výchozí návrh a je potřeba je ověřit zkušebním tiskem.
- Velmi široké diagramy (přes ~150 znaků) se vejdou jen s písmem kolem 5,5 pt.

## Licence

Svobodné pro osobní a jiné nekomerční použití pod [PolyForm Noncommercial License 1.0.0](LICENSE).
Komerční použití vyžaduje placenou licenci — podmínky v [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md).

## Lokalizace

UI je v `src/locales/*.json`; nový jazyk je jeden PR, žádný zásah do kódu. Viz [docs/I18N.md](docs/I18N.md).

## Verzování a přispívání

Sémantické verzování vynucené automaticky z commit zpráv — viz [docs/VERSIONING.md](docs/VERSIONING.md)
a [CONTRIBUTING.md](CONTRIBUTING.md).

## Hlášení chyb, statistiky, soukromí

Plán (zatím nenasazeno) je v [docs/TELEMETRY-AND-REPORTING.md](docs/TELEMETRY-AND-REPORTING.md) a
[docs/PRIVACY.md](docs/PRIVACY.md).

---

© 2026 jeKral.cz
