# Přispívání do TightPrint.md

## Jednorázové nastavení

```bash
npm install   # mj. aktivuje git hook pro commit zprávy (viz docs/VERSIONING.md)
```

## Commit zprávy

Povinně [Conventional Commits](https://www.conventionalcommits.org/) — na nich stojí automatické
sémantické verzování. Podrobnosti a vynucení: `docs/VERSIONING.md`.

## Před pushem

```bash
npm run typecheck
npm run smoke        # test/out/*.pdf
npm run build
```

## Lokalizace

UI texty pluginu jsou v `src/locales/*.json`, ne natvrdo v kódu — viz `docs/I18N.md`.
Nový jazyk = nový soubor podle `src/locales/en.json`, PR.
