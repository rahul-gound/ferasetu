import { Client, Account, Databases, ID, Query, Permission, Role, OAuthProvider } from "appwrite";

// Appwrite project: "fera-login" (Singapore region).
// Endpoint and project ID are public client-side values for the Web SDK.
function getEndpoint() {
  return import.meta.env.VITE_APPWRITE_ENDPOINT;
}

function getProjectId() {
  return import.meta.env.VITE_APPWRITE_PROJECT_ID;
}

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
export const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || '';

// Lazy initialization - only create when actually used
let _client: Client | null = null;
let _account: Account | null = null;
let _databases: Databases | null = null;

function ensureClient(): Client {
  if (!_client) {
    const ENDPOINT = getEndpoint();
    const PROJECT_ID = getProjectId();
    if (!ENDPOINT || !PROJECT_ID) {
      throw new Error('Missing Appwrite configuration. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID in your environment.');
    }
    _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  }
  return _client;
}

function ensureAccount(): Account {
  if (!_account) {
    _account = new Account(ensureClient());
  }
  return _account;
}

function ensureDatabases(): Databases {
  if (!_databases) {
    _databases = new Databases(ensureClient());
  }
  return _databases;
}

// Create proxy objects that initialize on first use
export const client = new Proxy({} as Client, {
  get(_target, prop) {
    try {
      return ensureClient()[prop as keyof Client];
    } catch (err) {
      console.error('[Appwrite Client] Error:', (err as Error).message);
      throw err;
    }
  },
});

export const account = new Proxy({} as Account, {
  get(_target, prop) {
    try {
      return ensureAccount()[prop as keyof Account];
    } catch (err) {
      console.error('[Appwrite Account] Error:', (err as Error).message);
      throw err;
    }
  },
});

export const databases = new Proxy({} as Databases, {
  get(_target, prop) {
    try {
      return ensureDatabases()[prop as keyof Databases];
    } catch (err) {
      console.error('[Appwrite Databases] Error:', (err as Error).message);
      throw err;
    }
  },
});

export { ID, Query, Permission, Role, OAuthProvider };
