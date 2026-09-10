import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('.evidence', { recursive: true });
writeFileSync('.evidence/README.md', '# Screenshot evidence\n\nCapture desktop and mobile viewports with the browser tooling.\n');
console.log('Screenshot evidence directory prepared at .evidence/');
