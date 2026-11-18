# Nastavení GitHub repa — co zbývá udělat manuálně

Session, ze které tohle vzniklo, pracuje přes Anthropic proxy, která **cíleně
blokuje** dva typy zápisu na GitHub, bez ohledu na to, jaká práva má
připojený GitHub App/token v samotné organizaci:

- zápis `git tag` / `refs/tags/*` (přes `git push` i přes `POST
  /git/refs` REST API) — chyba: `403` / "Write access to this GitHub API
  path is not permitted through this proxy."
- zápis repo-level nastavení (`PATCH /repos/{owner}/{repo}`,
  branch-protection endpointy apod.) — stejná chyba, jen jiný text:
  "Repository settings writes are not permitted through this proxy."

Push commitů a branchí (`git push origin main`) naopak **funguje normálně** —
proto je `main` už na GitHubu. Tohle nejsou chybějící oprávnění (repo hlásí
`admin: true`), je to záměrné omezení toho, co agent v této session může na
GitHubu měnit — podrobnosti:
<https://docs.anthropic.com/en/docs/claude-code/github-actions>.

Proto je potřeba tyhle kroky udělat buď přímo v GitHub UI, nebo z vlastního
terminálu (s `gh auth login` nebo osobním tokenem, mimo tuhle proxy).

## Verze: první release vyšel jako v1.0.0, ne v0.1.1

Při prvním běhu `.github/workflows/release.yml` vytvořil `semantic-release`
automaticky tag a release **`v1.0.0`** — to je jeho pevné chování pro "žádný
předchozí release" (bez ohledu na typ commitu). Tag `v0.1.1`, se kterým se
původně počítalo, se nestihl založit dřív (zápis tagů je přes tuhle proxy
blokovaný stejně jako repo-nastavení níž), takže se do GitHubu dostalo
rovnou `v1.0.0`. Jan se rozhodl tenhle výsledek přijmout jako skutečnou
první verzi — `package.json`, `CHANGELOG.md` i GitHub Release na `v1.0.0`
zůstávají tak, jak je `semantic-release` vytvořil. Od teď bude každá další
verze počítaná normálně od `v1.0.0` podle Conventional Commits u commitů na
`main` — žádný další manuální zásah kolem verzování není potřeba.

## 1. Zapnout Discussions

Repo má Wiki, Issues a Projects zapnuté už z výchozího nastavení GitHubu.
Discussions ne — zapnutí:

```bash
gh api repos/jeKral/TightPrint.md -X PATCH -f has_discussions=true
```

nebo *Settings → General → Features → zaškrtnout Discussions*.

## 2. Branch protection na `main`

Vynutit, aby šlo na `main` pushovat jen přes CI check (commitlint +
typecheck + smoke + build) a zakázat force-push/mazání branche:

```bash
gh api repos/jeKral/TightPrint.md/branches/main/protection -X PUT --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["release"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

nebo *Settings → Branches → Add branch protection rule → `main`*, zaškrtnout
"Require status checks to pass" (vybrat `release`) a "Do not allow force
pushes"/"Do not allow deletions".

## 3. (Volitelné) Nastavit `GH_TOKEN` pro bug-report backend

Jakmile vznikne backend pro „Nahlaš chybu" (viz
`docs/TELEMETRY-AND-REPORTING.md`), bude potřeba jemně omezený GitHub
personal access token (fine-grained, jen `Issues: write` na tomhle repu),
uložený jako secret na backendu (ne v repu, ne v pluginu) — zařídí se až
při nasazení backendu.
