import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

rmSync('docs', { recursive: true, force: true });
mkdirSync('docs');
cpSync('dist', 'docs', { recursive: true });
writeFileSync('docs/.nojekyll', '');
writeFileSync('docs/CNAME', 'www.make.spectralreflectance.space\n');
