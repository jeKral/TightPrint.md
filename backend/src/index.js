import express from 'express';
import rateLimit from 'express-rate-limit';
import { migrate, insertStat } from './db.js';

const PORT = process.env.PORT ?? 8787;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO ?? 'jeKral/TightPrint.md';
const MAX_DESCRIPTION = 4000;
const MAX_FIELD = 200;

function clampString(value, max) {
  if (typeof value !== 'string') {
    return undefined;
  }
  return value.slice(0, max);
}

function clampNumber(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

const app = express();
app.use(express.json({ limit: '32kb' }));

// Endpoint je veřejně volatelný (znají ho všichni, kdo mají nainstalovanou
// Zkratku), takže i při rozumném provozu musí mít tvrdý rate-limit.
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use(limiter);

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.post('/stat', async (req, res) => {
  const body = req.body ?? {};
  if (body.kind !== 'stat') {
    return res.status(400).json({ ok: false, error: 'kind musí být "stat"' });
  }
  const row = {
    event: clampString(body.event, 32),
    anonId: clampString(body.anonId, 64),
    pluginVersion: clampString(body.pluginVersion, 32),
    markeditVersion: clampString(body.markeditVersion, 32),
    osVersion: clampString(body.osVersion, 32),
    pages: body.pages !== undefined ? clampNumber(body.pages, 0, 100000) : undefined,
    density: body.density !== undefined ? clampNumber(body.density, 0, 1) : undefined,
    mode: clampString(body.mode, 16),
  };
  if (!row.event || !['install', 'export'].includes(row.event)) {
    return res.status(400).json({ ok: false, error: 'neznámý event' });
  }
  try {
    await insertStat(row);
    res.json({ ok: true });
  } catch (error) {
    console.error('insertStat failed', error);
    res.status(500).json({ ok: false });
  }
});

app.post('/report', async (req, res) => {
  const body = req.body ?? {};
  if (body.kind !== 'report') {
    return res.status(400).json({ ok: false, error: 'kind musí být "report"' });
  }
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN není nastavený, hlášení nelze odeslat.');
    return res.status(503).json({ ok: false, error: 'backend není nakonfigurovaný' });
  }
  const description = clampString(body.description, MAX_DESCRIPTION) || '_(bez popisu)_';
  const pluginVersion = clampString(body.pluginVersion, MAX_FIELD) ?? 'neznámá';
  const markeditVersion = clampString(body.markeditVersion, MAX_FIELD) ?? 'neznámá';
  const osVersion = clampString(body.osVersion, MAX_FIELD) ?? 'neznámá';

  const title = `[auto-report] ${description.slice(0, 80).replace(/\n/g, ' ')}`;
  const issueBody = [
    description,
    '',
    '---',
    `- Verze pluginu: ${pluginVersion}`,
    `- Verze MarkEditu: ${markeditVersion}`,
    `- macOS: ${osVersion}`,
    '',
    '_Odesláno automaticky z menu "Nahlaš chybu" v TightPrint.md._',
  ].join('\n');

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'tightprint-backend',
      },
      body: JSON.stringify({ title, body: issueBody, labels: ['auto-report'] }),
    });
    if (!response.ok) {
      console.error('GitHub issues API', response.status, await response.text());
      return res.status(502).json({ ok: false });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('reportBug failed', error);
    res.status(502).json({ ok: false });
  }
});

migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`tightprint-backend listening on :${PORT}`));
  })
  .catch((error) => {
    console.error('DB migrace selhala', error);
    process.exit(1);
  });
