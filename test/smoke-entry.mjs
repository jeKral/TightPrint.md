import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import deflist from 'markdown-it-deflist';
import mark from 'markdown-it-mark';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import { transformCallouts } from '../src/callouts';
import { transformCodeBlocks } from '../src/codeblocks';
import { normalizeMarkdown } from '../src/preprocess';
import { transformTaskLists, transformDefLists, cleanupFootnotes } from '../src/transforms';
import { buildPdf } from '../src/pdf';
import { densityAt, fitToPages, PRESETS } from '../src/density';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMParser = dom.window.DOMParser;

const md = new MarkdownIt({
  html: true, linkify: true, typographer: true,
  highlight: (str, lang) => (lang && hljs.getLanguage(lang)) ? hljs.highlight(str, { language: lang, ignoreIllegals: true }).value : '',
}).use(footnote).use(taskLists).use(deflist).use(mark).use(sub).use(sup);

function toHtml(file) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const doc = new dom.window.DOMParser().parseFromString(md.render(normalizeMarkdown(body)), 'text/html');
  transformCallouts(doc); transformCodeBlocks(doc); transformTaskLists(doc); transformDefLists(doc); cleanupFootnotes(doc);
  return doc.body.innerHTML;
}

const out = (name, built) => {
  fs.writeFileSync(new URL(`./out/${name}.pdf`, import.meta.url), Buffer.from(built.data, 'base64'));
};
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true });

for (const file of ['./cz_long.md', './cz_tables.md', './fixture.md', './repro.md']) {
  const html = toHtml(file);
  const row = [];
  for (const p of PRESETS) {
    const built = await buildPdf(html, 'smoke', false, densityAt(p.t, { minMarginMm: 5, footer: true }), true);
    out(`${file.replace(/\W/g, '')}_${p.id}`, built);
    row.push(`${p.id}: ${built.pages}`);
  }
  console.log(file, '->', row.join(' | '));
}

// fit to N pages
const html = toHtml('./cz_long.md');
for (const n of [6, 5, 4, 3]) {
  const res = await fitToPages(n, async (t) => (await buildPdf(html, 'x', false, densityAt(t, { minMarginMm: 5, footer: true }), true)).pages);
  console.log(`fit ${n} stran ->`, res);
  const built = await buildPdf(html, 'x', false, densityAt(res.t, { minMarginMm: 5, footer: true }), true);
  out(`fit_${n}`, built);
}
