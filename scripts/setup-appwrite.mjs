// One-time Appwrite provisioning for FeraSetu.
//
// Creates the database, the `users` profile collection, its attributes, and an
// index on email. Document-level security is enabled so each user can only
// read/update their own profile document (permissions are set per-document at
// signup, in the frontend AuthContext).
//
// Usage:
//   npm i node-appwrite           # one-time, in repo root
//   APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1 \
//   APPWRITE_PROJECT_ID=6a267e4a000415bb2cdb \
//   APPWRITE_API_KEY=<server-api-key-with-databases-write> \
//   node scripts/setup-appwrite.mjs
//
// The API key is a SERVER key from the Appwrite console (Overview -> API Keys)
// with the `databases.write` scope. It is used only by this script and must
// never be committed or shipped to the browser.

import { Client, Databases, IndexType } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a267e4a000415bb2cdb';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'fera';
const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID || 'users';

if (!API_KEY) {
  console.error('Missing APPWRITE_API_KEY. Create a server API key with databases.write scope in the Appwrite console and pass it as an env var.');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);

// Treat "already exists" (409) as success so the script is idempotent.
async function ensure(label, fn) {
  try {
    await fn();
    console.log(`  created: ${label}`);
  } catch (err) {
    if (err?.code === 409) {
      console.log(`  exists:  ${label}`);
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log(`Provisioning Appwrite project ${PROJECT_ID} at ${ENDPOINT}`);

  await ensure(`database "${DATABASE_ID}"`, () =>
    databases.create(DATABASE_ID, 'FeraSetu'));

  await ensure(`collection "${USERS_COLLECTION_ID}"`, () =>
    databases.createCollection(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'Users',
      undefined,            // permissions: none at collection level
      true,                 // documentSecurity: per-document permissions
      true                  // enabled
    ));

  // String attribute helper: (key, size, required, default)
  const str = (key, size, required = false, def = undefined) =>
    ensure(`attr ${key}`, () =>
      databases.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, key, size, required, def));

  const int = (key, required = false, def = undefined) =>
    ensure(`attr ${key}`, () =>
      databases.createIntegerAttribute(DATABASE_ID, USERS_COLLECTION_ID, key, required, undefined, undefined, def));

  await str('email', 255, true);
  await str('name', 255, true);
  await str('phone', 32);
  await str('business_name', 255);
  await str('plan', 32, false, 'trial');
  await str('preferred_language', 16, false, 'en');
  await str('subdomain', 64);
  await str('custom_domain', 255);
  await str('plan_expires_at', 64);
  await str('ai_credits_reset_at', 64);
  await str('created_at', 64);

  await int('ai_credits_balance', false, 0);
  await int('ai_credits_monthly_limit', false, 0);
  await int('ai_credits_used_month', false, 0);
  await int('storage_used_bytes', false, 0);
  await int('storage_limit_bytes', false, 0);

  // Index on email for lookups/uniqueness checks. Attributes must be available
  // before an index can be created; Appwrite usually processes them quickly, but
  // if this 400s, re-run the script after a few seconds.
  await ensure('index email_idx', () =>
    databases.createIndex(DATABASE_ID, USERS_COLLECTION_ID, 'email_idx', IndexType.Key, ['email']));

  console.log('\nDone. Add these to frontend/.env:');
  console.log(`  VITE_APPWRITE_DATABASE_ID=${DATABASE_ID}`);
  console.log(`  VITE_APPWRITE_USERS_COLLECTION_ID=${USERS_COLLECTION_ID}`);
}

main().catch((err) => {
  console.error('\nSetup failed:', err?.message || err);
  process.exit(1);
});
