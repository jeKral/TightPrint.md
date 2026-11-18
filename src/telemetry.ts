import { MarkEdit } from 'markedit-api';
import { getConfig, saveConfig } from './config';

/** Název macOS Služby (Shortcut "Quick Action"), kterou si uživatel jednou nainstaluje. */
const RELAY_SERVICE = 'TightPrint Relay';

/** Vkládá vite při buildu (define v vite.config.mts) přímo z package.json. */
declare const __PLUGIN_VERSION__: string;
const PLUGIN_VERSION = __PLUGIN_VERSION__;

function randomId(): string {
  // Jednoduché, dostatečně náhodné UUID-like ID; nejde o kryptografický klíč.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function ensureAnonId(): Promise<string> {
  const existing = getConfig().anonId;
  if (existing) {
    return existing;
  }
  const id = randomId();
  await saveConfig({ anonId: id });
  return id;
}

/** Vše, co se kamkoliv posílá, viz docs/PRIVACY.md — žádný obsah dokumentu, žádná cesta, žádné jméno. */
async function relay(payload: Record<string, unknown>): Promise<boolean> {
  try {
    if (typeof MarkEdit.runService !== 'function') {
      return false;
    }
    return await MarkEdit.runService(RELAY_SERVICE, JSON.stringify(payload));
  } catch {
    // Shortcut ještě nenainstalovaná, nebo síť nedostupná — nikdy nepadá do uživatele.
    return false;
  }
}

/** Anonymizovaná statistika; no-op, pokud uživatel telemetrii nezapnul. */
export async function sendStat(event: 'install' | 'export', extra: Record<string, unknown> = {}): Promise<void> {
  if (!getConfig().telemetryEnabled) {
    return;
  }
  const anonId = await ensureAnonId();
  const runtime = MarkEdit.runtimeInfo ? MarkEdit.runtimeInfo() : undefined;
  await relay({
    kind: 'stat',
    event,
    anonId,
    pluginVersion: PLUGIN_VERSION,
    markeditVersion: runtime?.appVersion,
    osVersion: runtime?.osVersion,
    ...extra,
  });
}

/** Nahlásí chybu jako GitHub issue (přes backend, bez nutnosti se kamkoliv přihlásit). */
export async function reportBug(description: string): Promise<boolean> {
  const runtime = MarkEdit.runtimeInfo ? MarkEdit.runtimeInfo() : undefined;
  return relay({
    kind: 'report',
    description,
    pluginVersion: PLUGIN_VERSION,
    markeditVersion: runtime?.appVersion,
    osVersion: runtime?.osVersion,
  });
}
