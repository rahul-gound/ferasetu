// FeraSetu Pro — Four Advanced Premium Multi-Page Templates
// =============================================================================
// Production-quality, multi-page website designs:
// 1. Studio       — Creative agency / studio showcase with client proofing portal
// 2. Launch       — Technology / product launch with interactive hardware specs & pre-order
// 3. Creator      — Digital creator / indie brand with member-only vault & drops
// 4. Commerce Pro — Premium flagship D2C commerce with wholesale B2B inquiries & customer hub
// =============================================================================

import { migratePageDocument } from '../pro/pageModel.js';

export const PRO_TEMPLATES = {
  // ---------------------------------------------------------------------------
  // 1. STUDIO (Creative Agency / Showcase)
  // ---------------------------------------------------------------------------
  studio: {
    id: "studio",
    name: "Studio",
    tagline: "High-end design & creative engineering agency",
    category: "Agency & Portfolio",
    description: "Designed for boutique design practices, architectural ateliers, and creative studios. Features an editorial showcase, client proofing portal, and dynamic project showcase.",
    theme: {
      primaryColor: "#0A0A0A",
      accentColor: "#E11D48",
      backgroundColor: "#FAFAFA",
      fontFamily: "Space Grotesk, Inter, sans-serif",
      borderRadius: "4px",
    },
    navigation: {
      header: [
        { label: "Home", path: "/" },
        { label: "Work", path: "/work" },
        { label: "Projects", path: "/projects" },
        { label: "About", path: "/about" },
        { label: "Contact", path: "/contact" },
        { label: "Client Portal", path: "/client-portal", auth_required: 1 },
      ],
      footer: [
        { label: "Overview", path: "/" },
        { label: "Archive", path: "/work" },
        { label: "Client Login", path: "/login" },
        { label: "Sign Up", path: "/signup" },
        { label: "Privacy Policy", path: "/privacy" },
      ],
    },
    pages: [
      {
        slug: "home",
        title: "Studio — Creative Architecture & Design",
        is_homepage: 1,
        type: "standard",
        auth_required: 0,
        content: {
          hero: {
            title: "We architect tactile brands and enduring physical artefacts.",
            subtitle: "An independent design practice operating at the confluence of industrial design, digital interfaces, and spatial experiences.",
            ctaText: "Explore Projects",
            ctaLink: "/work",
          },
          sections: [
            { type: "editorial_manifesto", heading: "Disciplines", items: ["Brand Architecture", "Industrial Design", "Full-Stack Software", "Retail Environments"] },
            { type: "curated_work_grid", bound_function: "getFeaturedProjects", limit: 6 },
            { type: "client_accolades", logos: ["Acme Corp", "Loom & Spindle", "Vanguard Audio", "Komorebi Living"] },
            { type: "inquiry_banner", heading: "Initiate an Engagement", buttonText: "Contact Studio", buttonLink: "/contact" },
          ],
        },
      },
      {
        slug: "work",
        title: "Selected Works (2024–2026)",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [
            { type: "portfolio_index", bound_function: "getFeaturedProjects" },
          ],
        },
      },
      {
        slug: "projects",
        title: "Projects & Artefacts",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [
            { type: "product_grid", heading: "Studio Artefacts for Purchase", bound_function: "getFeaturedProjects" },
          ],
        },
      },
      {
        slug: "about",
        title: "Ethos & Team",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [
            { type: "rich_text", title: "Our Ethos", body: "We believe exceptional products demand unified design and engineering rigor. Every touchpoint is deliberated." },
            { type: "team_roster", members: [{ name: "Ananya Roy", role: "Principal Partner" }, { name: "Kabir Mehta", role: "Design Lead" }] },
          ],
        },
      },
      {
        slug: "contact",
        title: "Direct Inquiries",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [
            { type: "contact_form", bound_function: "sendContactMessage" },
          ],
        },
      },
      {
        slug: "login",
        title: "Client Portal Login",
        type: "auth_login",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_login_box", redirect: "/client-portal" }],
        },
      },
      {
        slug: "signup",
        title: "Create Client Account",
        type: "auth_signup",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_signup_box", redirect: "/client-portal" }],
        },
      },
      {
        slug: "client-portal",
        title: "Protected Client Proofing & Invoices",
        type: "protected",
        auth_required: 1,
        content: {
          sections: [
            { type: "client_dashboard", bound_function: "getClientPortalData" },
          ],
        },
      },
      {
        slug: "account",
        title: "My Account",
        type: "auth_account",
        auth_required: 1,
        content: {
          sections: [{ type: "customer_account_manager" }],
        },
      },
    ],
    routes: [
      { path_pattern: "/", page_slug: "home", access_level: "public" },
      { path_pattern: "/work", page_slug: "work", access_level: "public" },
      { path_pattern: "/projects", page_slug: "projects", access_level: "public" },
      { path_pattern: "/projects/:slug", page_slug: "projects", access_level: "public" },
      { path_pattern: "/about", page_slug: "about", access_level: "public" },
      { path_pattern: "/contact", page_slug: "contact", access_level: "public", function_binding: "sendContactMessage" },
      { path_pattern: "/login", page_slug: "login", access_level: "public" },
      { path_pattern: "/signup", page_slug: "signup", access_level: "public" },
      { path_pattern: "/client-portal", page_slug: "client-portal", access_level: "authenticated", function_binding: "getClientPortalData" },
      { path_pattern: "/account", page_slug: "account", access_level: "authenticated" },
    ],
    functions: [
      {
        name: "getFeaturedProjects",
        description: "Fetches live curated products and design artefacts",
        capabilities: ["products.read"],
        code: `function getFeaturedProjects() {
  return products.list({ limit: 12, featured: true });
}`,
      },
      {
        name: "sendContactMessage",
        description: "Dispatches client engagement inquiries to studio email",
        capabilities: ["email.send"],
        code: `function sendContactMessage(input) {
  return email.send({
    template: "studio-inquiry",
    subject: "New Studio Client Engagement Request",
    data: input
  });
}`,
      },
      {
        name: "getClientPortalData",
        description: "Fetches authenticated client orders and active proofs",
        capabilities: ["auth.read", "orders.read", "auth.required"],
        code: `function getClientPortalData() {
  auth.requireAuth();
  const customer = auth.currentUser();
  return {
    customer: customer,
    orders: orders.list({ limit: 10 })
  };
}`,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. LAUNCH (Tech & Hardware Product Launch)
  // ---------------------------------------------------------------------------
  launch: {
    id: "launch",
    name: "Launch",
    tagline: "High-impact hardware and tech product debut",
    category: "Hardware & Technology",
    description: "Built for bold product drops, hardware kickoffs, and next-gen devices. Complete with technical specifications, backer portal, and live pre-order flows.",
    theme: {
      primaryColor: "#2563EB",
      accentColor: "#F59E0B",
      backgroundColor: "#0F172A",
      fontFamily: "Inter, system-ui, sans-serif",
      borderRadius: "8px",
    },
    navigation: {
      header: [
        { label: "Overview", path: "/" },
        { label: "Product", path: "/products" },
        { label: "Features", path: "/features" },
        { label: "Specifications", path: "/specifications" },
        { label: "Pricing", path: "/pricing" },
        { label: "FAQ", path: "/faq" },
        { label: "Backer Portal", path: "/account", auth_required: 1 },
      ],
      footer: [
        { label: "Pre-order Now", path: "/products" },
        { label: "Backer Login", path: "/login" },
        { label: "Register Account", path: "/signup" },
        { label: "Contact Support", path: "/contact" },
      ],
    },
    pages: [
      {
        slug: "home",
        title: "Aether Pro — Next Generation Acoustic Monitor",
        is_homepage: 1,
        type: "standard",
        auth_required: 0,
        content: {
          hero: {
            title: "Precision Acoustic Fidelity. Engineered for Creators.",
            subtitle: "Custom 40mm planar magnetic drivers, ultra-low latency wireless, and 48-hour battery longevity.",
            ctaText: "Pre-Order Bundle",
            ctaLink: "/products",
          },
          sections: [
            { type: "feature_matrix", bound_function: "getProductSpecs" },
            { type: "hardware_interactive_specs", items: ["Planar Magnetic", "Zero-Latency RF", "Machined Titanium Chassis"] },
            { type: "preorder_strip", bound_function: "getFeaturedProducts" },
          ],
        },
      },
      {
        slug: "products",
        title: "Product Pre-order Editions",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "product_grid", bound_function: "getFeaturedProducts" }],
        },
      },
      {
        slug: "features",
        title: "Engineering Breakthroughs",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "feature_breakdown", bound_function: "getProductSpecs" }],
        },
      },
      {
        slug: "specifications",
        title: "Technical Specifications",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "spec_table", bound_function: "getProductSpecs" }],
        },
      },
      {
        slug: "pricing",
        title: "Pre-order Pricing & Bundles",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "pricing_tiers", bound_function: "getFeaturedProducts" }],
        },
      },
      {
        slug: "faq",
        title: "Frequently Asked Questions",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "faq_accordion" }],
        },
      },
      {
        slug: "contact",
        title: "Support & Press Inquiries",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "contact_form", bound_function: "sendContactMessage" }],
        },
      },
      {
        slug: "login",
        title: "Backer Login",
        type: "auth_login",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_login_box", redirect: "/account" }],
        },
      },
      {
        slug: "signup",
        title: "Backer Registration",
        type: "auth_signup",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_signup_box", redirect: "/account" }],
        },
      },
      {
        slug: "account",
        title: "Backer Dashboard & Firmware Hub",
        type: "protected",
        auth_required: 1,
        content: {
          sections: [{ type: "backer_dashboard" }],
        },
      },
    ],
    routes: [
      { path_pattern: "/", page_slug: "home", access_level: "public" },
      { path_pattern: "/products", page_slug: "products", access_level: "public", function_binding: "getFeaturedProducts" },
      { path_pattern: "/products/:slug", page_slug: "products", access_level: "public" },
      { path_pattern: "/features", page_slug: "features", access_level: "public" },
      { path_pattern: "/specifications", page_slug: "specifications", access_level: "public", function_binding: "getProductSpecs" },
      { path_pattern: "/pricing", page_slug: "pricing", access_level: "public" },
      { path_pattern: "/faq", page_slug: "faq", access_level: "public" },
      { path_pattern: "/contact", page_slug: "contact", access_level: "public", function_binding: "sendContactMessage" },
      { path_pattern: "/login", page_slug: "login", access_level: "public" },
      { path_pattern: "/signup", page_slug: "signup", access_level: "public" },
      { path_pattern: "/account", page_slug: "account", access_level: "authenticated" },
    ],
    functions: [
      {
        name: "getFeaturedProducts",
        description: "Fetches launch product bundles",
        capabilities: ["products.read"],
        code: `function getFeaturedProducts() {
  return products.list({ limit: 6 });
}`,
      },
      {
        name: "getProductSpecs",
        description: "Returns authoritative hardware engineering specifications",
        capabilities: ["storage.read"],
        code: `function getProductSpecs() {
  return {
    frequency_response: "5Hz - 45,000Hz",
    impedance: "32 Ohms",
    driver_size: "40mm Planar Magnetic",
    battery_life_hours: 48,
    connectivity: ["2.4GHz Low-Latency", "Bluetooth 5.4", "USB-C Lossless 24-bit/96kHz"]
  };
}`,
      },
      {
        name: "sendContactMessage",
        description: "Handles press and backer support messages",
        capabilities: ["email.send"],
        code: `function sendContactMessage(input) {
  return email.send({
    template: "backer-support",
    subject: "Hardware Support Inquiry",
    data: input
  });
}`,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. CREATOR (Digital Goods & Member-Only Vault)
  // ---------------------------------------------------------------------------
  creator: {
    id: "creator",
    name: "Creator",
    tagline: "Digital goods, exclusive drops, and member community",
    category: "Media & Digital Commerce",
    description: "Tailored for digital creators, writers, educators, and indie brands. Provides gated members-only content, digital downloads, and dynamic drops.",
    theme: {
      primaryColor: "#7C3AED",
      accentColor: "#10B981",
      backgroundColor: "#FFFFFF",
      fontFamily: "Plus Jakarta Sans, Inter, sans-serif",
      borderRadius: "12px",
    },
    navigation: {
      header: [
        { label: "Home", path: "/" },
        { label: "Drops", path: "/products" },
        { label: "Content", path: "/content" },
        { label: "Members Vault", path: "/members", auth_required: 1 },
        { label: "About", path: "/about" },
        { label: "Account", path: "/account", auth_required: 1 },
      ],
      footer: [
        { label: "Latest Drops", path: "/products" },
        { label: "Join Membership", path: "/signup" },
        { label: "Member Login", path: "/login" },
        { label: "Contact", path: "/contact" },
      ],
    },
    pages: [
      {
        slug: "home",
        title: "Creator Collective — Curated Digital Drops",
        is_homepage: 1,
        type: "standard",
        auth_required: 0,
        content: {
          hero: {
            title: "Thoughtfully crafted toolkits for ambitious builders.",
            subtitle: "Design systems, audio soundscapes, and comprehensive masterclasses delivered straight to your creative workflow.",
            ctaText: "Explore Drops",
            ctaLink: "/products",
          },
          sections: [
            { type: "drop_countdown", heading: "Next Drop Incoming", bound_function: "getLatestDrops" },
            { type: "featured_catalog", bound_function: "getLatestDrops" },
            { type: "member_tier_card", heading: "Unlock The Vault", ctaLink: "/signup" },
          ],
        },
      },
      {
        slug: "products",
        title: "Digital Drops & Assets",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "product_grid", bound_function: "getLatestDrops" }],
        },
      },
      {
        slug: "content",
        title: "Essays & Tutorials",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "blog_index" }],
        },
      },
      {
        slug: "members",
        title: "Protected Member Vault & Downloads",
        type: "protected",
        auth_required: 1,
        content: {
          sections: [{ type: "member_vault", bound_function: "getMemberVaultResources" }],
        },
      },
      {
        slug: "about",
        title: "Behind The Craft",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "rich_text", title: "Why We Build", body: "Empowering indie makers with uncompromising production toolkits." }],
        },
      },
      {
        slug: "contact",
        title: "Collaborations & Inquiries",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "contact_form", bound_function: "sendContactMessage" }],
        },
      },
      {
        slug: "login",
        title: "Member Login",
        type: "auth_login",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_login_box", redirect: "/members" }],
        },
      },
      {
        slug: "signup",
        title: "Join Creator Membership",
        type: "auth_signup",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_signup_box", redirect: "/members" }],
        },
      },
      {
        slug: "account",
        title: "Member Profile & Downloads",
        type: "auth_account",
        auth_required: 1,
        content: {
          sections: [{ type: "customer_account_manager" }],
        },
      },
    ],
    routes: [
      { path_pattern: "/", page_slug: "home", access_level: "public" },
      { path_pattern: "/products", page_slug: "products", access_level: "public", function_binding: "getLatestDrops" },
      { path_pattern: "/products/:slug", page_slug: "products", access_level: "public" },
      { path_pattern: "/content", page_slug: "content", access_level: "public" },
      { path_pattern: "/blog/:slug", page_slug: "content", access_level: "public" },
      { path_pattern: "/members", page_slug: "members", access_level: "authenticated", function_binding: "getMemberVaultResources" },
      { path_pattern: "/about", page_slug: "about", access_level: "public" },
      { path_pattern: "/contact", page_slug: "contact", access_level: "public", function_binding: "sendContactMessage" },
      { path_pattern: "/login", page_slug: "login", access_level: "public" },
      { path_pattern: "/signup", page_slug: "signup", access_level: "public" },
      { path_pattern: "/account", page_slug: "account", access_level: "authenticated" },
    ],
    functions: [
      {
        name: "getLatestDrops",
        description: "Returns newest digital asset drops",
        capabilities: ["products.read"],
        code: `function getLatestDrops() {
  return products.list({ limit: 8 });
}`,
      },
      {
        name: "getMemberVaultResources",
        description: "Gated access to high-resolution asset downloads and masterclass stems",
        capabilities: ["auth.read", "auth.required", "storage.read"],
        code: `function getMemberVaultResources() {
  auth.requireAuth();
  return {
    vault_status: "active",
    resources: [
      { id: "res_1", title: "Cinematic LUT Pack 2026 (ProRes)", download_url: "/cdn/members/luts.zip" },
      { id: "res_2", title: "Spatial Audio Sound Kit Vol. 3 (FLAC)", download_url: "/cdn/members/audio.zip" },
      { id: "res_3", title: "Complete Figma Design System Token Kit", download_url: "/cdn/members/design-tokens.fig" }
    ]
  };
}`,
      },
      {
        name: "sendContactMessage",
        description: "Direct creator collab inquiries",
        capabilities: ["email.send"],
        code: `function sendContactMessage(input) {
  return email.send({
    template: "creator-collab",
    subject: "New Creator Collaboration Proposal",
    data: input
  });
}`,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. COMMERCE PRO (Flagship Direct-to-Consumer Commerce)
  // ---------------------------------------------------------------------------
  commerce_pro: {
    id: "commerce_pro",
    name: "Commerce Pro",
    tagline: "Enterprise D2C flagship storefront with wholesale B2B inquiries",
    category: "Full-Scale Retail & Commerce",
    description: "The complete commerce powerhouse. Nested categories, dynamic SKU pages, wholesale bulk inquiries, customer order tracking, and high-conversion checkout.",
    theme: {
      primaryColor: "#059669",
      accentColor: "#D97706",
      backgroundColor: "#FFFFFF",
      fontFamily: "Outfit, Inter, sans-serif",
      borderRadius: "6px",
    },
    navigation: {
      header: [
        { label: "Home", path: "/" },
        { label: "Shop", path: "/products" },
        { label: "Categories", path: "/categories" },
        { label: "Wholesale B2B", path: "/wholesale" },
        { label: "About", path: "/about" },
        { label: "My Orders", path: "/orders", auth_required: 1 },
      ],
      footer: [
        { label: "All Products", path: "/products" },
        { label: "Wholesale Portal", path: "/wholesale" },
        { label: "Customer Sign In", path: "/login" },
        { label: "Create Account", path: "/signup" },
        { label: "Order Tracking", path: "/orders" },
        { label: "Contact Us", path: "/contact" },
      ],
    },
    pages: [
      {
        slug: "home",
        title: "Flagship Storefront — Premium Retail",
        is_homepage: 1,
        type: "standard",
        auth_required: 0,
        content: {
          hero: {
            title: "Artisanal Integrity. Uncompromised Quality.",
            subtitle: "Direct-to-consumer goods sourced with ethical transparency and crafted for longevity.",
            ctaText: "Shop Collection",
            ctaLink: "/products",
          },
          sections: [
            { type: "category_strip", categories: ["Apparel", "Living", "Gourmet", "Handcrafted"] },
            { type: "product_grid", heading: "Bestselling Essentials", bound_function: "getFeaturedProducts" },
            { type: "wholesale_banner", ctaLink: "/wholesale" },
            { type: "reviews_carousel", reviews: [{ author: "Vikram S.", rating: 5, comment: "Exceptional craftsmanship and swift fulfillment." }] },
          ],
        },
      },
      {
        slug: "products",
        title: "All Products & Collections",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "product_catalog", bound_function: "getFeaturedProducts" }],
        },
      },
      {
        slug: "categories",
        title: "Explore by Category",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "category_grid" }],
        },
      },
      {
        slug: "wholesale",
        title: "Wholesale B2B & Bulk Orders",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "bulk_inquiry_form", bound_function: "createBulkInquiry" }],
        },
      },
      {
        slug: "about",
        title: "Our Heritage & Quality Standards",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "rich_text", title: "Handcrafted Heritage", body: "Directly partnering with master artisans and sustainable mills." }],
        },
      },
      {
        slug: "contact",
        title: "Customer Support & Concierge",
        type: "standard",
        auth_required: 0,
        content: {
          sections: [{ type: "contact_form", bound_function: "sendContactMessage" }],
        },
      },
      {
        slug: "login",
        title: "Customer Sign In",
        type: "auth_login",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_login_box", redirect: "/account" }],
        },
      },
      {
        slug: "signup",
        title: "Customer Registration",
        type: "auth_signup",
        auth_required: 0,
        content: {
          sections: [{ type: "auth_signup_box", redirect: "/account" }],
        },
      },
      {
        slug: "account",
        title: "Customer Hub & Saved Addresses",
        type: "auth_account",
        auth_required: 1,
        content: {
          sections: [{ type: "customer_account_manager" }],
        },
      },
      {
        slug: "orders",
        title: "My Orders & Real-time Tracking",
        type: "protected",
        auth_required: 1,
        content: {
          sections: [{ type: "order_history_view" }],
        },
      },
    ],
    routes: [
      { path_pattern: "/", page_slug: "home", access_level: "public" },
      { path_pattern: "/products", page_slug: "products", access_level: "public", function_binding: "getFeaturedProducts" },
      { path_pattern: "/products/:slug", page_slug: "products", access_level: "public" },
      { path_pattern: "/categories", page_slug: "categories", access_level: "public" },
      { path_pattern: "/wholesale", page_slug: "wholesale", access_level: "public", function_binding: "createBulkInquiry" },
      { path_pattern: "/about", page_slug: "about", access_level: "public" },
      { path_pattern: "/contact", page_slug: "contact", access_level: "public", function_binding: "sendContactMessage" },
      { path_pattern: "/login", page_slug: "login", access_level: "public" },
      { path_pattern: "/signup", page_slug: "signup", access_level: "public" },
      { path_pattern: "/account", page_slug: "account", access_level: "authenticated" },
      { path_pattern: "/orders", page_slug: "orders", access_level: "authenticated" },
      { path_pattern: "/orders/:id", page_slug: "orders", access_level: "authenticated" },
    ],
    functions: [
      {
        name: "getFeaturedProducts",
        description: "Returns catalog products with live stock counts",
        capabilities: ["products.read"],
        code: `function getFeaturedProducts() {
  return products.list({ limit: 16 });
}`,
      },
      {
        name: "createBulkInquiry",
        description: "Submits verified wholesale inquiry and dispatches notification",
        capabilities: ["customers.inquiry.create", "email.send"],
        code: `function createBulkInquiry(input) {
  customers.createInquiry({
    product_id: input.product_id,
    quantity: input.quantity,
    message: input.message
  });
  return email.send({
    template: "wholesale-inquiry",
    subject: "New B2B Wholesale Bulk Inquiry",
    data: input
  });
}`,
      },
      {
        name: "createCustomerOrder",
        description: "Processes checkout and records customer order",
        capabilities: ["orders.create", "auth.required"],
        code: `function createCustomerOrder(orderData) {
  auth.requireAuth();
  return orders.create({
    items: orderData.items,
    delivery_type: orderData.delivery_type,
    notes: orderData.notes
  });
}`,
      },
      {
        name: "sendContactMessage",
        description: "Customer service inquiry forwarding",
        capabilities: ["email.send"],
        code: `function sendContactMessage(input) {
  return email.send({
    template: "customer-contact",
    subject: "Storefront Customer Message",
    data: input
  });
}`,
      },
    ],
  },
};

