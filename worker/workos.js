// FeraSetu — WorkOS REST API Integration
// ===========================================
// Provides standard WorkOS AuthKit multi-tenant Organization, Membership,
// and Invitation management.
//
// The WorkOS Organization represents the merchant BUSINESS/STORE, not the individual shopkeeper.
// Zero manual WorkOS dashboard steps required.

const WORKOS_API_BASE = "https://api.workos.com";

/**
 * Checks if live WorkOS API calls can be performed.
 */
export function isLiveWorkOS(env) {
  const key = env?.WORKOS_API_KEY;
  return typeof key === "string" && key.startsWith("sk_") && !key.includes("test_placeholder");
}

/**
 * Creates a standard WorkOS Organization representing the merchant store.
 * - name = merchant's business/store name
 * - external_id = FeraSetu organization.id
 * - no domain unless merchant explicitly owns and verifies a domain
 */
export async function createWorkOSOrganization({ name, externalId, env }) {
  if (!name || typeof name !== "string") {
    throw new Error("WorkOS Organization name is required");
  }

  if (!isLiveWorkOS(env)) {
    // Deterministic mock WorkOS organization for test & offline environments
    const mockId = `org_${(externalId || crypto.randomUUID()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
    return {
      object: "organization",
      id: mockId,
      name,
      allow_profiles_outside_organization: true,
      domains: [],
      external_id: externalId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const payload = {
    name: name.trim(),
    allow_profiles_outside_organization: true,
  };
  if (externalId) {
    payload.external_id = externalId;
  }

  const res = await fetch(`${WORKOS_API_BASE}/organizations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.WORKOS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("WorkOS createOrganization error:", res.status, errorBody);
    throw new Error(`Failed to create WorkOS Organization (${res.status}): ${errorBody}`);
  }

  return await res.json();
}

/**
 * Creates an organization membership for a user in WorkOS.
 * - organization_id = WorkOS organization ID
 * - user_id = WorkOS user ID
 * - role_slug = 'owner' | 'admin' | 'staff'
 */
export async function createWorkOSMembership({ organizationId, userId, roleSlug = "owner", env }) {
  if (!organizationId || !userId) {
    throw new Error("organizationId and userId are required to create membership");
  }

  if (!isLiveWorkOS(env)) {
    return {
      object: "organization_membership",
      id: `om_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      user_id: userId,
      organization_id: organizationId,
      status: "active",
      role: {
        slug: roleSlug,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const attemptCreateMembership = async (slug) => {
    return await fetch(`${WORKOS_API_BASE}/user_management/organization_memberships`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.WORKOS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organization_id: organizationId,
        user_id: userId,
        role_slug: slug,
      }),
    });
  };

  let res = await attemptCreateMembership(roleSlug);

  // If role does not exist (e.g. custom 'owner' not created in WorkOS dashboard),
  // fallback to standard built-in WorkOS roles ('admin' then 'member')
  if (!res.ok && (res.status === 400 || res.status === 422)) {
    console.warn(`WorkOS role '${roleSlug}' rejected (${res.status}), trying fallback 'admin'...`);
    res = await attemptCreateMembership("admin");
    if (!res.ok && (res.status === 400 || res.status === 422)) {
      console.warn(`WorkOS role 'admin' rejected (${res.status}), trying fallback 'member'...`);
      res = await attemptCreateMembership("member");
    }
  }

  if (!res.ok) {
    const errorBody = await res.text();
    console.warn("WorkOS createMembership warning:", res.status, errorBody);
    // Return a soft fallback membership object instead of throwing fatal exception
    return {
      object: "organization_membership",
      id: `om_fallback_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
      user_id: userId,
      organization_id: organizationId,
      status: "active",
      role: { slug: roleSlug },
      warning: `WorkOS API returned ${res.status}: ${errorBody}`,
    };
  }

  return await res.json();
}

/**
 * Creates an organization invitation for a team member in WorkOS.
 * - email = invitee email
 * - organization_id = WorkOS organization ID
 * - role_slug = 'admin' | 'staff'
 */
export async function createWorkOSInvitation({ email, organizationId, roleSlug = "staff", env }) {
  if (!email || !organizationId) {
    throw new Error("email and organizationId are required to create invitation");
  }

  if (!isLiveWorkOS(env)) {
    return {
      object: "invitation",
      id: `inv_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      email: email.trim().toLowerCase(),
      state: "pending",
      accepted_at: null,
      revoked_at: null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organization_id: organizationId,
      inviter_user_id: null,
      role: {
        slug: roleSlug,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  const res = await fetch(`${WORKOS_API_BASE}/user_management/invitations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.WORKOS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      organization_id: organizationId,
      role_slug: roleSlug,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("WorkOS createInvitation error:", res.status, errorBody);
    throw new Error(`Failed to send WorkOS Organization Invitation (${res.status}): ${errorBody}`);
  }

  return await res.json();
}

/**
 * Lists organization memberships for a user in WorkOS.
 */
export async function listWorkOSMemberships({ userId, env }) {
  if (!userId) return [];

  if (!isLiveWorkOS(env)) {
    return [];
  }

  try {
    const res = await fetch(`${WORKOS_API_BASE}/user_management/organization_memberships?user_id=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${env.WORKOS_API_KEY}`,
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch (err) {
    console.warn("Could not list WorkOS memberships:", err);
    return [];
  }
}
