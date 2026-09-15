/**
 * FeraSetu Backblaze B2 S3-Compatible Storage Client
 *
 * Implements native AWS Signature Version 4 (SigV4) authentication over Web Crypto.
 * Supports streaming GET/HEAD, conditional reads, range requests, streaming/buffered PUT,
 * and failure-safe DELETE against private Backblaze B2 buckets.
 *
 * Never exposes B2 credentials, raw signatures, or internal B2 error details.
 */

const EMPTY_PAYLOAD_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

/**
 * Computes SHA-256 hex string using Web Crypto API.
 */
export async function sha256Hex(data) {
  if (!data || (typeof data === 'string' && data.length === 0)) {
    return EMPTY_PAYLOAD_SHA256;
  }
  const buffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : (data instanceof Uint8Array ? data : new Uint8Array(data));
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes HMAC-SHA256 using Web Crypto API.
 */
export async function hmacSha256(key, data) {
  const keyBuffer = typeof key === 'string'
    ? new TextEncoder().encode(key)
    : (key instanceof Uint8Array ? key : new Uint8Array(key));
  const dataBuffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : (data instanceof Uint8Array ? data : new Uint8Array(data));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer));
}

/**
 * Derives the AWS SigV4 signing key.
 */
export async function getSigV4SigningKey(secretKey, dateStamp, region, service = 's3') {
  const kDate = await hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

/**
 * Extracts B2 region from B2_ENDPOINT (e.g. s3.us-west-004.backblazeb2.com -> us-west-004).
 */
export function extractB2Region(endpoint, explicitRegion) {
  if (explicitRegion && typeof explicitRegion === 'string' && explicitRegion.trim()) {
    return explicitRegion.trim();
  }
  if (!endpoint || typeof endpoint !== 'string') {
    return 'eu-central-003';
  }
  const match = endpoint.match(/s3\.([a-zA-Z0-9-]+)\.backblazeb2\.com/i);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return 'eu-central-003';
}

/**
 * Normalizes object path ensuring no double slashes or leading slash.
 */
export function normalizeObjectKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.replace(/^\/+/, '').replace(/\/+/g, '/').trim();
}

/**
 * Builds encoded S3 path-style URI: /<bucket>/<encoded-key>
 */
export function buildCanonicalUri(bucketName, objectKey) {
  const cleanKey = normalizeObjectKey(objectKey);
  const encodedParts = cleanKey.split('/').map(encodeURIComponent).join('/');
  return `/${encodeURIComponent(bucketName)}/${encodedParts}`;
}

