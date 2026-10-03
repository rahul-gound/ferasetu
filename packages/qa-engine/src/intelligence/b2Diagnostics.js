/**
 * FeraSetu QA Engine - B2 & CDN Media Intelligence
 * =================================================
 * Deep diagnostic analyzer for Backblaze B2 private bucket storage
 * and Cloudflare Edge CDN Gateway (cdn.ferasetu.com).
 */

/**
 * Inspects a failed media URL and returns deep diagnostic details and subsystem tracing.
 * @param {Object} params
 * @param {string} params.url - Asset URL (e.g. https://cdn.ferasetu.com/shops/abc/products/item.webp)
 * @param {number} [params.status] - HTTP status code observed
 * @param {string} [params.componentName] - UI Component displaying the media
 * @param {number} [params.naturalWidth] - Rendered image width
 * @param {number} [params.naturalHeight] - Rendered image height
 * @param {Record<string, string>} [params.responseHeaders] - Observed response headers
 * @returns {Object} Diagnostic report with likely subsystem, trace, and suggested fix
 */
export function diagnoseMediaFailure({
  url,
  status = 0,
  componentName = 'MediaElement',
  naturalWidth = 0,
  naturalHeight = 0,
  responseHeaders = {},
}) {
  let isFeraSetuCdn = false;
  let shopId = null;
  let mediaCategory = null;
  let fileName = null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('cdn.ferasetu.com') || parsed.hostname.includes('backblazeb2.com')) {
      isFeraSetuCdn = true;
      const pathParts = parsed.pathname.replace(/^\/+/, '').split('/');
      if (pathParts[0] === 'shops' && pathParts.length >= 3) {
        shopId = pathParts[1];
        mediaCategory = pathParts[2];
        fileName = pathParts.slice(3).join('/');
      }
    }
  } catch {
    // Malformed URL
    return {
      likelySubsystem: 'Frontend URL Construction',
      diagnosticTrace: `${componentName} -> malformed image URL: ${url}`,
      likelyCause: 'The image src attribute contains an invalid or malformed URL string.',
      suggestedInvestigation: 'Check how the image URL is built in the frontend template or product mapping.',
    };
  }

  if (!isFeraSetuCdn) {
    if (status === 404) {
      return {
        likelySubsystem: 'External Asset / Static CDN',
        diagnosticTrace: `${componentName} -> ${url} -> HTTP 404`,
        likelyCause: 'External asset not found at the specified URL.',
        suggestedInvestigation: 'Verify external image host availability or update the image URL.',
      };
    }
    return {
      likelySubsystem: 'External Asset',
      diagnosticTrace: `${componentName} -> ${url} -> Status ${status}`,
      likelyCause: `Asset failed to render properly (status: ${status}, naturalWidth: ${naturalWidth}).`,
      suggestedInvestigation: 'Inspect network response and content-type.',
    };
  }

  // FeraSetu B2 / CDN Gateway Diagnostics
  const traceSteps = [
    componentName,
    'image src',
    'cdn.ferasetu.com',
    'CDN Worker',
    'Backblaze B2',
  ];

  if (status === 403) {
    traceSteps.push('HTTP 403 Forbidden');
    return {
      likelySubsystem: 'B2 -> CDN Worker Authorization',
      diagnosticTrace: traceSteps.join(' -> '),
      likelyCause: shopId
        ? `Private Backblaze B2 permission denied for shop ${shopId} category '${mediaCategory}'. Either AWS SigV4 edge signature is invalid or category requires authenticated session.`
        : 'Access denied by Backblaze B2 bucket policy. The request was rejected by the B2 authorization pipeline.',
      suggestedInvestigation:
        'Verify AWS SigV4 signing keys in Worker environment (B2_APPLICATION_KEY_ID / B2_APPLICATION_KEY) and check if the category is listed in PUBLIC_CATEGORIES (products, logos, banners).',
    };
  }

  if (status === 404) {
    traceSteps.push('HTTP 404 Not Found');
    return {
      likelySubsystem: 'B2 Storage Object Existence',
      diagnosticTrace: traceSteps.join(' -> '),
      likelyCause: `Object '${fileName || parsed?.pathname}' does not exist in Backblaze B2 bucket under shop '${shopId}'.`,
      suggestedInvestigation:
        'Check whether the product image upload actually succeeded (POST /api/media/upload) or if the object key was corrupted in the database.',
    };
  }

  if (status === 0 || naturalWidth === 0) {
    traceSteps.push('Rendering Failure (naturalWidth = 0)');
    return {
      likelySubsystem: 'Frontend Image Rendering / CORS',
      diagnosticTrace: traceSteps.join(' -> '),
      likelyCause:
        'Image failed to decode or was blocked by browser CORS policy. Response may be empty or Content-Type is invalid.',
      suggestedInvestigation:
        'Check Access-Control-Allow-Origin headers on cdn.ferasetu.com and ensure the response has a valid image MIME type (image/webp, image/jpeg).',
    };
  }

  traceSteps.push(`HTTP ${status}`);
  return {
    likelySubsystem: 'CDN Edge Gateway',
    diagnosticTrace: traceSteps.join(' -> '),
    likelyCause: `CDN Worker returned unexpected status ${status}.`,
    suggestedInvestigation: 'Inspect Cloudflare Worker logs for cdn.ferasetu.com.',
  };
}
