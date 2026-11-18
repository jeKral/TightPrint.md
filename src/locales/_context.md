# Kontext pro překladatele

Jeden klíč = jedna textová jednotka v UI pluginu. Pro nový jazyk zkopíruj `en.json` jako
`<kód_jazyka>.json` (např. `de.json`, `pl.json`, `fr.json` — kód podle BCP‑47/ISO 639‑1) a přelož
hodnoty; strukturu a klíče neměň. `{slovo}` v textu je placeholder, který program doplní — nech ho
na stejném místě gramaticky, kam patří ve tvém jazyce.

| Klíč | Kde se objeví / poznámka |
|---|---|
| `menu.*` | Položky hlavního menu pluginu v MarkEditu. Krátké, jako název příkazu. |
| `density.*` | Tři úrovně hustoty tisku (Hustota submenu). |
| `dialog.fontUnavailable.*` | Upozornění, když se nepodaří načíst zvolené písmo. `{family}` = jméno fontu, `{fallback}` = náhradní font. |
| `dialog.notFit.*` | Když "vejít se na N stran" nevyjde ani na maximum. `{wanted}` = cílový počet stran, `{actual}` = skutečný počet. |
| `dialog.askFitPages.*` | Dialog pro ruční zadání cílového počtu stran. |
| `menu.fitTo.pages` | **Množné číslo** — objekt s klíči podle CLDR kategorií (`one`, `few`, `many`, `other`), resolvuje se přes `Intl.PluralRules(locale).select(n)`. Angličtina potřebuje jen `one`/`other`; čeština `one`/`few`/`many`/`other`. Použij jen kategorie, které tvůj jazyk skutečně rozlišuje (viz [CLDR Language Plural Rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)), zbytek směřuj na `other`. |
| `menu.language.auto` | Volba "podle systému" v menu výběru jazyka. |

Nový jazyk se do menu "Jazyk" přidá automaticky, jakmile přibude soubor v `src/locales/` a zapíše
se do registru v `src/i18n.ts` (`LOCALES`).
