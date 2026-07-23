import { Client, Account, Databases, ID, Query, Permission, Role, OAuthProvider } from "appwrite";

// Appwrite project: "fera-login" (Singapore region).
// Endpoint and project ID are public client-side values for the Web SDK.
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!ENDPOINT || !PROJECT_ID) {
  throw new Error('Missing Appwrite configuration. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID in your environment.');
}

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
export const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || '';

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases, ID, Query, Permission, Role, OAuthProvider };