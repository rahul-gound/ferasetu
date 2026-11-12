import fs from 'fs';
import path from 'path';

const enPath = path.resolve('frontend/src/i18n/en.ts');
let content = fs.readFileSync(enPath, 'utf8');

// Fix mojibake
content = content
  .replace(/â‚¹/g, '₹')
  .replace(/Â·/g, '·')
  .replace(/Â©/g, '©')
  .replace(/â€”/g, '—')
  .replace(/â€œ/g, '"')
  .replace(/â€/g, '"')
  .replace(/â€™/g, "'");

// Add missing keys right before closing "};"
const missingKeysBlock = `
  // Missing translation keys called across the app
  'addFirstProduct': 'Add First Product',
  'chooseTemplate': 'Choose Store Template',
  'personalizeStore': 'Personalize Store',
  'goLive': 'Go Live',
  'Please answer this question': 'Please answer this question',
  'profileUpdated': 'Profile updated successfully',
  'profileSaveFailed': 'Failed to save profile',

  // Sovereign Emotional Design System Keys
  'sovereign.commissionSaved': 'Commission Retained',
  'sovereign.directSettlement': 'Direct Bank Settlement Active',
  'sovereign.zeroCommission': '0% Platform Commission',
  'sovereign.feroGuardian': 'Protected by Fero Guardian',
  'sovereign.aiCopilot': 'Fera AI Sovereign Co-Pilot',
  'sovereign.generateWithAi': 'Generate with Fera AI',
  'sovereign.claimStore': 'Claim Your Sovereign Store',
`;

if (!content.includes("'addFirstProduct'")) {
  content = content.replace(/\n\s*\};\s*$/, missingKeysBlock + '\n};\n');
}

fs.writeFileSync(enPath, content, 'utf8');
console.log('Successfully updated en.ts with clean UTF-8 and missing keys.');
