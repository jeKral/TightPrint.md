# Rozhodnutí projektu TightPrint.md

Evidence rozhodnutí, aby se k nim dalo kdykoliv vrátit. Nový záznam přidávej, existující neuprav zpětně
(oprav rozhodnutí = nový záznam, který to staré supersedes).

## 2026-11-18 — Název a vize
- Repo/plugin: **TightPrint.md**. Jméno úmyslně neobsahuje "MarkEdit" — plán je podpořit i další
  aplikace pracující s .md, MarkEdit je první adaptér.
- Build soubor: `dist/tightprint.js`, config: `tightprint.json`, menu: "TightPrint.md".

## 2026-11-18 — Licence
- Zvoleno: **PolyForm Noncommercial License 1.0.0** jako základ (volné pro nekomerční použití) +
  vlastní dodatek (`LICENSE-COMMERCIAL.md`), který definuje, že komerční použití vyžaduje placenou
  licenci od jeKral.cz (měsíční předplatné nebo lifetime). Copyright: `© 2026 jeKral.cz`.
- Důvod volby: PolyForm je čitelný, právníky i vývojáři rozpoznaný text — menší tření než zcela vlastní
  formulace, a necháváme si definici "komerčního použití" plně v rukou přes doplněk.
- Zdrojový kód je od tohoto rozhodnutí **veřejný v plném rozsahu** (TypeScript), ne jen obfuskovaný
  build — ochrana komerčního modelu stojí na licenci, ne na schování kódu (obfuskovaný ~3,6MB bundle
  je stejně zpětně čitelný). Veřejně tedy: `src/`, `dist/tightprint.js` (nijak zvlášť neobfuskovaný,
  jen standardní `minify: true` z Vite), lokalizační soubory, dokumentace.

## 2026-11-18 — Síťová komunikace pluginu (hlášení chyb + telemetrie)
- Zjištěno a ověřeno ze zdroje `MarkEdit-api/index.d.ts` (viz `docs/TELEMETRY-AND-REPORTING.md`):
  MarkEdit plugin API **nemá žádné fetch/HTTP volání ani background task API**. Jediná cesta ven je
  `MarkEdit.runService(name, input)`, což spouští pojmenovanou macOS systémovou službu (Services menu)
  s textovým vstupem.
- Rozhodnuto: postavit **relay přes jednorázově instalovaný macOS Shortcut** (nastavený jako Quick
  Action / položka v Services menu), který přijme textový JSON payload a provede
  "Get Contents of URL" (POST) na náš backend na roztisk-srvr. Backend teprve volá GitHub Issues API
  (vlastním tokenem, nikdy ne v klientu) a/nebo zapisuje do statistik pro Grafanu.
- Toto je **jednorázová instalace, ne nic skrytého bez vědomí uživatele** — "nenápadné" chápu jako
  "po instalaci bez dalšího otravování", ne jako "bez souhlasu". Plně skrytou, neohlášenou telemetrii
  stavět nebudu (viz TELEMETRY-AND-REPORTING.md, důvody GDPR + důvěra).
- Čeká se na rozhodnutí: přístup k roztisk-srvr pro nasazení backendu (viz otázka v chatu).

## 2026-11-18 — Lokalizace
- `src/locales/cs.json` + `en.json`, plochý formát klíč→text (jednoduché pro komunitní PR),
  kontext pro překladatele v `src/locales/_context.md`. Množné číslo přes
  `Intl.PluralRules(locale).select(n)` (CLDR kategorie one/few/many/other) — žádná vlastní
  pluralizační logika, standardní JS API.
- `src/i18n.ts`: `t(key, vars?)`, `tn(key, n, vars?)`, `setLocale`, `LOCALES` registr. Chybějící
  klíč se v UI vypíše jako `⟦key⟧`, aby byl okamžitě vidět, ne tichý pád na angličtinu.
- `src/main.ts` kompletně přepojen na `t()`/`tn()`, žádný natvrdo zapsaný UI text nezůstal.
- Jazyk je nastavení v `tightprint.json` (`language`, undefined = auto podle `Intl` locale
  systému), přepínatelné v menu "Jazyk".

## 2026-11-18 — Síť pluginu, ověřeno
- Potvrzeno ze zdroje MarkEdit-api: žádné fetch/HTTP. Jediná cesta ven: `runService()` →
  macOS systémová služba. Navržena architektura "relay přes jednorázově instalovaný Shortcut"
  (`docs/TELEMETRY-AND-REPORTING.md`) — řeší jak hlášení chyb bez GitHub registrace, tak
  anonymizované statistiky, ale vyžaduje: (a) backend na roztisk-srvr, (b) GitHub token se
  scope jen na issues tohoto repa, (c) rozhodnutí o výchozím stavu telemetrie. Kód backendu a
  samotný `.shortcut` soubor zatím nejsou postavené — čekají na přístup k roztisk-srvr.
