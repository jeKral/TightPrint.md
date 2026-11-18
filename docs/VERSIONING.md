# Sémantické verzování

TightPrint.md dodržuje [Semantic Versioning 2.0.0](https://semver.org/) bez výjimek:
`MAJOR.MINOR.PATCH`, kde MAJOR = nekompatibilní změna, MINOR = nová funkce zpětně
kompatibilní, PATCH = oprava zpětně kompatibilní.

## Jak se verze posouvá

Verze se **nikdy neposouvá ručně**. Řídí to [semantic-release](https://semantic-release.gitbook.io/)
podle textu commitů ([Conventional Commits](https://www.conventionalcommits.org/)) při každém pushi
do `main` (`.github/workflows/release.yml`, konfigurace `.releaserc.json`):

| Typ commitu | Dopad na verzi |
|---|---|
| `fix: …`, `perf: …` | PATCH |
| `feat: …` | MINOR |
| `feat!: …` nebo tělo obsahuje `BREAKING CHANGE: …` | MAJOR |
| `docs:`, `style:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:` | žádná nová verze (samy o sobě) |

Formát zprávy: `type(scope)?: subject`, např. `fix(pdf): oprava mezer kolem <hr>`.
Scope je volitelný. Zpráva musí mít smysl i bez diffu — čte se v CHANGELOGu a v GitHub Release.

## Vynucení

1. **Lokálně** — `commit-msg` git hook (`.githooks/commit-msg`) odmítne commit, který neodpovídá
   Conventional Commits. Aktivuje se `git config core.hooksPath .githooks` (udělá to automaticky
   `npm install` přes `prepare` skript).
2. **V CI** — `release.yml` před buildem spustí `commitlint --from <poslední tag> --to HEAD` přes
   všechny commity od posledního vydání; pokud cokoliv neprojde, release se nevytvoří.
3. **Release** — pokud commity od posledního tagu neobsahují žádný `feat`/`fix`/breaking change
   (jen `chore`/`docs`/…), `semantic-release` **nevydá nic** — to je správné chování, ne chyba.

## Co to znamená prakticky

- Každý push do `main` s aspoň jedním `feat`/`fix`/breaking commitem → automaticky nová verze,
  nový git tag `vX.Y.Z`, zápis do `CHANGELOG.md`, GitHub Release.
- Verze v `package.json` se aktualizuje automaticky (`@semantic-release/git`), neupravuj ji ručně.
- Admin na GitHubu by měl zapnout branch protection na `main`: povinný status check
  `Release / release` (nebo samostatný lint job) a zákaz force-push — toto vyžaduje práva, která
  teď nemám (viz `docs/DECISIONS.md`), doplní se, jakmile bude push na repo povolený.

## Výchozí bod

Repozitář startuje ručně otagovanou verzí **v0.1.1** (první push). Od ní dál už žádný ruční tag —
vše přes `semantic-release` podle pravidel výše.
