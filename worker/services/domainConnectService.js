/**
 * FeraSetu Domain Connect & DNS Provider Detection Service
 * worker/services/domainConnectService.js
 * =============================================================================
 * Provides zero-friction, 1-click DNS configuration for the Global Shopkeeper:
 * 1. Automatic registrar & DNS provider detection via DoH (DNS-over-HTTPS)
 * 2. Official Domain Connect Protocol discovery (_domainconnect.<domain>)
 * 3. 1-Click DNS authorization link generation (GoDaddy, IONOS, Namecheap, etc.)
 * 4. Direct registrar DNS dashboard deep-linking with live background verification radar
 * 5. Official Domain Connect service template manifest provider
 * =============================================================================
 */

import { queryDoh, ROOT_DOMAIN, DEFAULT_DKIM_SELECTOR, DEFAULT_PLATFORM_DKIM_PUBKEY } from './dnsVerification.js';
import { INGRESS_HOSTNAME_TARGET, INGRESS_IPV4_TARGETS } from './domainIngressService.js';
import { normalizeDomainName } from './spaceshipClient.js';

export const DOMAIN_CONNECT_PROVIDER_ID = "ferasetu.com";
export const DOMAIN_CONNECT_SERVICE_ID = "storefront";

/**
 * Recognized global DNS providers with signatures, deep links, and automation capabilities.
 */
