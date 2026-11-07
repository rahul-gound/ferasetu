/**
 * FeraSetu Cloudflare Integration Adapter
 * worker/services/cloudflareAdapter.js
 *
 * Implements dedicated official Cloudflare API adapters for:
 * 1. Cloudflare Workers (Script upload, settings, secrets, custom domains)
 * 2. Cloudflare Pages (Projects, deployments, custom domains)
 * 3. Observability & Health Checks
 *
 * Security Requirements:
 * - Narrowly scoped API tokens.
 * - Server-side only encrypted credential storage.
 * - Redacted logs (tokens NEVER logged).
 * - Zero secrets exposed in frontend responses.
 * - Clear prerequisite diagnostics when credentials or zones are not configured.
 */

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

/**
 * Redacts sensitive tokens or headers from logs.
 */
export function redactSecret(str) {
  if (!str || typeof str !== "string") return "";
  if (str.length <= 8) return "********";
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

/**
 * Symmetric AES-GCM crypto for server-side secret storage.
 */
export async function encryptPlatformSecret(plaintext, masterKeyStr) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive 256-bit key using SHA-256 over master key string
  const keyHash = await crypto.subtle.digest("SHA-256", encoder.encode(masterKeyStr || "FERASETU_DEFAULT_LOCAL_MASTER_KEY_32B"));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyHash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoder.encode(plaintext)
  );

  // Convert to Base64
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  let binary = "";
  for (let i = 0; i < ciphertextBytes.byteLength; i++) {
    binary += String.fromCharCode(ciphertextBytes[i]);
  }
  const encryptedValue = btoa(binary);

  let ivBinary = "";
  for (let i = 0; i < iv.byteLength; i++) {
    ivBinary += String.fromCharCode(iv[i]);
  }
  const ivBase64 = btoa(ivBinary);

  // Masked preview (e.g. "ghp_...7766")
  const maskedPreview = plaintext.length > 8 
    ? `${plaintext.slice(0, 4)}...${plaintext.slice(-4)}`
    : "********";

  return { encryptedValue, iv: ivBase64, maskedPreview };
}

export async function decryptPlatformSecret(encryptedValue, ivBase64, masterKeyStr) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Decode IV
  const ivBinary = atob(ivBase64);
  const iv = new Uint8Array(ivBinary.length);
  for (let i = 0; i < ivBinary.length; i++) {
    iv[i] = ivBinary.charCodeAt(i);
  }

  // Decode Ciphertext
  const cipherBinary = atob(encryptedValue);
  const ciphertext = new Uint8Array(cipherBinary.length);
  for (let i = 0; i < cipherBinary.length; i++) {
    ciphertext[i] = cipherBinary.charCodeAt(i);
  }

  const keyHash = await crypto.subtle.digest("SHA-256", encoder.encode(masterKeyStr || "FERASETU_DEFAULT_LOCAL_MASTER_KEY_32B"));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyHash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    ciphertext
  );

  return decoder.decode(decryptedBuffer);
}

/**
 * Cloudflare Workers Adapter
 */
export class CloudflareWorkersAdapter {
  constructor(apiToken, accountId) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  hasCredentials() {
    return Boolean(this.apiToken && this.accountId);
  }

