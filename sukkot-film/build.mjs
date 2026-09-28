// Inlines the scene and music scripts into one self-contained HTML file: dist/sukkot-film.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const out = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const code = readFileSync(join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>/* ${src} */\n${code}\n</script>`;
});
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'sukkot-film.html'), out);
console.log('wrote dist/sukkot-film.html', (out.length / 1024).toFixed(0) + ' KB');
