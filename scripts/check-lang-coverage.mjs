import fs from 'fs';
import path from 'path';

const i18nDir = path.resolve('frontend/src/i18n');
const enFilePath = path.join(i18nDir, 'en.ts');
const coreFilePath = path.join(i18nDir, 'core.ts');

const enContent = fs.readFileSync(enFilePath, 'utf8');
const enKeyMatches = [...enContent.matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
const enKeys = new Set(enKeyMatches);

const langFiles = fs.readdirSync(i18nDir).filter(f => f.endsWith('.ts') && !['index.ts', 'config.ts', 'types.ts', 'formatters.ts', 'core.ts'].includes(f));

console.log(`en.ts has ${enKeys.size} keys.`);

// Load core.ts translations mapping
const coreContent = fs.readFileSync(coreFilePath, 'utf8');

const stats = [];
for (const file of langFiles) {
  const langCode = file.replace('.ts', '');
  const content = fs.readFileSync(path.join(i18nDir, file), 'utf8');
  const directMatches = [...content.matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
  
  // Also check if core.ts has entries for this lang
  const coreRegex = new RegExp(`\\b${langCode}\\s*:\\s*\\{([^\\}]+)\\}`, 's');
  const coreMatch = coreContent.match(coreRegex);
  let coreKeyCount = 0;
  if (coreMatch) {
    const coreKeys = [...coreMatch[1].matchAll(/['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
    coreKeyCount = coreKeys.length;
  }
  
  const totalKeys = directMatches.length + coreKeyCount;
  const coverage = Math.round((totalKeys / enKeys.size) * 100);
  stats.push({ langCode, totalKeys, coverage, direct: directMatches.length, core: coreKeyCount });
}

stats.sort((a, b) => a.coverage - b.coverage);
console.log('Language Coverage Summary:');
console.table(stats);
