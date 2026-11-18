import MarkdownIt from 'markdown-it';
import fs from 'node:fs';
const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
const src = fs.readFileSync(new URL('./tables_variants.md', import.meta.url), 'utf8');
const parts = src.split(/^## /m).filter(Boolean);
for (const p of parts) {
  const html = md.render('## ' + p);
  console.log(p.split('\n')[0], '=> <table> found:', /<table>/.test(html), '| <tr> count:', (html.match(/<tr>/g)||[]).length);
}
