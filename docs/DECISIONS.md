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
- Rozhodnuto: backend pro hlášení chyb/telemetrii na roztisk-srvr nasadí Jan sám (balíček
  s instrukcemi připraví Claude); Claude na server přímý přístup nemá a nebude se o něj
  pokoušet (SSH tam je síťově dostupné, ale bez důvěryhodného klíče).

## 2026-11-18 — Menu UX: nastavení se po každé úpravě sama znovu otevírá
- Problém: nativní macOS menu (AppKit) se po kliknutí na libovolnou položku vždy celé zavře —
  to je vlastnost systému, `markedit-api` pro to nemá žádný "zůstat otevřené" příznak (ověřeno
  v `MarkEdit-api/index.d.ts`: `MenuItem`/`ContextMenuOptions` nic takového nenabízí). Nejde to
  tedy "opravit" v klasickém smyslu, jen obejít.
- Řešení: všechna nastavení (hustota, vejít se na stránky, okraj, velikost písma, rámeček
  tabulek, zápatí, písma, jazyk) se přestěhovala z vnořených podmenu hlavního menu Extensions
  do samostatného kontextového menu ("Nastavení tisku…", `Cmd+Option+,`). Každá volba v něm po
  uložení sama znovu zavolá `openSettingsMenu()` (helper `sticky()` v `src/main.ts`), takže se
  menu hned znovu otevře a lze upravovat další věc bez návratu přes File ▸ Extensions ▸
  TightPrint.md. "Tisk…" a "Uložit jako PDF…" zůstávají jako přímé akce v hlavním menu (nejsou
  to nastavení, která by se upravovala opakovaně).
- Nové nastavení: pevná velikost písma v pt (`fontSizeOverride`, výchozí `undefined` = auto
  podle hustoty) a síla rámečku tabulek v pt (`tableBorderWidth`, výchozí `0.5`) — obojí v
  `src/config.ts`/`src/density.ts`, promítá se do `prettyTable` layoutu v `src/pdf.ts`.

## 2026-11-18 — Push v0.1.1 a zjištěné omezení session
- `git push origin main` do `jeKral/TightPrint.md` funguje (poté, co uživatel povolil GitHub
  App/connector). **Zápis `git tag`/`refs/tags/*` je ale touto session cíleně blokovaný** —
  stejná chyba (403 "not permitted through this proxy") přes `git push` i přes
  `POST /git/refs` GitHub API, bez ohledu na to, že token na repu má `admin: true`. Stejně je
  blokovaný zápis repo-nastavení (`PATCH /repos/...`, branch protection) — "Repository settings
  writes are not permitted through this proxy." Jde o záměrné omezení platformy (odkazuje na
  `docs.anthropic.com/en/docs/claude-code/github-actions`), ne o chybějící oprávnění u GitHub
  App — proto se to neřešilo obcházením (raw HTTP apod.), ale zapsalo jako manuální krok pro
  Jana, viz `docs/GITHUB-SETUP.md`.
- Push v0.1.1 proto zatím **nemá tag** — commit `8412fa7` je na `main`, ale samotné `v0.1.1`
  musí založit Jan (`git tag` + `git push origin v0.1.1`, nebo přes GitHub UI Release). Bez
  tohoto kroku by `semantic-release` při prvním běhu skočil rovnou na `1.0.0` (jeho pevné
  chování pro "žádný předchozí release", bez ohledu na typ commitu).
- Při prvním běhu `.github/workflows/release.yml` spadl `commitlint` krok, protože fallback
  `HEAD~20` neexistuje na repu s jedním commitem — opraveno na `git rev-list --max-parents=0
  HEAD` (kořenový commit) a Node v workflow zvýšen na 22 (kvůli `jsdom`/`undici`). Oprava
  pushnuta s `[skip ci]`, aby mezitím nenaskočil nechtěný release.
