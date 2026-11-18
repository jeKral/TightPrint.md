import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/** Vytvoří tabulku, pokud ještě neexistuje. Idempotentní, volá se při startu. */
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stats (
      id BIGSERIAL PRIMARY KEY,
      received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      event TEXT NOT NULL,
      anon_id TEXT,
      plugin_version TEXT,
      markedit_version TEXT,
      os_version TEXT,
      pages INTEGER,
      density REAL,
      mode TEXT
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS stats_received_at_idx ON stats (received_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS stats_event_idx ON stats (event);`);
}

export async function insertStat(row) {
  await pool.query(
    `INSERT INTO stats (event, anon_id, plugin_version, markedit_version, os_version, pages, density, mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      row.event ?? null,
      row.anonId ?? null,
      row.pluginVersion ?? null,
      row.markeditVersion ?? null,
      row.osVersion ?? null,
      row.pages ?? null,
      row.density ?? null,
      row.mode ?? null,
    ],
  );
}
