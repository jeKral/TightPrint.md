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
proto je `main` už na GitHubu, ale tag `v0.1.1` a repo-nastavení níž ne.
Tohle nejsou chybějící oprávnění (repo hlásí `admin: true`), je to
záměrné omezení toho, co agent v této session může na GitHubu měnit —
podrobnosti: <https://docs.anthropic.com/en/docs/claude-code/github-actions>.

Proto je potřeba tyhle kroky udělat buď přímo v GitHub UI, nebo z vlastního
terminálu (s `gh auth login` nebo osobním tokenem, mimo tuhle proxy).

## 1. Založit tag `v0.1.1` (nejdůležitější — bez něj semantic-release při
   prvním běhu skočí rovnou na `1.0.0`, ne na `0.1.1`)

**Buď z terminálu** (po `git pull` aktuálního `main`):

```bash
git fetch origin
git tag -a v0.1.1 origin/main -m "v0.1.1 — initial release"
git push origin v0.1.1
```

**Nebo v GitHub UI:** *Releases → Draft a new release → v poli "Choose a
tag" napiš `v0.1.1` a potvrď "Create new tag: v0.1.1 on publish" → Target:
`main` → Publish release.*

Od tohoto okamžiku bude `semantic-release` (viz `.github/workflows/release.yml`)
počítat každou další verzi od `v0.1.1` podle Conventional Commits u
commitů na `main` — žádný další manuální zásah už nebude potřeba.

## 2. Zapnout Discussions

Repo má Wiki, Issues a Projects zapnuté už z výchozího nastavení GitHubu.
Discussions ne — zapnutí:

```bash
gh api repos/jeKral/TightPrint.md -X PATCH -f has_discussions=true
```

nebo *Settings → General → Features → zaškrtnout Discussions*.

## 3. Branch protection na `main`

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

## 4. (Volitelné) Nastavit `GH_TOKEN` pro bug-report backend

Jakmile vznikne backend pro „Nahlaš chybu" (viz
`docs/TELEMETRY-AND-REPORTING.md`), bude potřeba jemně omezený GitHub
personal access token (fine-grained, jen `Issues: write` na tomhle repu),
uložený jako secret na backendu (ne v repu, ne v pluginu) — zařídí se až
při nasazení backendu.
