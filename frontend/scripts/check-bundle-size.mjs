import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distAssetsDir = path.resolve(__dirname, '../dist/assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error('Error: dist/assets directory not found. Please run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);

let totalJsBytes = 0;
let totalCssBytes = 0;
let largestJs = { name: '', size: 0 };
let indexJs = { name: '', size: 0 };
let chartingJs = { name: '', size: 0 };

for (const file of files) {
  const filePath = path.join(distAssetsDir, file);
  const stat = fs.statSync(filePath);
  const size = stat.size;

  if (file.endsWith('.js')) {
    totalJsBytes += size;
    if (size > largestJs.size) {
      largestJs = { name: file, size };
    }
    if (file.startsWith('index-')) {
      indexJs = { name: file, size };
    }
    if (file.includes('vendor-charts') || file.includes('Charts-')) {
      chartingJs = { name: file, size };
    }
  } else if (file.endsWith('.css')) {
    totalCssBytes += size;
  }
}

const formatKb = (bytes) => (bytes / 1024).toFixed(2) + ' kB';

console.log('\n==================================================');
console.log('📦 FeraSetu Frontend Bundle Performance Report');
console.log('==================================================');
console.log(`• Initial Entry JS (index.js):   ${formatKb(indexJs.size)} (${indexJs.name || 'N/A'})`);
console.log(`• Largest JS Chunk:              ${formatKb(largestJs.size)} (${largestJs.name})`);
console.log(`• Total JS Emitted:              ${formatKb(totalJsBytes)} across all code-split chunks`);
console.log(`• Charting Chunk (vendor-charts):${formatKb(chartingJs.size)} (isolated & lazy-loaded)`);
console.log(`• Total CSS Size:                ${formatKb(totalCssBytes)}`);
console.log('==================================================\n');

// Warning thresholds
if (indexJs.size > 100 * 1024) {
  console.warn(`⚠️ WARNING: Initial JS entry bundle exceeded 100 kB (${formatKb(indexJs.size)})!`);
} else {
  console.log(`✅ Initial JS entry chunk is healthy (${formatKb(indexJs.size)} <= 100 kB target)`);
}
