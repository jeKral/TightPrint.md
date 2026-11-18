# Předání projektu TightPrint.md novému vývojáři

> Tenhle dokument je napsaný tak, aby ho šlo poslat (nebo vložit do promptu) novému
> vývojáři/AI asistentovi, který na projektu začíná pracovat poprvé, a dostal z toho
> kompletní kontext bez nutnosti cokoliv dalšího dohledávat. Je k 2026-11-18, commit
> `68c909d`, verze `1.1.1`.

## Co to je

**TightPrint.md** — plugin do [MarkEditu](https://github.com/MarkEdit-app/MarkEdit) (macOS
Markdown editor), který exportuje `.md` do hustého, ale čitelného PDF, s cílem šetřit papír při
tisku. Autor: Jan (jeKral.cz / Roztisk.cz). Repo: `github.com/jeKral/TightPrint.md` (pozor —
case-sensitive, GitHub má redirect z `tightprint.md`, ale remote URL v gitu musí být přesně
`https://github.com/jeKral/TightPrint.md.git`, jinak chodí redirect warning).

**Dlouhodobá vize** (viz `docs/DECISIONS.md`, záznam "Název a vize"): jméno úmyslně neobsahuje
"MarkEdit" — časem má podpořit export i z dalších .md aplikací. MarkEdit je jen první adaptér.

## Architektura (přehled)

```
Markdown (.md) --markdown-it--> HTML --DOM transformace--> html-to-pdfmake --> pdfmake 0.2.x --> base64 PDF
```

- `src/markdown.ts` — markdown-it s pluginy (footnote, task-lists, deflist, mark, sub/sup,
  highlight.js), `src/callouts.ts`/`src/codeblocks.ts`/`src/transforms.ts`/`src/preprocess.ts`
  dělají DOM transformace nad vyrenderovaným HTML.
- `src/density.ts` — "hustota" tisku (0–1), interpoluje mezi presety NORMAL/MAXIMUM; umí i
  "vejít se na N stran" (`fitToPages`, binární hledání přes `densityAt`).
- `src/pdf.ts` — staví pdfmake document-definition z HTML, včetně vlastních písem
  (`src/fonts.ts`, `src/mono-font.ts`) a tabulkových layoutů.
- `src/config.ts` — perzistentní config pluginu, ukládá se jako `tightprint.json` přes
  `MarkEdit.getFileContent`/`MarkEdit.createFile` (MarkEdit API nemá jiné úložiště).
- `src/main.ts` — vstupní bod, menu, export flow, nastavení (viz níže UX poznámka).
- `src/i18n.ts` + `src/locales/{cs,en}.json` — vlastní i18n, žádná externí knihovna.
- `src/telemetry.ts` — hlášení chyb a anonymní statistiky (nové, viz sekce níže).
- `backend/` — samostatná Node/Express služba, kterou MarkEdit plugin potřebuje, protože sám
  nemá síť (viz sekce "Telemetrie a hlášení chyb").

## MarkEdit extension API — co je a co není k dispozici

