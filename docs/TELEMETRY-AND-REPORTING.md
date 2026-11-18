# Hlášení chyb a anonymizované statistiky — architektura

## Zjištění: plugin nemá síť

Ověřeno ze zdroje `MarkEdit-api` (https://github.com/MarkEdit-app/MarkEdit-api, index.d.ts) i z
oficiální dokumentace MarkEditu — plugin API nemá žádné `fetch`/HTTP/WebSocket volání ani
background task. Jediná cesta ven ze sandboxu je:

```ts
runService(name: string, input?: string): Promise<boolean>;
```

Spustí pojmenovanou **macOS systémovou službu** (Services menu) s textovým vstupem. To je
standardní, dobře zdokumentovaný macOS mechanismus — a dá se na něj napojit [Zkratka
(Shortcut)](https://support.apple.com/guide/shortcuts-mac/apd163eb9f95/mac) nastavená jako
"Quick Action", která se tím pádem objeví v Services menu a dovede udělat `Get Contents of URL`
(plnohodnotný HTTP request včetně POST, hlaviček a JSON těla).

## Zvolená architektura: relay přes Zkratku

```
MarkEdit plugin                 macOS Shortcut             backend (roztisk-srvr)
┌──────────────┐  runService    ┌────────────────┐  POST   ┌─────────────────────┐
│ "Nahlaš chybu"│ ─────────────▶│ "TightPrint     │────────▶│ /report  → GitHub   │
│  nebo tichá   │  (text JSON)  │  Relay" (Quick  │ HTTPS   │           Issues API │
│  telemetrie   │               │  Action)        │         │ /stat    → DB        │
└──────────────┘               └────────────────┘         │           → Grafana   │
                                                             └─────────────────────┘
```

- **Plugin** sestaví JSON payload a zavolá `MarkEdit.runService('TightPrint Relay', JSON.stringify(payload))`.
- **Shortcut** (`shortcuts/tightprint-relay.shortcut`, dodáváme hotový) přečte vstupní text,
  udělá `Get Contents of URL` POST na `https://tightprint.roztisk.cz/…` (nebo jiná subdoména na
  roztisk-srvr) a vrátí true/false podle HTTP statusu.
- **Backend** (malá služba na roztisk-srvr) jediný drží GitHub token a vytváří issue /
  zapisuje řádek do statistik — token se nikdy nedostane do klienta, i kdyby byl dist obfuskovaný.

### Instalace Shortcutu — jednorázová, ne skrytá

Nedá se zaregistrovat služba do Services menu bez potvrzení uživatele (macOS to z bezpečnostních
důvodů nedovolí udělat potichu) — ani kdyby to chtěl plugin udělat sám. Řešení: `install-script`
otevře `.shortcut` soubor (`open shortcuts/tightprint-relay.shortcut`), čímž spustí standardní
dialog Zkratek "Přidat zkratku", a README/první spuštění pluginu o tom jednou informuje. Po téhle
jediné instalaci už žádná další interakce není potřeba — `runService` dál běží tiše na pozadí.
To je smysl slova "nenápadné", jak ho stavím: **po jednorázovém a viditelném souhlasu** beze
rušení, ne bez vědomí uživatele.

**Hlášení chyb bez registrace na GitHub se tímhle řeší přesně podle zadání** — uživatel nikdy
neuvidí GitHub, token drží jen náš backend.

### Co backend (roztisk-srvr) potřebuje

- `POST /report` — body `{ type: 'bug', description, systemInfo: {...anonymizováno...} }` →
  vytvoří GitHub issue přes `gh api repos/jeKral/TightPrint.md/issues` s naším tokenem (scope jen
  `repo:issues` na tenhle jeden repozitář, ne širší).
- `POST /stat` — body `{ event: 'install'|'export'|'heartbeat', anonId, version, density, pages, platform }`
  → zápis do DB (Postgres/SQLite), `anonId` je náhodné UUID vygenerované a uložené lokálně
  pluginem při první instalaci (`tightprint.json`), ne cokoliv odvoditelné od uživatele.
- Grafana nad stejnou DB — dashboard: instalace v čase, rozložení hustot, verzí, platforem.
- Rate-limit a jednoduchá validace vstupu (anti-spam), protože endpoint je veřejně volatelný
  (kdokoliv zná URL ze Shortcutu/dist).

### Co se bude a nebude posílat (telemetrie)

**Ano** (anonymizovaně, žádné ID vázané na osobu ani soubor):
- verze pluginu, verze MarkEditu, macOS verze/architektura
- zvolená hustota/fit-to-pages, počet výsledných stran
- že proběhla instalace / že proběhl export (ne obsah dokumentu, nikdy)

**Ne, nikdy:**
- obsah markdownu, název souboru, cesta k souboru
- cokoliv identifikovatelné (jméno, e-mail, IP se v backendu needuchovává za hranici logu potřebného k rate-limitu)

### Proč je potřeba disclosure, i když to má být "nenápadné"

ČR/EU → GDPR: i anonymizovaná telemetrie, kterou plugin posílá automaticky, musí být uživateli
sdělená a musí jít vypnout. Plně skrytý, neohlášený sběr dat bych nestavěl ani technicky
proveditelný (viz výše — síť nejde vůbec bez jednorázového instalačního kroku, který *je* tím
oznámením). Návrh: v menu "TightPrint.md" položka **Anonymní statistiky: zapnuto/vypnuto**
(výchozí stav k doladění — doporučuju zapnuto s jasnou zmínkou v README a při prvním spuštění,
ne skryté v nastavení), plus `docs/PRIVACY.md` popisující přesně co se posílá.

## Co zbývá rozhodnout / udělat

1. **Přístup k roztisk-srvr** pro nasazení backendu — viz otázka v chatu. Bez něj umím připravit
   kód backendu i Shortcut, ale nic nenasadím.
2. Doménu/subdoménu pro endpoint (např. `tightprint.roztisk.cz`) a TLS.
3. GitHub token pro backend — vytvořit fine-grained PAT jen pro `jeKral/TightPrint.md`, scope
   `Issues: write`, nic víc.
4. Schválit výchozí stav telemetrie (zapnuto/vypnuto) a přesné znění oznámení.