  getHeaders() {
    return {
      "Authorization": `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Verify Cloudflare token and account access.
   */
  async verifyToken() {
    if (!this.hasCredentials()) {
      return { 
        valid: false, 
        reason: "CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID is not configured in server environment." 
      };
    }

    try {
      const res = await fetch(`${CLOUDFLARE_API_BASE}/user/tokens/verify`, {
        headers: this.getHeaders()
      });
      const data = await res.json();
      return {
        valid: data.success === true,
        status: data.result?.status,
        expiresAt: data.result?.expires_on,
        raw: data
      };
    } catch (err) {
      return { valid: false, reason: err.message };
    }
  }

  /**
   * List deployed worker scripts in account.
   */
  async listScripts() {
    if (!this.hasCredentials()) {
      return { success: false, error: "Cloudflare credentials missing" };
    }
    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/workers/scripts`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return await res.json();
  }

  /**
   * Deploy or update a Worker script with bindings.
   */
  async deployScript(scriptName, scriptCode, metadata = {}) {
    if (!this.hasCredentials()) {
      return { 
        success: false, 
        error: "Missing Cloudflare credentials. Worker deployment requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN." 
      };
    }

    const formData = new FormData();
    const metadataBlob = new Blob([JSON.stringify({
      main_module: "worker.js",
      compatibility_date: metadata.compatibility_date || "2025-06-01",
      bindings: metadata.bindings || []
    })], { type: "application/json" });

    const scriptBlob = new Blob([scriptCode], { type: "application/javascript+module" });

    formData.append("metadata", metadataBlob);
    formData.append("worker.js", scriptBlob, "worker.js");

    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/workers/scripts/${encodeURIComponent(scriptName)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`
      },
      body: formData
    });

    return await res.json();
  }

  /**
   * Set secrets for a Worker script.
   */
  async putSecret(scriptName, secretName, secretValue) {
    if (!this.hasCredentials()) {
      return { success: false, error: "Missing Cloudflare credentials" };
    }
    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/workers/scripts/${encodeURIComponent(scriptName)}/secrets`;
    const res = await fetch(url, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: secretName,
        text: secretValue,
        type: "secret_text"
      })
    });
    return await res.json();
  }

  /**
   * Attach custom domain to a Cloudflare Worker.
   */
  async attachCustomDomain(scriptName, hostname, zoneId) {
    if (!this.hasCredentials()) {
      return { success: false, error: "Missing Cloudflare credentials" };
    }
    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/workers/domains`;
    const res = await fetch(url, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({
        environment: "production",
        hostname,
        service: scriptName,
        zone_id: zoneId
      })
    });
    return await res.json();
  }
}

/**
 * Cloudflare Pages Adapter
 */
export class CloudflarePagesAdapter {
  constructor(apiToken, accountId) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  hasCredentials() {
    return Boolean(this.apiToken && this.accountId);
  }

  getHeaders() {
    return {
      "Authorization": `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * List Pages projects.
   */
  async listProjects() {
    if (!this.hasCredentials()) {
      return { success: false, error: "Cloudflare credentials missing" };
    }
    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/pages/projects`;
    const res = await fetch(url, { headers: this.getHeaders() });
    return await res.json();
  }

  /**
   * Create a Pages project.
   */
  async createProject(projectName, { productionBranch = "main", buildConfig = {} } = {}) {
    if (!this.hasCredentials()) {
      return { 
        success: false, 
        error: "Missing Cloudflare credentials. Pages project creation requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN." 
      };
    }

    const payload = {
      name: projectName,
      production_branch: productionBranch,
      build_config: {
        build_command: buildConfig.build_command || "npm run build",
        destination_dir: buildConfig.output_dir || "dist",
        root_dir: buildConfig.root_dir || ""
      }
    };

    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/pages/projects`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  /**
   * Create deployment for Pages project.
   */
  async createDeployment(projectName, { branch = "main" } = {}) {
    if (!this.hasCredentials()) {
      return { success: false, error: "Missing Cloudflare credentials" };
    }
    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/pages/projects/${encodeURIComponent(projectName)}/deployments`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ branch })
    });
    return await res.json();
  }

  /**
   * Attach custom domain to a Pages project.
   */
  async attachCustomDomain(projectName, domain) {
    if (!this.hasCredentials()) {
      return { success: false, error: "Missing Cloudflare credentials" };
    }
    const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/pages/projects/${encodeURIComponent(projectName)}/domains`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ name: domain })
    });
    return await res.json();
  }
}

/**
 * Resolves Cloudflare provider for a given environment.
 */
export function getCloudflareProvider(env) {
  const apiToken = env?.CLOUDFLARE_API_TOKEN || env?.CF_API_TOKEN || null;
  const accountId = env?.CLOUDFLARE_ACCOUNT_ID || env?.CF_ACCOUNT_ID || null;
  const zoneId = env?.CLOUDFLARE_ZONE_ID || env?.CF_ZONE_ID || null;
  const masterKey = env?.CLOUDFLARE_MASTER_KEY || env?.JWT_SECRET || "FERASETU_MASTER_ENC_KEY";

  return {
    isConfigured: Boolean(apiToken && accountId),
    accountId: accountId ? redactSecret(accountId) : null,
    hasToken: Boolean(apiToken),
    hasZone: Boolean(zoneId),
    workers: new CloudflareWorkersAdapter(apiToken, accountId),
    pages: new CloudflarePagesAdapter(apiToken, accountId),
    zoneId,
    masterKey
  };
}

/**
 * Comprehensive health probe for Cloudflare integration.
 */
export async function probeCloudflareHealth(env) {
  const provider = getCloudflareProvider(env);

  if (!provider.isConfigured) {
    return {
      status: "unconfigured",
      healthy: false,
      message: "Cloudflare API token or Account ID not configured in Worker secrets.",
      prerequisites: [
        "CLOUDFLARE_API_TOKEN (Worker & Pages read/write scope)",
        "CLOUDFLARE_ACCOUNT_ID",
        "CLOUDFLARE_ZONE_ID (Optional, for apex custom domain routing)"
      ],
      details: {
        hasToken: provider.hasToken,
        hasAccountId: Boolean(provider.accountId),
        hasZoneId: provider.hasZone
      }
    };
  }

  const tokenVerification = await provider.workers.verifyToken();
  return {
    status: tokenVerification.valid ? "healthy" : "degraded",
    healthy: tokenVerification.valid,
    message: tokenVerification.valid ? "Cloudflare API connection active and authorized." : (tokenVerification.reason || "Token validation failed."),
    details: {
      accountRef: provider.accountId,
      tokenStatus: tokenVerification.status || "unknown",
      expiresAt: tokenVerification.expiresAt || null
    }
  };
}