Zdroj pravdy: `markedit-api` typové definice (balíček `markedit-api` v `node_modules`, nebo
https://github.com/MarkEdit-app/MarkEdit-api). Důležité věci, které jsme si ověřili:

- **Žádné `fetch`/HTTP/WebSocket.** Jediná cesta ven ze sandboxu:
  `MarkEdit.runService(name: string, input?: string): Promise<boolean>` — spustí pojmenovanou
  macOS Službu (Services menu).
- `MarkEdit.showAlert`, `showTextBox`, `showContextMenu`, `showOpenPanel`, `showSavePanel`,
  `showPrintPanel` — UI dialogy.
- `MarkEdit.runtimeInfo(): RuntimeInfo` — `{ appVersion, appBuild, osVersion, webkitVersion }`.
- **Nativní menu se po kliknutí na JAKOUKOLIV položku vždy celé zavře** — to je chování AppKitu,
  API pro "zůstat otevřené" neexistuje. Řešení popsané níže ("sticky" nastavení).
- Config (`tightprint.json`) se čte/píše přes `MarkEdit.getFileContent`/`MarkEdit.createFile` —
  není žádné jiné key-value úložiště.

## UX: "sticky" nastavení (menu se znovu otevírá samo)

Problém, který Jan explicitně řešil: po kliknutí na jakoukoliv položku v nastavovacím menu se
celé menu zavře a je nutné znovu procházet File ▸ Extensions ▸ TightPrint.md od začátku.

Řešení v `src/main.ts`:
- `openSettingsMenu()` otevře `settingsMenuItems()` jako **samostatné** `showContextMenu`
  (ne submenu hlavního menu).
- `sticky(mutate)` je wrapper: `() => { void Promise.resolve(mutate()).then(() => openSettingsMenu()); }`
  — každá akce v nastavení uloží změnu a **znovu otevře to samé kontextové menu**. Výsledek: lze
  měnit víc voleb za sebou, aniž by se člověk vracel do hlavního menu.
- Hlavní menu (`buildMenu()`) má jen: Tisk, Uložit jako PDF, "Nastavení tisku…" (otevírá
  `openSettingsMenu()`), "Nahlaš chybu…".

Pokud bys chtěl tohle měnit/rozšiřovat, drž se stejného patternu — nová volba v nastavení =
další item v `settingsMenuItems()` s `action: sticky(() => saveConfig({...}))`.

## Verzování a CI (semantic-release)

- `.releaserc.json` + `.github/workflows/release.yml`: každý push na `main` spustí
  commitlint → typecheck → smoke test → build → `semantic-release`.
- **Conventional Commits je povinné** (`feat:`, `fix:`, `docs:`, `chore:`, …) — commitlint to
  vynucuje, jinak CI spadne.
- `semantic-release` sám určuje verzi z typu commitu (`feat` → minor, `fix` → patch, breaking
  change → major) a **sám vytváří tag, GitHub Release, `chore(release)` commit a
  CHANGELOG.md** — běží to uvnitř GitHub Actions runneru, který na rozdíl od vnějšího
  GitHub-proxy (viz níže) **může** pushovat tagy.
- **Pozor na první release past**: pokud repo nemá žádný existující tag, `semantic-release` při
  prvním běhu VŽDY vytvoří `v1.0.0`, bez ohledu na typ commitu (to je jeho natvrdo zadrátované
  chování, ne bug). Tohle se stalo i tady — zamýšlené `v0.1.1` skončilo jako `v1.0.0`, Jan se
  rozhodl to přijmout jako skutečnou první verzi (viz `docs/DECISIONS.md`). Další verze už se
  počítají normálně (teď jsme na `v1.1.1`).
- `[skip ci]` v commit message spolehlivě vynechá GitHub Actions run (nativní GitHub feature) —
  použij, když potřebuješ pushnout bez spuštění release (např. drobnou doc opravu).
- `PLUGIN_VERSION` konstanta v `src/telemetry.ts` se **nepíše ručně** — vkládá ji vite přes
  `define` z `package.json` při buildu (viz `vite.config.mts`), aby neujela ze synchronizace
  (dřív to byl hardcoded string a hned po prvním release byl zastaralý).

## GitHub-proxy write restrictions (DŮLEŽITÉ pro AI agenty v tomhle prostředí)

Pokud na tomhle projektu pracuješ jako Claude/AI agent v Anthropic cloud prostředí (CCR), **tyto
operace jsou zablokované tvým proxy, ne chybějícím oprávněním na GitHubu**:

- `git push` **tag refs** (`refs/tags/*`) — HTTP 403, i přes `gh api .../git/refs`. Zpráva:
  "Write access to this GitHub API path is not permitted through this proxy." Odkazuje na
  `docs.anthropic.com/en/docs/claude-code/github-actions`.
- **Repository settings writes** (`PATCH /repos/{owner}/{repo}`, branch-protection endpointy) —
  stejná kategorie blokace.
- **Destruktivní vzdálené akce** (např. `git push origin --delete <tag>`) — blokuje je jiná
  vrstva (Claude Code auto-mode classifier, "[Destructive or Unwanted Actions]"). Instrukce při
  takovém zablokování: NEPOKOUŠET se to obejít jiným nástrojem (raw curl apod.) — zeptat se
  uživatele, co s tím.
- **Asymetrie, kterou jde využít**: i když AI agent nemůže pushnout tag/release, **GitHub
  Actions runner uvnitř workflow (`GITHUB_TOKEN`) může** — proxy se týká jen volání vycházejících
  z agentova vlastního prostředí, ne toho, co běží v CI. Proto `semantic-release` v CI funguje
  normálně.

Pokud máš jako lidský vývojář plný přístup (vlastní token, ne přes tenhle proxy), žádné z
těchhle omezení se tě netýká — jen dokonči manuální kroky v `docs/GITHUB-SETUP.md` (enable
Discussions, branch protection), což AI agent nemohl udělat sám.

## Telemetrie a hlášení chyb (dokončeno, backend čeká na nasazení)

Protože MarkEdit plugin nemá síť, jediná cesta ven je přes jednorázově nainstalovanou macOS
Zkratku (Services menu), kterou si uživatel sám vytvoří:

```
plugin (runService) → macOS Zkratka "TightPrint Relay" → backend (roztisk-srvr) → GitHub Issues API / Postgres → Grafana
```

- **Hotovo v kódu**: `src/telemetry.ts` (`sendStat`, `reportBug`), zapojení do `src/main.ts`
  (jednorázový dialog při prvním spuštění — `askTelemetryOnce()` — přepínač v Nastavení tisku,
  menu akce "Nahlaš chybu…", `sendStat('export', …)` po úspěšném exportu).
- **Výchozí stav: VYPNUTO (opt-in)** — `DEFAULTS.telemetryEnabled: false` v `src/config.ts`.
  Vědomé rozhodnutí kvůli GDPR/důvěře uživatelů pro první veřejné vydání (viz
  `docs/DECISIONS.md`, záznam "Hlášení chyb a anonymní statistiky (implementace)").
- **Co se posílá**: jen verze pluginu/MarkEditu/macOS, zvolená hustota, počet stran, náhodné
  `anonId` (lokálně generované UUID, ne vázané na osobu). Nikdy obsah dokumentu, cesta, jméno.
  Přesně popsáno v `docs/PRIVACY.md`.
- **Hotovo**: backend (`backend/`) — Node 22/Express, `pg` (Postgres), `express-rate-limit`,
  Dockerfile + docker-compose.yml. `/report` vytvoří GitHub issue (fine-grained PAT, scope jen
  `Issues: write`), `/stat` zapíše řádek do tabulky `stats` pro Grafanu.
- **Zbývá udělat (potřebuje přístup k roztisk-srvr, který tahle AI session nemá)**:
  1. Nasadit `backend/` na roztisk-srvr — přesné kroky v `backend/README.md`.
  2. Vytvořit fine-grained GitHub PAT (scope `Issues: write` jen na tenhle repo) a vložit do
     `backend/.env`.
  3. Napojit veřejnou subdomenu + TLS přes existující reverzní proxy na roztisk-srvr.
  4. Vytvořit macOS Zkratku "TightPrint Relay" podle přesného návodu v
     `docs/SHORTCUT-SETUP.md` (nejde to zabalit do `.shortcut` souboru mimo macOS, proto je
     to manuální návod, ne stažitelný soubor).
  5. Ověřit end-to-end (export s telemetrií zapnutou → řádek v DB; "Nahlaš chybu…" → GitHub
     issue).

## Licence

PolyForm Noncommercial License 1.0.0 (volné pro nekomerční použití) + vlastní dodatek
`LICENSE-COMMERCIAL.md` (komerční použití = placená licence od jeKral.cz, měsíční předplatné
nebo lifetime, přesné ceny jsou v tom souboru jako placeholdery — ověř u Jana, než cokoliv
komunikuješ zákazníkům). Copyright `© 2026 jeKral.cz`. Důvod volby PolyForm: čitelný, právníky
rozpoznaný text, menší tření než plně vlastní licence (viz `docs/DECISIONS.md`).

## Co dalšího je k dispozici v `docs/`

- `GITHUB-SETUP.md` — manuální kroky pro Jana (Discussions, branch protection, GH_TOKEN pro
  backend).
- `I18N.md` — jak je postavené `src/i18n.ts` a konvence pro klíče v `src/locales/*.json`.
- `VERSIONING.md` — detaily k Conventional Commits / semantic-release pro tenhle repo.
- `DECISIONS.md` — chronologická evidence rozhodnutí (čti od shora dolů, nikdy se zpětně
  neupravuje — oprava = nový záznam).

## Rychlý start pro lokální vývoj

```bash
npm install
npx tsc --noEmit        # typecheck
npm run smoke           # rychlý smoke test renderování/PDF bez MarkEditu
npx vite build           # produkční build -> dist/tightprint.js
```

`dist/tightprint.js` je jediný soubor, který se nahrává do MarkEditu jako plugin (viz hlavní
`README.md` pro instalační postup do MarkEditu samotného).

Pro `backend/`:
```bash
cd backend
npm install
cp .env.example .env    # vyplnit POSTGRES_PASSWORD, GITHUB_TOKEN
docker compose up -d --build
```
