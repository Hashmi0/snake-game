import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('.evidence', { recursive: true });
writeFileSync('.evidence/performance.md', '# Performance\n\nAutomated frame-time measurement requires a running browser session. Use the E2E harness scenarios `long` at lengths 3, 100, and 350, warm up for five seconds, then record a 60-second browser trace. Physical-device testing remains unverified.\n');
console.log('Performance evidence template written to .evidence/performance.md');
