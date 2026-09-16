// FeraSetu Pro — AI Builder Structured Actions Engine
// =============================================================================
// Translates natural language instructions into validated, atomic operations:
// - create_page, update_page, delete_page, duplicate_page
// - create_route, update_route, delete_route
// - create_function, update_function, delete_function, connect_function
// - create_navigation, update_navigation
// - apply_template, publish
//
// Never executes arbitrary code. All operations pass through proPlatformService.
// =============================================================================

import * as proService from '../services/proPlatformService.js';
import { installProTemplate } from '../templates/proTemplates.js';

export const SUPPORTED_ACTIONS = [
  'create_page',
  'update_page',
  'delete_page',
  'duplicate_page',
  'create_route',
  'update_route',
  'delete_route',
  'create_function',
  'update_function',
  'delete_function',
  'connect_function',
  'create_navigation',
  'update_navigation',
  'apply_template',
  'publish',
];

/**
 * Parses a merchant's natural language request into structured operations.
 *
 * @param {string} promptText
 * @param {Object} [siteContext]
 * @returns {Array<Object>} List of planned operations
 */
export function parseAIPromptToActions(promptText, siteContext = {}) {
  const p = (promptText || "").toLowerCase().trim();
  const actions = [];

  // 1. Template application
  if (p.includes("apply") && (p.includes("template") || p.includes("studio") || p.includes("launch") || p.includes("creator") || p.includes("commerce"))) {
    let templateId = "commerce_pro";
    if (p.includes("studio")) templateId = "studio";
    else if (p.includes("launch")) templateId = "launch";
    else if (p.includes("creator")) templateId = "creator";

    actions.push({
      action: "apply_template",
      title: `Apply ${templateId} template`,
      risk: "medium",
      params: { template_id: templateId },
      description: `Install the full multi-page ${templateId} setup including pages, routes, functions, and navigation.`,
    });
    return actions;
  }

  // 2. Publish request
  if (p.includes("publish") && (p.includes("site") || p.includes("changes") || p.includes("now") || p.length < 15)) {
    actions.push({
      action: "publish",
      title: "Publish website changes",
      risk: "low",
      params: {},
      description: "Validate site integrity and publish current draft state atomically.",
    });
    return actions;
  }

  // 3. Wholesale / Bulk Inquiry page
  if (p.includes("wholesale") || (p.includes("bulk") && p.includes("inquiry"))) {
    actions.push({
      action: "create_page",
      title: "Create Wholesale page",
      risk: "low",
      params: {
        title: "Wholesale B2B & Bulk Inquiries",
        slug: "wholesale",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [
            { type: "wholesale_banner", heading: "B2B Volume Pricing & Custom Orders" },
            { type: "bulk_inquiry_form", bound_function: "createBulkInquiry" },
          ],
        },
      },
      description: "Create a dedicated wholesale inquiries page with a bulk ordering form.",
    });

    actions.push({
      action: "create_function",
      title: "Create createBulkInquiry function",
      risk: "low",
      params: {
        name: "createBulkInquiry",
        description: "Records verified bulk inquiry and notifies the merchant",
        capabilities: ["customers.inquiry.create", "email.send"],
        code: `function createBulkInquiry(input) {
  customers.createInquiry({
    product_id: input.product_id,
    quantity: input.quantity,
    message: input.message
  });
  return email.send({
    template: "wholesale-inquiry",
    subject: "New Wholesale Bulk Order Inquiry",
    data: input
  });
}`,
      },
      description: "Define a safe Fera Function to handle inquiries and email notifications.",
    });

    actions.push({
      action: "connect_function",
      title: "Connect function to Wholesale route",
      risk: "low",
      params: {
        page_slug: "wholesale",
        function_name: "createBulkInquiry",
      },
      description: "Bind createBulkInquiry to the /wholesale route.",
    });

    return actions;
  }

  // 4. Protected Customer Dashboard / Portal
  if (p.includes("protected") && (p.includes("dashboard") || p.includes("portal") || p.includes("account") || p.includes("customer"))) {
    actions.push({
      action: "create_page",
      title: "Create Protected Customer Dashboard",
      risk: "low",
      params: {
        title: "Customer Dashboard",
        slug: "dashboard",
        type: "protected",
        auth_required: 1,
        content: {
          sections: [
            { type: "customer_dashboard_header" },
            { type: "order_history_view" },
          ],
        },
      },
      description: "Create a page that requires customer login to view.",
    });

    actions.push({
      action: "create_route",
      title: "Create /dashboard protected route",
      risk: "low",
      params: {
        path_pattern: "/dashboard",
        access_level: "authenticated",
      },
      description: "Enforce authenticated customer access for /dashboard.",
    });

    return actions;
  }

  // 5. Dynamic route (e.g. /products/:slug or /orders/:id)
  if (p.includes("/products/:slug") || (p.includes("dynamic") && p.includes("product"))) {
    actions.push({
      action: "create_route",
      title: "Add /products/:slug dynamic route",
      risk: "low",
      params: {
        path_pattern: "/products/:slug",
        access_level: "public",
        function_binding: "getProductDetail",
      },
      description: "Set up dynamic routing for individual product detail pages.",
    });

    actions.push({
      action: "create_function",
      title: "Create getProductDetail function",
      risk: "low",
      params: {
        name: "getProductDetail",
        description: "Fetches product by route slug",
        capabilities: ["products.read"],
        code: `function getProductDetail(args) {
  return products.get(args.params.slug);
}`,
      },
      description: "Define Fera Function to fetch product details using route parameters.",
    });

    return actions;
  }

  // 6. Contact Form & Email notification
  if (p.includes("contact") && (p.includes("email") || p.includes("message") || p.includes("form"))) {
    actions.push({
      action: "create_function",
      title: "Create sendContactMessage function",
      risk: "low",
      params: {
        name: "sendContactMessage",
        description: "Sends contact form submissions via email",
        capabilities: ["email.send"],
        code: `function sendContactMessage(input) {
  return email.send({
    template: "contact-form",
    subject: "New Customer Contact Message",
    data: input
  });
}`,
      },
      description: "Create email notification function for contact inquiries.",
    });

    actions.push({
      action: "create_page",
      title: "Create Contact page",
      risk: "low",
      params: {
        title: "Contact Us",
        slug: "contact",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "contact_form", bound_function: "sendContactMessage" }],
        },
      },
      description: "Create /contact page bound to sendContactMessage.",
    });

    return actions;
  }

  // 7. About Page
  if (p.includes("about") || p.includes("story")) {
    actions.push({
      action: "create_page",
      title: "Create About page",
      risk: "low",
      params: {
        title: "About Our Store",
        slug: "about",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [
            { type: "rich_text", title: "Our Story", body: "We believe in exceptional craftsmanship and authentic service." },
          ],
        },
      },
      description: "Create an About Us page with brand ethos and story.",
    });
    return actions;
  }

  // Generic fallback: create custom page
  const cleanTitle = promptText.slice(0, 40).replace(/[^a-zA-Z0-9\s]/g, "").trim() || "Custom Page";
  const slug = cleanTitle.toLowerCase().replace(/\s+/g, "-");

  actions.push({
    action: "create_page",
    title: `Create ${cleanTitle} page`,
    risk: "low",
    params: {
      title: cleanTitle,
      slug,
      type: "standard",
      auth_required: 0,
      content: { sections: [{ type: "rich_text", title: cleanTitle, body: "Page content." }] },
    },
    description: `Create page '${cleanTitle}' at /${slug}.`,
  });

  return actions;
}

/**
 * Executes an array of planned AI actions sequentially.
 */
export async function executePlannedAIActions(tenantId, actions, env) {
  const executed = [];

  for (const item of actions) {
    if (item.action === 'apply_template') {
      const res = await installProTemplate(tenantId, item.params.template_id, env);
      executed.push({ action: item.action, result: res });
    } else {
      const res = await proService.executeAIAction(tenantId, item.action, item.params, env);
      executed.push({ action: item.action, result: res });
    }
  }

  return executed;
}
