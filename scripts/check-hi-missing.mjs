import fs from 'fs';
import path from 'path';

const i18nDir = path.resolve('frontend/src/i18n');
const enContent = fs.readFileSync(path.join(i18nDir, 'en.ts'), 'utf8');
const hiContent = fs.readFileSync(path.join(i18nDir, 'hi.ts'), 'utf8');
const coreContent = fs.readFileSync(path.join(i18nDir, 'core.ts'), 'utf8');

const enKeys = [...enContent.matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
const hiKeys = new Set([...hiContent.matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]));

const coreHiMatch = coreContent.match(/\bhi\s*:\s*\{([^\}]+)\}/s);
if (coreHiMatch) {
  for (const k of [...coreHiMatch[1].matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1])) {
    hiKeys.add(k);
  }
}

const missingInHi = enKeys.filter(k => !hiKeys.has(k));
console.log(`Missing in hi.ts (${missingInHi.length}):`);
console.log(missingInHi);
