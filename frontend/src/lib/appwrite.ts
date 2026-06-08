import { Client, Account, Databases } from "appwrite";

// Appwrite project: "fera-login" (Singapore region)
// Endpoint and project ID are public client-side values — safe to hardcode for the web SDK.
const client = new Client()
  .setEndpoint("https://sgp.cloud.appwrite.io/v1")
  .setProject("6a267e4a000415bb2cdb");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
