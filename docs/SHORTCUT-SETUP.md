# Vytvoření macOS Zkratky "TightPrint Relay"

Tohle je jediný krok, který musí uživatel udělat ručně, aby mohl používat "Nahlaš chybu…"
a anonymní statistiky v TightPrint.md. Trvá to necelou minutu a dělá se jen jednou.

Proč je to potřeba: MarkEdit plugin neumí sám o sobě posílat síťové požadavky (žádné API pro
to nemá). Jediná cesta ven je `MarkEdit.runService(name, input)`, což spustí jmenovanou macOS
"Službu" (Services menu) — a tou službou je právě tahle Zkratka, nastavená jako "Quick Action".
macOS z bezpečnostních důvodů nedovolí zaregistrovat takovou službu automaticky bez souhlasu
uživatele, takže se nedá dodat hotová napevno — musí se vytvořit v appce Zkratky.

**Název musí být přesně `TightPrint Relay`** — plugin tenhle název hledá natvrdo
(konstanta `RELAY_SERVICE` v `src/telemetry.ts`). Jiný název = Zkratka se nikdy nespustí.

## Postup

1. Otevři appku **Zkratky** (Shortcuts.app) na Macu.
2. Vlevo nahoře klikni na **+** → **Nová zkratka**.
3. Klikni na název "Zkratka" nahoře a přejmenuj přesně na **`TightPrint Relay`**.
4. Vpravo nahoře klikni na ikonu (i) / nastavení zkratky (ikona ⓘ) a zapni:
   - **Použít jako Quick Action** → zapnuto
   - V sekci "Quick Action" zapni **Zobrazit v nabídce Služby** (Services menu)
   - Jako vstup pro Quick Action vyber **Text** (přijímá text ze Services menu)
5. Zpátky v editoru zkratky přidej tyto kroky (v tomto pořadí), hledej je v pravém panelu
   podle názvu akce:
   1. **Get Contents of URL**
      - URL: `https://tightprint-relay.roztisk.cz` nahraď skutečnou veřejnou adresou
        backendu (viz `backend/README.md` krok 4) — endpoint se liší podle typu zprávy,
        takže sem zatím dej jen placeholder, uprav v kroku 7 níže.
      - Metoda: **POST**
      - Záhlaví (Headers): `Content-Type: application/json`
      - Tělo požadavku (Request Body): **Text** → vlož proměnnou **Zkratkový vstup**
        (Shortcut Input) jako celé tělo — plugin už posílá hotový JSON string, Zkratka ho
        jen přeposílá beze změny.
6. Ulož (Cmd+S nebo jen zavři okno editoru).
7. **Jak Zkratka pozná, jestli jde o `/report` nebo `/stat`:** plugin posílá JSON s polem
   `"kind": "report"` nebo `"kind": "stat"`. Nejjednodušší řešení je mít na backendu jediný
   endpoint, který si `kind` přečte sám a rozhodí dál (to backend v `backend/src/index.js`
   dělá jako dva routy `/report` a `/stat` — pokud chceš jen jednu URL v Zkratce, je
   nejjednodušší před krok "Get Contents of URL" vložit **"Get Value for Key" → `kind`** z
   Zkratkového vstupu a podle výsledku (`If` větvení) zavolat buď
   `https://.../report`, nebo `https://.../stat`. Dvě "Get Contents of URL" akce ve dvou
   větvích `If`/`Otherwise`.

## Ověření, že to funguje

1. V Finderu klikni pravým tlačítkem na jakýkoliv text (nebo v MarkEditu zavolej akci
   "Nahlaš chybu…" z menu TightPrint.md).
2. Pokud se v Services menu (nebo přímo z pluginu) nic nestane a plugin ukáže chybu
   "Nepodařilo se odeslat" — zkontroluj:
   - že se Zkratka jmenuje přesně `TightPrint Relay` (velikost písmen i mezery)
   - že má zapnuté "Použít jako Quick Action" a "Zobrazit v nabídce Služby"
   - že backend na roztisk-srvr běží (`curl https://.../healthz`)
3. Funkční průchod: zapni v TightPrint.md "Anonymní statistiky", udělej export do PDF,
   během pár sekund by měl v databázi backendu přibyt řádek (viz `backend/README.md`).

## Poznámka pro budoucí vývojáře

Soubor `.shortcut` (binární export Zkratky) nejde vytvořit mimo macOS, a tenhle projekt se
vyvíjí v Linuxovém kontejneru — proto je tu manuální návod, ne hotový soubor ke stažení. Pokud
někdy vznikne macOS build prostředí v CI, stálo by za to vyexportovat `.shortcut` a přidat ho
jako release asset, aby tenhle krok šel zkrátit na "stáhni a dvakrát klikni".
