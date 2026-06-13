import { Client, Account, Databases, ID, Query, Permission, Role, OAuthProvider } from "appwrite";

// Appwrite project: "fera-login" (Singapore region).
// Endpoint and project ID are public client-side values — safe to expose to the web SDK.
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || "6a267e4a000415bb2cdb";

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "fera";
export const USERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID || "users";

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases, ID, Query, Permission, Role, OAuthProvider };