/**
 * Installs a Pro template into a merchant's site.
 * Seeds pages, routes, functions, and navigation.
 */
export async function installProTemplate(tenantId, templateId, env) {
  const template = PRO_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  // 1. Clear or overwrite draft pages & routes
  const pageMap = {};

  // Insert Pages
  for (let i = 0; i < template.pages.length; i++) {
    const p = template.pages[i];
    const pageId = `page_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    pageMap[p.slug] = pageId;

    let pageContentStr = JSON.stringify(p.content);
    try {
      const pageDoc = migratePageDocument({ ...p.content, title: p.title });
      if (pageDoc && pageDoc.nodes && pageDoc.nodes.length > 0) {
        pageContentStr = JSON.stringify(pageDoc);
      }
    } catch {}

    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO site_pages (
        id, tenant_id, slug, title, type, content, status, is_homepage, auth_required, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, slug) DO UPDATE SET
        title = excluded.title,
        type = excluded.type,
        content = excluded.content,
        is_homepage = excluded.is_homepage,
        auth_required = excluded.auth_required,
        order_index = excluded.order_index,
        updated_at = excluded.updated_at
    `).bind(
      pageId, tenantId, p.slug, p.title, p.type, pageContentStr,
      p.is_homepage ? 1 : 0, p.auth_required ? 1 : 0, i, now, now
    ).run();

    // Query back actual ID in case of conflict
    const row = await env.DB.prepare("SELECT id FROM site_pages WHERE tenant_id = ? AND slug = ?").bind(tenantId, p.slug).first();
    if (row?.id) pageMap[p.slug] = row.id;
  }

  // Insert Routes
  for (const r of template.routes) {
    const pageId = pageMap[r.page_slug];
    if (!pageId) continue;
    const routeId = `route_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO site_routes (
        id, tenant_id, path_pattern, page_id, access_level, function_binding, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
      ON CONFLICT(tenant_id, path_pattern) DO UPDATE SET
        page_id = excluded.page_id,
        access_level = excluded.access_level,
        function_binding = excluded.function_binding,
        updated_at = excluded.updated_at
    `).bind(
      routeId, tenantId, r.path_pattern, pageId, r.access_level, r.function_binding || null, now, now
    ).run();
  }

  // Insert Functions
  for (const f of template.functions) {
    const funcId = `func_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const defJson = JSON.stringify({ source: f.code });

    await env.DB.prepare(`
      INSERT INTO site_functions (
        id, tenant_id, name, description, definition, capabilities, status, version, timeout_ms, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', 1, 1500, ?, ?)
      ON CONFLICT(tenant_id, name) DO UPDATE SET
        description = excluded.description,
        definition = excluded.definition,
        capabilities = excluded.capabilities,
        updated_at = excluded.updated_at
    `).bind(
      funcId, tenantId, f.name, f.description, defJson, JSON.stringify(f.capabilities), now, now
    ).run();
  }

  // Insert Navigation
  const navIdHeader = `nav_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const navIdFooter = `nav_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO site_navigation (id, tenant_id, menu_location, items, status, created_at, updated_at)
    VALUES (?, ?, 'header', ?, 'draft', ?, ?)
    ON CONFLICT(tenant_id, menu_location) DO UPDATE SET items = excluded.items, updated_at = excluded.updated_at
  `).bind(navIdHeader, tenantId, JSON.stringify(template.navigation.header), now, now).run();

  await env.DB.prepare(`
    INSERT INTO site_navigation (id, tenant_id, menu_location, items, status, created_at, updated_at)
    VALUES (?, ?, 'footer', ?, 'draft', ?, ?)
    ON CONFLICT(tenant_id, menu_location) DO UPDATE SET items = excluded.items, updated_at = excluded.updated_at
  `).bind(navIdFooter, tenantId, JSON.stringify(template.navigation.footer), now, now).run();

  return {
    success: true,
    template_id: templateId,
    pages_installed: template.pages.length,
    routes_installed: template.routes.length,
    functions_installed: template.functions.length,
  };
}
