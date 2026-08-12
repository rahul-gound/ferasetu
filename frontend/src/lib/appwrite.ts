import { Client, Account } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'YOUR_APPWRITE_ENDPOINT_HERE';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || 'YOUR_APPWRITE_PROJECT_ID_HERE';

client
    .setEndpoint(endpoint)
    .setProject(projectId);

export const account = new Account(client);
export { client };
