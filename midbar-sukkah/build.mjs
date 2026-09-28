// Writes the self-contained film: dist/midbar-sukkah.html
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inline } from './inline.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const out = inline(root);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'midbar-sukkah.html'), out);
console.log('wrote dist/midbar-sukkah.html', (out.length / 1024).toFixed(0) + ' KB');
