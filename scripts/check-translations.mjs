import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('frontend/src');
const enFilePath = path.resolve('frontend/src/i18n/en.ts');

// Extract all keys from en.ts
const enContent = fs.readFileSync(enFilePath, 'utf8');
const enKeyMatches = [...enContent.matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
const enKeys = new Set(enKeyMatches);
console.log(`Total keys defined in en.ts: ${enKeys.size}`);

// Scan all ts/tsx files for translate('key') or translate("key")
const calledKeys = new Set();
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        scanDir(fullPath);
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = [...content.matchAll(/translate\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const k of matches) {
        calledKeys.add(k);
      }
    }
  }
}
scanDir(srcDir);
console.log(`Total unique translate() keys called in codebase: ${calledKeys.size}`);

const missingInEn = [];
for (const k of calledKeys) {
  if (!enKeys.has(k)) {
    missingInEn.push(k);
  }
}
console.log(`Keys called with translate() but MISSING in en.ts: ${missingInEn.length}`);
console.log(missingInEn);
