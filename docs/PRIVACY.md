# Soukromí a telemetrie — TightPrint.md

> Stav: návrh, telemetrie ještě není nasazená (viz `docs/TELEMETRY-AND-REPORTING.md` a
> `docs/DECISIONS.md`). Tento soubor popisuje, co se bude dít, až bude backend hotový —
> aktualizuje se v okamžiku nasazení, ne dřív.

## Co plugin sám o sobě dělá

MarkEdit extension API nemá žádné síťové volání — plugin sám o sobě nikam nic neposílá. Jediný
způsob, jak by mohl něco odeslat, je přes jednorázově nainstalovanou macOS Zkratku (Services menu),
která teprve dělá HTTP požadavek. Bez této instalace plugin nekomunikuje se světem vůbec.

## Co se po instalaci Zkratky bude (plánovaně) posílat

- **Anonymní statistiky** (vypínatelné v menu): verze pluginu/MarkEditu/macOS, zvolená hustota
  tisku, počet stran výsledného PDF, náhodné instalační ID (ne vázané na osobu). Nikdy obsah
  dokumentu, název souboru ani cestu k souboru.
- **Hlášení chyby** (jen když ho sám odešleš tlačítkem "Nahlaš chybu"): tvůj popis + stejné
  systémové informace jako výše.

## Co se neposílá nikdy

Obsah markdownu, názvy a cesty souborů, cokoliv osobně identifikovatelné.

## Jak to vypnout

Menu **TightPrint.md → Anonymní statistiky**. Vypnutí je okamžité a nevyžaduje odinstalaci Zkratky.
