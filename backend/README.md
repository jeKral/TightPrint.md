# TightPrint.md backend (relay)

Malý backend pro dvě věci:

1. **`POST /report`** — vezme popis chyby z pluginu a vytvoří GitHub Issue v
   `jeKral/TightPrint.md` (přes fine-grained PAT se scope `Issues: write`).
2. **`POST /stat`** — vezme anonymizovanou statistiku (verze, hustota, počet
   stran) a uloží ji do Postgresu, odkud ji čte Grafana.

Plugin sám nemá síť — volá to přes `MarkEdit.runService`, což spustí
lokálně nainstalovanou macOS Zkratku ("TightPrint Relay"), která teprve
zavolá tento backend. Postup instalace té Zkratky je v
`../docs/SHORTCUT-SETUP.md`.

## Nasazení na roztisk-srvr

1. `cp .env.example .env` a vyplň `POSTGRES_PASSWORD` a `GITHUB_TOKEN`
   (fine-grained PAT, **jen** scope `Issues: write` na repo
   `jeKral/TightPrint.md` — nikdy classic token s plným přístupem).
2. `docker compose up -d --build`
3. Ověř `curl http://127.0.0.1:8787/healthz` → `{"ok":true}`.
4. Napoj existující reverzní proxy (Caddy/Nginx/Traefik) na `127.0.0.1:8787`
   pod veřejnou subdomenou s TLS, např. `https://tightprint-relay.roztisk.cz`.
   Tenhle compose sám TLS ani veřejný port neřeší — poslouchá jen na
   localhostu.
5. V macOS Zkratce (viz `../docs/SHORTCUT-SETUP.md`) nastav URL základnu na
   tu veřejnou adresu z kroku 4.

## Grafana

Grafana se připojuje přímo na stejný Postgres (datasource "PostgreSQL",
host/port/DB/uživatel/heslo z `.env`). Pár užitečných panelů:

```sql
-- instalace a exporty za posledních 30 dní, po dnech
SELECT date_trunc('day', received_at) AS day, event, count(*) 
FROM stats
WHERE received_at > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1;

-- rozložení verzí pluginu mezi uživateli (podle posledního záznamu per anon_id)
SELECT plugin_version, count(DISTINCT anon_id)
FROM stats
GROUP BY 1
ORDER BY 2 DESC;

-- nejpoužívanější hustota tisku
SELECT width_bucket(density, 0, 1, 10) AS density_bucket, count(*)
FROM stats
WHERE event = 'export'
GROUP BY 1
ORDER BY 1;
```

Pokud už na roztisk-srvr běží jiná instance Postgresu/Grafany, místo
spouštění `db` služby z `docker-compose.yml` stačí v `.env` nastavit
`DATABASE_URL` přímo na tu existující databázi a v compose souboru
zakomentovat/odebrat službu `db`.

## Bezpečnost / GDPR

- `/stat` a `/report` jsou veřejně volatelné (adresu znají všichni s
  nainstalovanou Zkratkou) — proto mají tvrdý rate-limit (30 req / 10 min /
  IP) a omezené délky vstupů. Zvaž přidat vlastní API klíč do URL/headeru,
  pokud se objeví zneužití.
- Do `/stat` nikdy nechodí obsah dokumentu, cesta k souboru ani jméno
  uživatele — jen verze, hustota, počet stran a náhodné `anonId` generované
  lokálně v pluginu (viz `src/telemetry.ts` a `../docs/PRIVACY.md`).
- `GITHUB_TOKEN` musí mít scope jen `Issues: write` na tenhle jeden repo —
  nikdy ne přístup k celé organizaci/účtu.
