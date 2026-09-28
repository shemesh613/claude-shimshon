// Inlines styles.css and every <script src> into one self-contained HTML string.
// Missing module files are skipped, so work-in-progress builds still run.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function inline(root) {
  let html = readFileSync(join(root, 'index.html'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="styles\.css">/, () =>
    `<style>\n${readFileSync(join(root, 'styles.css'), 'utf8')}</style>`);
  return html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
    const p = join(root, src);
    if (!existsSync(p)) return `<!-- missing ${src} -->`;
    const code = readFileSync(p, 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script>/* ${src} */\n${code}\n</script>`;
  });
}