export class B2Client {
  constructor(options = {}) {
    const endpoint = options.endpoint || options.B2_ENDPOINT || 'https://s3.eu-central-003.backblazeb2.com';
    const bucketName = options.bucketName || options.B2_BUCKET || options.B2_BUCKET_NAME || options.MEDIA_BUCKET_NAME || 'ferasetu-media-prod';
    const applicationKeyId = options.applicationKeyId || options.B2_APPLICATION_KEY_ID || options.B2_KEY_ID || '';
    const applicationKey = options.applicationKey || options.B2_APPLICATION_KEY || options.B2_APP_KEY || options.B2_SECRET_KEY || '';
    const region = options.region || options.B2_REGION;
    const fetcher = options.fetcher || fetch;

    if (!endpoint || !bucketName || !applicationKeyId || !applicationKey) {
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
    }

    this.endpoint = endpoint.replace(/^https?:\/\//, '').replace(/\/+$/, '').trim();
    this.bucketName = bucketName.trim();
    this.applicationKeyId = applicationKeyId.trim();
    this.applicationKey = applicationKey.trim();
    this.region = extractB2Region(this.endpoint, region);
    this.fetcher = fetcher;
  }

  /**
   * Asserts client configuration.
   */
  assertConfigured() {
    if (!this.isConfigured) {
      const err = new Error('B2Client configuration error: B2 credentials or bucket name are missing.');
      err.code = 'B2_CONFIG_MISSING';
      throw err;
    }
  }

  /**
   * Signs and executes an authenticated S3 request against Backblaze B2.
   */
  async signAndFetch(method, objectKey, options = {}) {
    this.assertConfigured();

    const {
      headers: inputHeaders = {},
      query: queryParams = {},
      body = null,
      payloadSha256 = null,
    } = options;

    const host = this.endpoint;
    const canonicalUri = buildCanonicalUri(this.bucketName, objectKey);
    const targetUrl = `https://${host}${canonicalUri}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

    // Determine payload hash
    let calculatedPayloadSha256 = payloadSha256;
    if (!calculatedPayloadSha256) {
      if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
        calculatedPayloadSha256 = EMPTY_PAYLOAD_SHA256;
      } else if (body && (typeof body === 'string' || body instanceof Uint8Array || body instanceof ArrayBuffer)) {
        calculatedPayloadSha256 = await sha256Hex(body);
      } else {
        // For streaming PUT over HTTPS, Backblaze B2 supports UNSIGNED-PAYLOAD
        calculatedPayloadSha256 = UNSIGNED_PAYLOAD;
      }
    }

    // Build headers to sign
    const headersToSign = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': calculatedPayloadSha256,
    };

    // Forward additional headers if present
    for (const [k, v] of Object.entries(inputHeaders)) {
      if (v !== undefined && v !== null && v !== '') {
        headersToSign[k.toLowerCase()] = String(v).trim();
      }
    }

    // Sort canonical headers
    const sortedHeaderKeys = Object.keys(headersToSign).sort();
    const canonicalHeadersStr = sortedHeaderKeys
      .map(k => `${k}:${headersToSign[k]}\n`)
      .join('');
    const signedHeadersStr = sortedHeaderKeys.join(';');

    // Canonical query string
    const queryKeys = Object.keys(queryParams).sort();
    const canonicalQueryStr = queryKeys
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    // Canonical Request
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryStr,
      canonicalHeadersStr,
      signedHeadersStr,
      calculatedPayloadSha256,
    ].join('\n');

    // String to sign
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Sign
    const signingKey = await getSigV4SigningKey(this.applicationKey, dateStamp, this.region, 's3');
    const signatureBytes = await hmacSha256(signingKey, stringToSign);
    const signature = Array.from(signatureBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Authorization header
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.applicationKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

    const requestHeaders = new Headers();
    for (const [k, v] of Object.entries(headersToSign)) {
      requestHeaders.set(k, v);
    }
    requestHeaders.set('Authorization', authorization);

    const fetchOptions = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = body;
    }

    const res = await this.fetcher(targetUrl, fetchOptions);
    return res;
  }

  /**
   * GET object from Backblaze B2 (streaming).
   */
  async getObject(objectKey, options = {}) {
    const headers = {};
    if (options.range) {
      headers['range'] = options.range;
    }
    if (options.ifNoneMatch) {
      headers['if-none-match'] = options.ifNoneMatch;
    }

    const res = await this.signAndFetch('GET', objectKey, { headers });
    return res;
  }

  /**
   * HEAD object metadata from Backblaze B2.
   */
  async headObject(objectKey) {
    const res = await this.signAndFetch('HEAD', objectKey);
    if (res.status === 404) return null;
    if (!res.ok) {
      return null;
    }

    return {
      size: parseInt(res.headers.get('content-length') || '0', 10),
      contentType: res.headers.get('content-type') || 'application/octet-stream',
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
      acceptRanges: res.headers.get('accept-ranges'),
    };
  }

  /**
   * PUT object upload to Backblaze B2.
   */
  async putObject(objectKey, body, options = {}) {
    const headers = {};
    if (options.contentType) {
      headers['content-type'] = options.contentType;
    }
    if (options.contentLength !== undefined && options.contentLength !== null) {
      headers['content-length'] = String(options.contentLength);
    }

    let payloadSha256 = options.payloadSha256 || null;
    if (!payloadSha256 && (typeof body === 'string' || body instanceof Uint8Array || body instanceof ArrayBuffer)) {
      payloadSha256 = await sha256Hex(body);
    }

    const res = await this.signAndFetch('PUT', objectKey, {
      headers,
      body,
      payloadSha256,
    });

    if (!res.ok) {
      const status = res.status;
      let errCode = 'B2_UPLOAD_FAILED';
      if (status === 401) errCode = 'B2_AUTH_FAILED';
      else if (status === 403) errCode = 'B2_ACCESS_DENIED';
      else if (status === 404) errCode = 'B2_BUCKET_NOT_FOUND';
      const err = new Error(`B2 upload failed with HTTP status ${status}`);
      err.code = errCode;
      err.status = status;
      throw err;
    }

    return {
      etag: res.headers.get('etag'),
      size: options.contentLength,
      contentType: options.contentType,
    };
  }

  /**
   * DELETE object from Backblaze B2.
   */
  async deleteObject(objectKey) {
    const res = await this.signAndFetch('DELETE', objectKey);
    // S3 DELETE returns 204 No Content on success (and also 204 if object already deleted)
    if (res.status === 204 || res.status === 200 || res.status === 404) {
      return true;
    }
    let errCode = 'B2_DELETE_FAILED';
    if (res.status === 401) errCode = 'B2_AUTH_FAILED';
    else if (res.status === 403) errCode = 'B2_ACCESS_DENIED';
    const err = new Error(`B2 delete failed with HTTP status ${res.status}`);
    err.code = errCode;
    err.status = res.status;
    throw err;
  }
}
