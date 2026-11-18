# Soukromí a telemetrie — TightPrint.md

> Stav: implementováno v kódu pluginu (`src/telemetry.ts`, `src/config.ts`, `src/main.ts`).
> Backend, který data skutečně přijímá (`backend/`), ještě čeká na nasazení na roztisk-srvr —
> do té doby `MarkEdit.runService` jen tiše selže (nic se neodešle, plugin nic nenahlásí
> uživateli). Viz `docs/TELEMETRY-AND-REPORTING.md` a `docs/DECISIONS.md`.

## Co plugin sám o sobě dělá

MarkEdit extension API nemá žádné síťové volání — plugin sám o sobě nikam nic neposílá. Jediný
způsob, jak by mohl něco odeslat, je přes jednorázově nainstalovanou macOS Zkratku (Services menu),
která teprve dělá HTTP požadavek (viz `docs/SHORTCUT-SETUP.md`). Bez této instalace plugin
nekomunikuje se světem vůbec.

## Výchozí stav: VYPNUTO (opt-in)

Při prvním spuštění se zobrazí jednorázový dialog s otázkou, jestli chceš anonymní statistiky
zapnout. Pokud ho zavřeš nebo zvolíš "Nechat vypnuto", nic se neposílá, dokud to sám nezapneš
v Nastavení tisku. Hlášení chyby je nezávislé na tomto přepínači — vždy jde jen o jednorázovou
akci, kterou sám spustíš tlačítkem "Nahlaš chybu…".

## Co se po instalaci Zkratky posílá

- **Anonymní statistiky** (vypínatelné v Nastavení tisku, výchozí VYPNUTO): verze
  pluginu/MarkEditu/macOS, zvolená hustota tisku, počet stran výsledného PDF, náhodné instalační
  ID (`anonId`, vygenerované lokálně, ne vázané na osobu). Nikdy obsah dokumentu, název souboru
  ani cestu k souboru.
- **Hlášení chyby** (jen když ho sám odešleš tlačítkem "Nahlaš chybu…"): tvůj popis + stejné
  systémové informace jako výše.

## Co se neposílá nikdy

Obsah markdownu, názvy a cesty souborů, cokoliv osobně identifikovatelné.

## Jak to vypnout

Menu **TightPrint.md → Nastavení tisku → Anonymní statistiky**. Vypnutí je okamžité a
nevyžaduje odinstalaci Zkratky.