export const KNOWN_PROVIDERS = [
  {
    id: "godaddy",
    name: "GoDaddy",
    logo: "godaddy",
    matchPatterns: ["domaincontrol.com"],
    supportsDomainConnect: true,
    supports1ClickDns: true,
    type: "DOMAIN_CONNECT",
    defaultDomainConnectHost: "_domainconnect.godaddy.com",
    syncUxBase: "https://dcc.godaddy.com/manage/domainconnect",
    dnsConsolePattern: (d) => `https://dcc.godaddy.com/manage/${encodeURIComponent(d)}/dns`,
    actionLabel: "Connect with GoDaddy (1-Click)",
    instructions: "We will open GoDaddy where you confirm with 1 click. FeraSetu records are added automatically."
  },
  {
    id: "namecheap",
    name: "Namecheap",
    logo: "namecheap",
    matchPatterns: ["registrar-servers.com", "namecheaphosting.com"],
    supportsDomainConnect: true,
    supports1ClickDns: true,
    type: "DOMAIN_CONNECT",
    defaultDomainConnectHost: "domainconnect.namecheap.com",
    syncUxBase: "https://ap.www.namecheap.com/domains/domaincontrolpanel",
    dnsConsolePattern: (d) => `https://ap.www.namecheap.com/domains/domaincontrolpanel/${encodeURIComponent(d)}/advancedns`,
    actionLabel: "Connect with Namecheap (1-Click)",
    instructions: "Click to open Namecheap DNS management and confirm FeraSetu storefront records."
  },
  {
    id: "ionos",
    name: "IONOS / 1&1",
    logo: "ionos",
    matchPatterns: ["ui-dns.com", "ui-dns.org", "ui-dns.de", "ionos.com"],
    supportsDomainConnect: true,
    supports1ClickDns: true,
    type: "DOMAIN_CONNECT",
    defaultDomainConnectHost: "connect.domainconnect.ionos.com",
    syncUxBase: "https://domainconnect.ionos.com",
    dnsConsolePattern: (d) => `https://my.ionos.com/domain-dns-settings/${encodeURIComponent(d)}`,
    actionLabel: "Connect with IONOS (1-Click)",
    instructions: "Click to authorize FeraSetu on IONOS. DNS records will be added automatically."
  },
  {
    id: "spaceship",
    name: "Spaceship",
    logo: "spaceship",
    matchPatterns: ["spaceship.com"],
    supportsDomainConnect: false,
    supports1ClickDns: true,
    type: "API_AUTOMATION",
    dnsConsolePattern: () => "https://www.spaceship.com/launchpad/",
    actionLabel: "Apply Spaceship DNS (1-Click)",
    instructions: "Spaceship DNS detected. FeraSetu can apply all DNS records directly via API."
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    logo: "cloudflare",
    matchPatterns: ["ns.cloudflare.com", "cloudflare.com"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: (d) => `https://dash.cloudflare.com/?to=/:account/${encodeURIComponent(d)}/dns`,
    actionLabel: "Open Cloudflare DNS",
    instructions: "Click to open your Cloudflare DNS panel. Copy records with 1-click and our radar will auto-verify."
  },
  {
    id: "hostinger",
    name: "Hostinger",
    logo: "hostinger",
    matchPatterns: ["hostinger.com", "dns-parking.com", "main-hosting.eu"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: (d) => `https://hpanel.hostinger.com/hosting/${encodeURIComponent(d)}/advanced/dns-zone-editor`,
    actionLabel: "Open Hostinger DNS Zone",
    instructions: "Click to open Hostinger hPanel DNS Zone Editor. Records are automatically copied."
  },
  {
    id: "squarespace",
    name: "Squarespace / Google Domains",
    logo: "squarespace",
    matchPatterns: ["squarespacedns.com", "googledomains.com"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: (d) => `https://account.squarespace.com/domains/managed/${encodeURIComponent(d)}/dns-settings`,
    actionLabel: "Open Squarespace DNS",
    instructions: "Click to open Squarespace DNS Settings for this domain."
  },
  {
    id: "bluehost",
    name: "Bluehost",
    logo: "bluehost",
    matchPatterns: ["bluehost.com"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: () => "https://my.bluehost.com/web-hosting/cpanel",
    actionLabel: "Open Bluehost cPanel DNS",
    instructions: "Click to open Bluehost DNS Zone Editor."
  },
  {
    id: "porkbun",
    name: "Porkbun",
    logo: "porkbun",
    matchPatterns: ["porkbun.com"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: () => "https://porkbun.com/account/domains",
    actionLabel: "Open Porkbun DNS",
    instructions: "Click to open Porkbun Details & DNS management."
  },
  {
    id: "bigrock",
    name: "BigRock",
    logo: "bigrock",
    matchPatterns: ["bigrock.com"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: () => "https://manage.bigrock.in/",
    actionLabel: "Open BigRock Control Panel",
    instructions: "Click to open BigRock DNS management."
  },
  {
    id: "route53",
    name: "AWS Route 53",
    logo: "aws",
    matchPatterns: ["awsdns-"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: () => "https://console.aws.amazon.com/route53/",
    actionLabel: "Open AWS Route 53",
    instructions: "Click to open AWS Route 53 Hosted Zone."
  },
  {
    id: "wix",
    name: "Wix",
    logo: "wix",
    matchPatterns: ["wixdns.net"],
    supportsDomainConnect: false,
    supports1ClickDns: false,
    type: "DIRECT_DASHBOARD",
    dnsConsolePattern: () => "https://manage.wix.com/dashboard",
    actionLabel: "Open Wix Domain Manager",
    instructions: "Click to open Wix Domain settings."
  },
  {
    id: "wordpress",
    name: "WordPress.com",
    logo: "wordpress",
    matchPatterns: ["wordpress.com"],
    supportsDomainConnect: true,
    supports1ClickDns: true,
    type: "DOMAIN_CONNECT",
    defaultDomainConnectHost: "domainconnect.wordpress.com",
    dnsConsolePattern: (d) => `https://wordpress.com/domains/manage/${encodeURIComponent(d)}/dns`,
    actionLabel: "Connect with WordPress (1-Click)",
    instructions: "Click to authorize FeraSetu on WordPress.com DNS."
  }
];

/**
 * Extracts apex domain (e.g. `shop.example.co.uk` -> `example.co.uk`, `store.example.com` -> `example.com`).
 */
export function extractApexDomain(rawDomain) {
  const norm = normalizeDomainName(rawDomain);
  if (!norm.valid) return rawDomain.toLowerCase().trim();
  const domain = norm.domain;

  const parts = domain.split('.');
  if (parts.length <= 2) return domain;

  // Handle common two-part ccTLDs (.co.uk, .com.in, .org.in, .net.in, .ac.in, etc.)
  const secondLevelTlds = ['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'];
  if (parts.length >= 3 && secondLevelTlds.includes(parts[parts.length - 2]) && parts[parts.length - 1].length === 2) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Resolves authoritative DNS nameservers and Domain Connect discovery for a domain.
 *
 * @param {string} rawDomain - Target domain name
 * @param {object} [options]
 * @param {string} [options.ownershipToken] - Verification challenge token
 * @param {string} [options.redirectUri] - Callback URL after registrar confirmation
 * @returns {Promise<object>}
 */
export async function detectDomainDnsProvider(rawDomain, options = {}) {
  const norm = normalizeDomainName(rawDomain);
  if (!norm.valid) {
    return {
      domain: rawDomain,
      valid: false,
      error: norm.error,
      hasDns: false,
      provider: null
    };
  }

  const domain = norm.domain;
  const apexDomain = extractApexDomain(domain);
  const ownershipToken = options.ownershipToken || "pending";
  const redirectUri = options.redirectUri || `https://${ROOT_DOMAIN}/settings/email?tab=domains&connected=${encodeURIComponent(domain)}`;

  // 1. Authoritative DoH queries in parallel: NS on apex, and Domain Connect discovery
  const [nsResult, domainConnectTxt, domainConnectCname] = await Promise.all([
    queryDoh(apexDomain, "NS"),
    queryDoh(`_domainconnect.${apexDomain}`, "TXT"),
    queryDoh(`_domainconnect.${apexDomain}`, "CNAME")
  ]);

  // Extract raw nameserver records
  const nameservers = [];
  if (nsResult.success && Array.isArray(nsResult.answers)) {
    for (const ans of nsResult.answers) {
      if (ans.type === 2 && ans.data) { // NS record type is 2
        const nsClean = ans.data.toLowerCase().replace(/\.+$/, '');
        if (!nameservers.includes(nsClean)) {
          nameservers.push(nsClean);
        }
      }
    }
  }

  // Check if Domain Connect is announced via DNS
  let domainConnectAnnouncedHost = null;
  if (domainConnectCname.success && Array.isArray(domainConnectCname.answers)) {
    for (const ans of domainConnectCname.answers) {
      if (ans.data) {
        domainConnectAnnouncedHost = ans.data.toLowerCase().replace(/\.+$/, '');
        break;
      }
    }
  }
  if (!domainConnectAnnouncedHost && domainConnectTxt.success && Array.isArray(domainConnectTxt.answers)) {
    for (const ans of domainConnectTxt.answers) {
      if (ans.data) {
        // e.g. "domainconnect.godaddy.com" or "url=..."
        const val = ans.data.trim();
        if (val.includes('.') && !val.includes(' ')) {
          domainConnectAnnouncedHost = val;
          break;
        }
      }
    }
  }

  // 2. Determine if the provider has given active DNS to this domain
  const hasDns = nameservers.length > 0;

  // 3. Match against known providers
  let matchedProvider = null;
  for (const provider of KNOWN_PROVIDERS) {
    const isMatch = nameservers.some(ns => 
      provider.matchPatterns.some(pattern => ns.includes(pattern))
    );
    if (isMatch) {
      matchedProvider = provider;
      break;
    }
  }

  // If no match by NS, but _domainconnect is announced, try matching Domain Connect host
  if (!matchedProvider && domainConnectAnnouncedHost) {
    for (const provider of KNOWN_PROVIDERS) {
      if (provider.defaultDomainConnectHost && domainConnectAnnouncedHost.includes(provider.id)) {
        matchedProvider = provider;
        break;
      }
    }
  }

  // 4. Build response structure
  let providerInfo = null;

  if (matchedProvider) {
    const dnsConsoleUrl = matchedProvider.dnsConsolePattern(apexDomain);
    let connectUrl = dnsConsoleUrl;

    if (matchedProvider.type === "DOMAIN_CONNECT") {
      // Build Domain Connect Synchronous UX link
      // Specification: <urlSyncUX>?domain=<domain>&providerId=<providerId>&serviceId=<serviceId>&<variable>=<value>&redirect_uri=<uri>
      const dcBase = matchedProvider.syncUxBase || (domainConnectAnnouncedHost ? `https://${domainConnectAnnouncedHost}/v2/domainTemplates/providers` : null);
      if (dcBase) {
        const params = new URLSearchParams({
          domain: apexDomain,
          providerId: DOMAIN_CONNECT_PROVIDER_ID,
          serviceId: DOMAIN_CONNECT_SERVICE_ID,
          ferasetu_target: INGRESS_HOSTNAME_TARGET,
          ferasetu_token: ownershipToken,
          redirect_uri: redirectUri
        });
        connectUrl = `${dcBase}?${params.toString()}`;
      }
    }

    providerInfo = {
      id: matchedProvider.id,
      name: matchedProvider.name,
      logo: matchedProvider.logo,
      type: matchedProvider.type,
      supports1ClickDns: matchedProvider.supports1ClickDns,
      supportsDomainConnect: matchedProvider.supportsDomainConnect,
      actionLabel: matchedProvider.actionLabel,
      instructions: matchedProvider.instructions,
      connectUrl,
      dnsConsoleUrl,
      domainConnectAnnouncedHost
    };
  } else if (hasDns) {
    // Custom or unrecognized DNS provider with active nameservers
    const primaryNs = nameservers[0] || 'Unknown';
    providerInfo = {
      id: "custom",
      name: `Custom DNS (${primaryNs})`,
      logo: "globe",
      type: "MANUAL",
      supports1ClickDns: false,
      supportsDomainConnect: Boolean(domainConnectAnnouncedHost),
      actionLabel: "Open DNS Provider",
      instructions: `Your domain is pointing to ${primaryNs}. Add the CNAME and verification TXT records to complete connection.`,
      connectUrl: null,
      dnsConsoleUrl: null,
      domainConnectAnnouncedHost
    };
  } else {
    // Unassigned or expired domain without nameservers
    providerInfo = {
      id: "none",
      name: "No Active DNS Detected",
      logo: "alert",
      type: "NO_DNS",
      supports1ClickDns: false,
      supportsDomainConnect: false,
      actionLabel: "Configure Nameservers First",
      instructions: "No nameservers are responding for this domain. Please log in to your domain registrar and ensure default DNS is turned on.",
      connectUrl: null,
      dnsConsoleUrl: null,
      domainConnectAnnouncedHost: null
    };
  }

  return {
    valid: true,
    domain,
    apexDomain,
    hasDns,
    nameservers,
    domainConnectAnnouncedHost,
    provider: providerInfo
  };
}

/**
 * Returns the official Domain Connect Service Template Manifest for FeraSetu.
 * Compatible with domainconnect.org specification v2.
 */
export function getDomainConnectTemplateManifest(providerId = DOMAIN_CONNECT_PROVIDER_ID, serviceId = DOMAIN_CONNECT_SERVICE_ID) {
  if (providerId !== DOMAIN_CONNECT_PROVIDER_ID || serviceId !== DOMAIN_CONNECT_SERVICE_ID) {
    return null;
  }

  return {
    providerId: DOMAIN_CONNECT_PROVIDER_ID,
    providerName: "FeraSetu",
    serviceId: DOMAIN_CONNECT_SERVICE_ID,
    serviceName: "FeraSetu Storefront & Branded Email",
    version: 1,
    syncBlock: false,
    syncPubKeyDomain: ROOT_DOMAIN,
    syncRedirectUrl: `https://${ROOT_DOMAIN}/settings/email?tab=domains&status=verified`,
    variableDescription: "Connect your storefront and verified transactional email to FeraSetu 0% commission platform",
    records: [
      {
        type: "TXT",
        name: "_ferasetu-challenge",
        data: "fera-domain-verification=%ferasetu_token%",
        ttl: 300
      },
      {
        type: "CNAME",
        name: "www",
        data: "%ferasetu_target%",
        ttl: 300
      },
      {
        type: "A",
        name: "@",
        data: INGRESS_IPV4_TARGETS[0],
        ttl: 300
      },
      {
        type: "TXT",
        name: `${DEFAULT_DKIM_SELECTOR}._domainkey`,
        data: `v=DKIM1; k=rsa; p=${DEFAULT_PLATFORM_DKIM_PUBKEY}`,
        ttl: 300
      },
      {
        type: "TXT",
        name: "@",
        data: `v=spf1 include:_spf.${ROOT_DOMAIN} ~all`,
        ttl: 300
      }
    ]
  };
}
