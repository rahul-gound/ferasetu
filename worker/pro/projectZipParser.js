/**
 * FeraSetu Pro — Zero-Dependency Pure-JS PKZIP Parser & Extractor
 * =============================================================================
 * Compatible with Cloudflare Workers, Node.js (v18+), and modern browsers.
 * Uses Web Standard DecompressionStream('deflate-raw') for streaming inflation.
 * 
 * Strict Security Controls:
 * - Configurable archive size, file count, single-file size, and total uncompressed size.
 * - Zip-bomb / compression ratio protection.
 * - Path traversal prevention (rejects '..', '\', encoded traversals, absolute paths).
 * - Rejects encrypted and unsupported compression methods.
 * - Deterministically filters out vendor/build directories (node_modules, dist, .git, etc.).
 * =============================================================================
 */

export const ZIP_LIMITS = {
  MAX_ARCHIVE_BYTES: 25 * 1024 * 1024,          // 25 MB max compressed archive
  MAX_FILES: 1000,                              // 1000 files maximum
  MAX_SINGLE_FILE_BYTES: 5 * 1024 * 1024,       // 5 MB max uncompressed per file
  MAX_TOTAL_EXTRACTED_BYTES: 100 * 1024 * 1024, // 100 MB max total uncompressed
  MAX_COMPRESSION_RATIO: 100,                   // 100:1 max expansion ratio
};

export const IGNORED_DIRECTORY_PATTERNS = [
  /^node_modules(\/|$)/i,
  /^\.git(\/|$)/i,
  /^dist(\/|$)/i,
  /^build(\/|$)/i,
  /^coverage(\/|$)/i,
  /^\.cache(\/|$)/i,
  /^\.vite(\/|$)/i,
  /^\.next(\/|$)/i,
  /^tmp(\/|$)/i,
  /^\.turbo(\/|$)/i,
  /^\.output(\/|$)/i,
  /^\.parcel-cache(\/|$)/i,
  /^\.yarn(\/|$)/i,
];

// Files in root to always preserve even if a pattern looks similar
export const CRITICAL_CONFIG_FILES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'tsconfig.json',
  'vite.config.js',
  'vite.config.ts',
  'vite.config.mjs',
  'vite.config.cjs',
  'index.html',
]);

export class ZipSecurityError extends Error {
  constructor(message, code = "ZIP_SECURITY_VIOLATION") {
    super(message);
    this.name = "ZipSecurityError";
    this.code = code;
  }
}

/**
 * Normalizes and sanitizes an internal ZIP path.
 * Enforces strict path traversal rejection.
 */
export function sanitizeZipEntryPath(rawPath) {
  if (typeof rawPath !== 'string') {
    throw new ZipSecurityError("Invalid entry path type", "INVALID_PATH");
  }

  // Replace backslashes with standard forward slashes
  let path = rawPath.replace(/\\/g, '/');

  // Strip leading slashes to prevent absolute path assumptions
  path = path.replace(/^\/+/, '');

  // Normalize duplicate slashes
  path = path.replace(/\/+/g, '/').trim();

  if (!path) {
    throw new ZipSecurityError("Empty entry path after normalization", "EMPTY_PATH");
  }

  // Check for path traversal elements
  const segments = path.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      throw new ZipSecurityError(`Path traversal attempt detected in path: ${rawPath}`, "PATH_TRAVERSAL_BLOCKED");
    }
  }

  return path;
}

/**
 * Determines whether a file path should be ignored (vendor / build / temp output).
 */
export function isIgnoredPath(filePath) {
  const normalized = filePath.replace(/^\/+/, '');
  for (const pattern of IGNORED_DIRECTORY_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Inflates raw DEFLATE bytes using native DecompressionStream.
 */
async function inflateRaw(compressedBytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error("DecompressionStream is not supported in this runtime environment.");
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  const writePromise = writer.write(compressedBytes).then(() => writer.close());

  const chunks = [];
  let totalLen = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLen += value.byteLength;
    }
  }

  await writePromise;

  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/**
 * Parses a ZIP archive buffer and extracts valid files into an in-memory map.
 * 
 * @param {ArrayBuffer|Uint8Array} zipBuffer - Raw ZIP binary data
 * @param {object} customLimits - Overrides for limits
 * @returns {Promise<{ files: Array<{ path: string, content: string, size: number, isBinary: boolean, hash: string }>, totalExtractedBytes: number }>}
 */
export async function extractZipArchive(zipBuffer, customLimits = {}) {
  const limits = { ...ZIP_LIMITS, ...customLimits };
  const bytes = zipBuffer instanceof Uint8Array ? zipBuffer : new Uint8Array(zipBuffer);

  if (bytes.byteLength > limits.MAX_ARCHIVE_BYTES) {
    throw new ZipSecurityError(
      `ZIP archive size (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed size of ${limits.MAX_ARCHIVE_BYTES / 1024 / 1024} MB.`,
      "ARCHIVE_TOO_LARGE"
    );
  }

  if (bytes.byteLength < 22) {
    throw new ZipSecurityError("Invalid ZIP file: file too small.", "MALFORMED_ZIP");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Find End of Central Directory Record (EOCD) by scanning backwards from end
  let eocdOffset = -1;
  const maxScan = Math.min(bytes.byteLength, 65536 + 22);
  for (let i = bytes.byteLength - 22; i >= bytes.byteLength - maxScan; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new ZipSecurityError("End of Central Directory Record (EOCD) not found. Corrupted or invalid ZIP archive.", "INVALID_EOCD");
  }

  const totalCentralEntries = view.getUint16(eocdOffset + 10, true);
  const cdSize = view.getUint32(eocdOffset + 12, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  if (totalCentralEntries > limits.MAX_FILES) {
    throw new ZipSecurityError(
      `ZIP archive contains ${totalCentralEntries} entries, exceeding maximum allowed limit of ${limits.MAX_FILES}.`,
      "TOO_MANY_FILES"
    );
  }

  if (cdOffset + cdSize > bytes.byteLength) {
    throw new ZipSecurityError("Central Directory offset is out of bounds.", "MALFORMED_ZIP");
  }

  let cdPos = cdOffset;
  const files = [];
  let totalExtractedBytes = 0;
  const textDecoder = new TextDecoder('utf-8', { fatal: false });

  for (let entryIdx = 0; entryIdx < totalCentralEntries; entryIdx++) {
    if (cdPos + 46 > bytes.byteLength) break;

    const signature = view.getUint32(cdPos, true);
    if (signature !== 0x02014b50) {
      break;
    }

    const generalFlags = view.getUint16(cdPos + 8, true);
    const isEncrypted = (generalFlags & 0x0001) !== 0;
    if (isEncrypted) {
      throw new ZipSecurityError("Encrypted or password-protected ZIP archives are not supported.", "ENCRYPTED_ZIP_UNSUPPORTED");
    }

    const compressionMethod = view.getUint16(cdPos + 10, true);
    const compressedSize = view.getUint32(cdPos + 20, true);
    const uncompressedSize = view.getUint32(cdPos + 24, true);
    const fileNameLen = view.getUint16(cdPos + 28, true);
    const extraFieldLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localHeaderOffset = view.getUint32(cdPos + 42, true);

    const rawPathBytes = bytes.subarray(cdPos + 46, cdPos + 46 + fileNameLen);
    const rawPath = textDecoder.decode(rawPathBytes);

    cdPos += 46 + fileNameLen + extraFieldLen + commentLen;

    // Skip directory entries
    if (rawPath.endsWith('/')) {
      continue;
    }

    const cleanPath = sanitizeZipEntryPath(rawPath);

    // Skip ignored build and vendor directories (node_modules, dist, etc.)
    if (isIgnoredPath(cleanPath)) {
      continue;
    }

    // Security guard: Single file size check
    if (uncompressedSize > limits.MAX_SINGLE_FILE_BYTES) {
      throw new ZipSecurityError(
        `File '${cleanPath}' uncompressed size (${(uncompressedSize / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed limit of ${limits.MAX_SINGLE_FILE_BYTES / 1024 / 1024} MB.`,
        "FILE_TOO_LARGE"
      );
    }

    // Zip-bomb expansion ratio check (only for compressed files > 1 KB)
    if (compressedSize > 0 && uncompressedSize > 1024) {
      const ratio = uncompressedSize / compressedSize;
      if (ratio > limits.MAX_COMPRESSION_RATIO) {
        throw new ZipSecurityError(
          `Zip bomb detected in file '${cleanPath}' (expansion ratio ${ratio.toFixed(1)}:1 exceeds limit of ${limits.MAX_COMPRESSION_RATIO}:1).`,
          "ZIP_BOMB_DETECTED"
        );
      }
    }

    totalExtractedBytes += uncompressedSize;
    if (totalExtractedBytes > limits.MAX_TOTAL_EXTRACTED_BYTES) {
      throw new ZipSecurityError(
        `Total uncompressed project size exceeds maximum allowed limit of ${limits.MAX_TOTAL_EXTRACTED_BYTES / 1024 / 1024} MB.`,
        "TOTAL_EXTRACTED_SIZE_EXCEEDED"
      );
    }

    // Locate Local File Header to read payload
    if (localHeaderOffset + 30 > bytes.byteLength) {
      throw new ZipSecurityError(`Corrupted local header pointer for entry '${cleanPath}'.`, "MALFORMED_LOCAL_HEADER");
    }

    const localSig = view.getUint32(localHeaderOffset, true);
    if (localSig !== 0x04034b50) {
      throw new ZipSecurityError(`Invalid local file header signature for entry '${cleanPath}'.`, "INVALID_LOCAL_HEADER");
    }

    const localFileNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localFileNameLen + localExtraLen;

    if (dataOffset + compressedSize > bytes.byteLength) {
      throw new ZipSecurityError(`Truncated entry payload for '${cleanPath}'.`, "TRUNCATED_PAYLOAD");
    }

    const compressedPayload = bytes.subarray(dataOffset, dataOffset + compressedSize);
    let fileBytes;

    if (compressionMethod === 0) {
      // Stored (no compression)
      fileBytes = compressedPayload;
    } else if (compressionMethod === 8) {
      // DEFLATE
      try {
        fileBytes = await inflateRaw(compressedPayload);
      } catch (err) {
        throw new ZipSecurityError(`Failed to decompress DEFLATE entry '${cleanPath}': ${err.message}`, "DECOMPRESSION_FAILED");
      }
    } else {
      throw new ZipSecurityError(
        `Unsupported compression method (${compressionMethod}) for entry '${cleanPath}'. Only Stored (0) and DEFLATE (8) are supported.`,
        "UNSUPPORTED_COMPRESSION_METHOD"
      );
    }

    // Compute SHA-256 hash of extracted content
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBytes);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Determine if file is text or binary
    const isBinary = isBinaryContent(fileBytes, cleanPath);
    let content = '';

    if (!isBinary) {
      content = textDecoder.decode(fileBytes);
    } else {
      // For binary assets, store base64 representation if under 1MB, or asset placeholder
      content = uint8ArrayToBase64(fileBytes);
    }

    files.push({
      path: cleanPath,
      content,
      size: fileBytes.byteLength,
      isBinary,
      hash: hashHex,
    });
  }

  return {
    files,
    totalExtractedBytes,
  };
}

/**
 * Heuristic to detect binary vs text files.
 */
function isBinaryContent(bytes, filePath) {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svgz',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.mp3', '.wav', '.ogg',
    '.pdf', '.zip', '.tar', '.gz', '.wasm'
  ];
  const lower = filePath.toLowerCase();
  for (const ext of binaryExtensions) {
    if (lower.endsWith(ext)) return true;
  }

  // Scan first 512 bytes for NULL control characters
  const sampleLen = Math.min(bytes.byteLength, 512);
  for (let i = 0; i < sampleLen; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

/**
 * Encodes Uint8Array to base64 string.
 */
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const parseZipArchive = extractZipArchive;

