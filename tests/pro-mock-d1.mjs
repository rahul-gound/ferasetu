// FeraSetu Pro — In-Memory Mock D1 Database for Test Suites
// =============================================================================

export function createProMockD1() {
  const tables = {
    users: [
      { id: 'usr_free', email: 'free@example.com', name: 'Free Merchant', plan: 'free' },
      { id: 'usr_business', email: 'biz@example.com', name: 'Business Merchant', plan: 'business' },
      { id: 'usr_pro_active', email: 'pro@example.com', name: 'Pro Merchant', plan: 'pro' },
      { id: 'usr_pro_expired', email: 'pro_exp@example.com', name: 'Expired Pro Merchant', plan: 'pro' },
      { id: 'usr_pro_canceled_valid', email: 'pro_canc_val@example.com', name: 'Canceled Pro (Active Until End)', plan: 'pro' },
      { id: 'usr_pro_canceled_expired', email: 'pro_canc_exp@example.com', name: 'Canceled Pro (Past End)', plan: 'pro' },
      { id: 'usr_tenant_b', email: 'tenant_b@example.com', name: 'Tenant B Merchant', plan: 'pro' },
    ],
    subscriptions: [
      {
        id: 'sub_free',
        user_id: 'usr_free',
        organization_id: 'org_free',
        plan: 'free',
        status: 'free',
        trial_used: 0,
        cancel_at_period_end: 0,
      },
      {
        id: 'sub_business',
        user_id: 'usr_business',
        organization_id: 'org_business',
        plan: 'business',
        status: 'active',
        trial_used: 1,
        cancel_at_period_end: 0,
      },
      {
        id: 'sub_pro_active',
        user_id: 'usr_pro_active',
        organization_id: 'org_pro_active',
        plan: 'pro',
        status: 'active',
        trial_used: 1,
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancel_at_period_end: 0,
      },
      {
        id: 'sub_pro_expired',
        user_id: 'usr_pro_expired',
        organization_id: 'org_pro_expired',
        plan: 'pro',
        status: 'expired',
        trial_used: 1,
        current_period_end: new Date(Date.now() - 5 * 86400000).toISOString(),
        cancel_at_period_end: 0,
      },
      {
        id: 'sub_pro_canceled_valid',
        user_id: 'usr_pro_canceled_valid',
        organization_id: 'org_pro_canceled_valid',
        plan: 'pro',
        status: 'active',
        trial_used: 1,
        current_period_end: new Date(Date.now() + 10 * 86400000).toISOString(),
        cancel_at_period_end: 1,
      },
      {
        id: 'sub_pro_canceled_expired',
        user_id: 'usr_pro_canceled_expired',
        organization_id: 'org_pro_canceled_expired',
        plan: 'pro',
        status: 'active',
        trial_used: 1,
        current_period_end: new Date(Date.now() - 2 * 86400000).toISOString(),
        cancel_at_period_end: 1,
      },
      {
        id: 'sub_tenant_b',
        user_id: 'usr_tenant_b',
        organization_id: 'org_tenant_b',
        plan: 'pro',
        status: 'active',
        trial_used: 1,
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancel_at_period_end: 0,
      },
    ],
    organizations: [
      { id: 'org_pro_active', name: 'Pro Flagship Store', store_slug: 'proshop' },
      { id: 'org_tenant_b', name: 'Tenant B Store', store_slug: 'tenantb' },
    ],
    organization_members: [],
    products: [
      {
        id: 'prod_1',
        organization_id: 'org_pro_active',
        user_id: 'usr_pro_active',
        name: 'Heritage Silk Scarf',
        sku: 'scarf-silk-1',
        price: 1999,
        is_active: 1,
        category: 'Apparel',
      },
      {
        id: 'prod_tenant_b',
        organization_id: 'org_tenant_b',
        user_id: 'usr_tenant_b',
        name: 'Tenant B Secret Product',
        sku: 'secret-1',
        price: 9999,
        is_active: 1,
        category: 'Private',
      },
    ],
    orders: [
      {
        id: 'ord_101',
        organization_id: 'org_pro_active',
        user_id: 'usr_pro_active',
        customer_id: 'cust_alice',
        total: 1999,
        status: 'pending',
      },
      {
        id: 'ord_tenant_b',
        organization_id: 'org_tenant_b',
        user_id: 'usr_tenant_b',
        customer_id: 'cust_bob',
        total: 9999,
        status: 'pending',
      },
    ],
    site_pages: [],
    site_routes: [],
    site_functions: [],
    site_function_versions: [],
    site_navigation: [],
    site_deployments: [],
    site_quotas: [],
    site_storage: [],
    site_execution_logs: [],
    customer_sessions: [],
    site_imported_projects: [],
    site_import_versions: [],
    site_source_files: [],
    site_source_mappings: [],
    site_import_changes: [],
    site_data_sources: [],
    site_data_source_credentials: [],
    site_backup_policies: [],
    site_backup_snapshots: [],
    site_backup_items: [],
    site_backup_operations: [],
    site_restore_operations: [],
    site_export_operations: [],
  };

  const db = {
    tables,
    prepare(sql) {
      return {
        _sql: sql,
        _params: [],
        bind(...params) {
          this._params = params;
          return this;
        },
        async first() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');

          // Subscriptions
          if (s.includes('from subscriptions where user_id = ?')) {
            const row = tables.subscriptions.find(x => x.user_id === this._params[0]);
            return row ? { ...row } : null;
          }
          if (s.includes('from subscriptions where organization_id = ?')) {
            const row = tables.subscriptions.find(x => x.organization_id === this._params[0]);
            return row ? { ...row } : null;
          }

          // Users
          if (s.includes('from users where id = ?')) {
            const row = tables.users.find(x => x.id === this._params[0]);
            return row ? { ...row } : null;
          }

          // Site Pages
          if (s.includes('from site_pages where tenant_id = ? and (id = ? or slug = ?)')) {
            const row = tables.site_pages.find(x => x.tenant_id === this._params[0] && (x.id === this._params[1] || x.slug === this._params[2]));
            return row ? { ...row } : null;
          }
          if (s.includes('from site_pages where tenant_id = ? and slug = ?')) {
            const row = tables.site_pages.find(x => x.tenant_id === this._params[0] && x.slug === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_pages where id = ?')) {
            const row = tables.site_pages.find(x => x.id === this._params[0]);
            return row ? { ...row } : null;
          }
          if (s.includes('select count(*) as count from site_pages where tenant_id = ?')) {
            const cnt = tables.site_pages.filter(x => x.tenant_id === this._params[0]).length;
            return { count: cnt };
          }

          // Site Routes
          if (s.includes('from site_routes where tenant_id = ? and id = ?')) {
            const row = tables.site_routes.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('select count(*) as count from site_routes where tenant_id = ?')) {
            const cnt = tables.site_routes.filter(x => x.tenant_id === this._params[0]).length;
            return { count: cnt };
          }

          // Site Functions
          if (s.includes('from site_functions where tenant_id = ? and (id = ? or name = ?)')) {
            const row = tables.site_functions.find(x => x.tenant_id === this._params[0] && (x.id === this._params[1] || x.name === this._params[2]));
            return row ? { ...row } : null;
          }
          if (s.includes('select count(*) as count from site_functions where tenant_id = ?')) {
            const cnt = tables.site_functions.filter(x => x.tenant_id === this._params[0]).length;
            return { count: cnt };
          }

          // Site Quotas
          if (s.includes('from site_quotas where tenant_id = ?')) {
            const row = tables.site_quotas.find(x => x.tenant_id === this._params[0]);
            return row ? { ...row } : null;
          }

          // Site Deployments
          if (s.includes('from site_deployments where tenant_id = ? and status = \'published\'')) {
            const deps = tables.site_deployments
              .filter(x => x.tenant_id === this._params[0] && x.status === 'published')
              .sort((a, b) => b.version - a.version);
            return deps[0] ? { ...deps[0] } : null;
          }
          if (s.includes('from site_deployments where tenant_id = ? and version = ?')) {
            const dep = tables.site_deployments.find(x => x.tenant_id === this._params[0] && x.version === this._params[1]);
            return dep ? { ...dep } : null;
          }
          if (s.includes('from site_deployments where tenant_id = ? and id = ?')) {
            const dep = tables.site_deployments.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            return dep ? { ...dep } : null;
          }
          if (s.includes('select max(version) as max_ver from site_deployments where tenant_id = ?')) {
            const vers = tables.site_deployments.filter(x => x.tenant_id === this._params[0]).map(x => x.version);
            return { max_ver: vers.length ? Math.max(...vers) : 0 };
          }

          // Site Storage
          if (s.includes('from site_storage where tenant_id = ? and key = ?')) {
            const row = tables.site_storage.find(x => x.tenant_id === this._params[0] && x.key === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('sum(bytes_size)')) {
            const total = tables.site_storage.filter(x => x.tenant_id === this._params[0]).reduce((acc, x) => acc + (x.bytes_size || 0), 0);
            return { total_bytes: total };
          }

          // Products
          if (s.includes('from products') && s.includes('where (id = ? or sku = ?')) {
            const row = tables.products.find(x => (x.id === this._params[0] || x.sku === this._params[1] || x.name.toLowerCase() === this._params[2].toLowerCase()) && (x.organization_id === this._params[3] || x.user_id === this._params[4]));
            return row ? { ...row } : null;
          }

          // Orders
          if (s.includes('from orders where id = ?')) {
            const row = tables.orders.find(x => x.id === this._params[0] && (x.organization_id === this._params[1] || x.user_id === this._params[2]));
            return row ? { ...row } : null;
          }

          // Organizations
          if (s.includes('from organizations where id = ? or workos_organization_id = ?')) {
            const row = tables.organizations.find(x => x.id === this._params[0] || x.workos_organization_id === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from organizations where workos_organization_id = ?')) {
            const row = tables.organizations.find(x => x.workos_organization_id === this._params[0]);
            return row ? { ...row } : null;
          }
          if (s.includes('from organizations where id = ?')) {
            const row = tables.organizations.find(x => x.id === this._params[0]);
            return row ? { ...row } : null;
          }

          // Organization Members
          if (s.includes('from organization_members where organization_id = ? and user_id = ?')) {
            const row = tables.organization_members.find(x => x.organization_id === this._params[0] && x.user_id === this._params[1]);
            return row ? { ...row } : null;
          }

          // Project imports
          if (s.includes('from site_imported_projects where tenant_id = ? and (project_name = ? or name = ?)')) {
            const row = tables.site_imported_projects.find(x => x.tenant_id === this._params[0] && (x.project_name === this._params[1] || x.name === this._params[1]));
            return row ? { ...row } : null;
          }
          if (s.includes('from site_imported_projects where tenant_id = ? and project_name = ?')) {
            const row = tables.site_imported_projects.find(x => x.tenant_id === this._params[0] && (x.project_name === this._params[1] || x.name === this._params[1]));
            return row ? { ...row } : null;
          }
          if (s.includes('from site_imported_projects where tenant_id = ? and name = ?')) {
            const row = tables.site_imported_projects.find(x => x.tenant_id === this._params[0] && (x.name === this._params[1] || x.project_name === this._params[1]));
            return row ? { ...row } : null;
          }
          if (s.includes('from site_imported_projects where tenant_id = ? and id = ?')) {
            const row = tables.site_imported_projects.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_imported_projects where id = ?')) {
            const row = tables.site_imported_projects.find(x => x.id === this._params[0]);
            return row ? { ...row } : null;
          }
          if (s.includes('select max(version_number) as max_v from site_import_versions where project_id = ?')) {
            const vers = tables.site_import_versions.filter(x => x.project_id === this._params[0]).map(x => x.version_number || 0);
            return { max_v: vers.length ? Math.max(...vers) : 0 };
          }
          if (s.includes('from site_import_versions where id = ? and project_fingerprint = ? and import_status = \'committed\'')) {
            const row = tables.site_import_versions.find(x => x.id === this._params[0] && x.project_fingerprint === this._params[1] && x.import_status === 'COMMITTED');
            return row ? { ...row } : null;
          }
          if (s.includes('from site_import_versions where id = ?')) {
            const row = tables.site_import_versions.find(x => x.id === this._params[0]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_source_mappings where project_id = ? and deterministic_identity = ?')) {
            const row = tables.site_source_mappings.find(x => x.project_id === this._params[0] && x.deterministic_identity === this._params[1]);
            return row ? { ...row } : null;
          }

          // Data & Storage first() handlers
          if (s.includes('select count(*) as count from site_data_sources where tenant_id = ?')) {
            const count = tables.site_data_sources.filter(x => x.tenant_id === this._params[0]).length;
            return { count };
          }
          if (s.includes('from site_data_sources') && s.includes('tenant_id = ?') && (s.includes('id = ?') || s.includes('s.id = ?'))) {
            const row = tables.site_data_sources.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            if (!row) return null;
            const pol = tables.site_backup_policies.find(p => p.data_source_id === row.id) || {};
            return { ...row, ...pol, id: row.id, tenant_id: row.tenant_id };
          }
          if (s.includes('from site_data_sources where tenant_id = ? and name = ?')) {
            const row = tables.site_data_sources.find(x => x.tenant_id === this._params[0] && x.name === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_data_source_credentials where id = ?')) {
            const row = tables.site_data_source_credentials.find(x => x.id === this._params[0]);
            return row ? { ...row } : null;
          }
          if (s.includes('select count(*) as count from site_backup_snapshots where data_source_id = ?')) {
            const count = tables.site_backup_snapshots.filter(x => x.data_source_id === this._params[0]).length;
            return { count };
          }
          if (s.includes('from site_backup_snapshots where tenant_id = ? and id = ?')) {
            const row = tables.site_backup_snapshots.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_backup_snapshots where id = ?')) {
            const row = tables.site_backup_snapshots.find(x => x.id === this._params[0]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_backup_operations where tenant_id = ? and data_source_id = ? and status in')) {
            const row = tables.site_backup_operations.find(x =>
              x.tenant_id === this._params[0] &&
              x.data_source_id === this._params[1] &&
              ['REQUESTED', 'INSPECTING', 'SCANNING', 'EXPORTING', 'UPLOADING', 'COPYING', 'VERIFYING'].includes(x.status)
            );
            return row ? { ...row } : null;
          }
          if (s.includes('from site_backup_operations where tenant_id = ? and idempotency_key = ?')) {
            const row = tables.site_backup_operations.find(x => x.tenant_id === this._params[0] && x.idempotency_key === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_backup_operations where tenant_id = ? and id = ?')) {
            const row = tables.site_backup_operations.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_restore_operations where tenant_id = ? and id = ?')) {
            const row = tables.site_restore_operations.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            return row ? { ...row } : null;
          }
          if (s.includes('from site_export_operations where tenant_id = ? and id = ?')) {
            const row = tables.site_export_operations.find(x => x.tenant_id === this._params[0] && x.id === this._params[1]);
            return row ? { ...row } : null;
          }

          return null;
        },
        async all() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');

          // Site Pages
          if (s.includes('from site_pages where tenant_id = ?')) {
            const results = tables.site_pages
              .filter(x => x.tenant_id === this._params[0])
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            return { results };
          }

          // Site Routes
          if (s.includes('from site_routes r left join site_pages p on p.id = r.page_id where r.tenant_id = ?')) {
            const results = tables.site_routes
              .filter(x => x.tenant_id === this._params[0])
              .map(r => {
                const p = tables.site_pages.find(page => page.id === r.page_id);
                return { ...r, page_title: p?.title, page_slug: p?.slug };
              });
            return { results };
          }
          if (s.includes('from site_routes where tenant_id = ?')) {
            const results = tables.site_routes.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }

          // Site Functions
          if (s.includes('from site_functions where tenant_id = ?')) {
            const results = tables.site_functions.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }

          // Site Storage
          if (s.includes('from site_storage where tenant_id = ?')) {
            const results = tables.site_storage.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }

          // Site Navigation
          if (s.includes('from site_navigation where tenant_id = ?')) {
            const results = tables.site_navigation.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }

          // Site Deployments
          if (s.includes('from site_deployments where tenant_id = ?')) {
            const results = tables.site_deployments.filter(x => x.tenant_id === this._params[0]).sort((a, b) => b.version - a.version);
            return { results };
          }

          // Site Execution Logs
          if (s.includes('from site_execution_logs where tenant_id = ?')) {
            const results = tables.site_execution_logs.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }

          // Products
          if (s.includes('from products where (organization_id = ?')) {
            const orgId = this._params[0];
            const userId = this._params[1];
            const results = tables.products.filter(x => (x.organization_id === orgId || (userId && x.user_id === userId)));
            return { results };
          }

          // Orders
          if (s.includes('from orders where (organization_id = ? or user_id = ?)')) {
            const results = tables.orders.filter(x => (x.organization_id === this._params[0] || x.user_id === this._params[1]));
            return { results };
          }

          // Project Imports
          if (s.includes('from site_imported_projects p left join site_import_versions v on v.id = p.latest_version_id where p.tenant_id = ?')) {
            const results = tables.site_imported_projects
              .filter(x => x.tenant_id === this._params[0])
              .map(p => {
                const v = tables.site_import_versions.find(ver => ver.id === p.latest_version_id);
                return {
                  ...p,
                  latest_version_number: v?.version_number || 1,
                  latest_snapshot_b2_key: v?.snapshot_b2_key || null,
                };
              })
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            return { results };
          }
          if (s.includes('from site_imported_projects where tenant_id = ?')) {
            const results = tables.site_imported_projects.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }
          if (s.includes('from site_import_versions where project_id = ?')) {
            const results = tables.site_import_versions
              .filter(x => x.project_id === this._params[0])
              .sort((a, b) => (a.version_number || 0) - (b.version_number || 0));
            return { results };
          }
          if (s.includes('from site_source_mappings') && s.includes('resource_type =')) {
            let resType = null;
            if (s.includes("resource_type = 'page'")) resType = 'page';
            else if (s.includes("resource_type = 'route'")) resType = 'route';
            else if (s.includes("resource_type = 'function'")) resType = 'function';
            const results = tables.site_source_mappings.filter(x => !resType || x.resource_type === resType);
            return { results };
          }
          if (s.includes('from site_routes') && s.includes('function_binding is not null')) {
            const results = tables.site_routes.filter(x => x.tenant_id === this._params[0] && Boolean(x.function_binding));
            return { results };
          }
          if (s.includes('from site_source_mappings where project_id = ? and version_id = ?')) {
            const results = tables.site_source_mappings.filter(x => x.project_id === this._params[0] && x.version_id === this._params[1]);
            return { results };
          }
          if (s.includes('from site_source_mappings where project_id = ?')) {
            const results = tables.site_source_mappings.filter(x => x.project_id === this._params[0]);
            return { results };
          }
          if (s.includes('from site_source_files where version_id = ?')) {
            const results = tables.site_source_files.filter(x => x.version_id === this._params[0]);
            return { results };
          }
          if (s.includes('from site_import_changes where version_id = ?')) {
            const results = tables.site_import_changes.filter(x => x.version_id === this._params[0]);
            return { results };
          }

          // Data & Storage all() handlers
          if (s.includes('from site_data_sources s') && s.includes('join site_backup_policies p')) {
            const results = tables.site_data_sources
              .filter(x => x.tenant_id === this._params[0])
              .map(s => {
                const pol = tables.site_backup_policies.find(p => p.data_source_id === s.id) || {};
                return { ...s, ...pol, id: s.id, tenant_id: s.tenant_id };
              });
            return { results };
          }
          if (s.includes('from site_data_sources where tenant_id = ?')) {
            const results = tables.site_data_sources.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }
          if (s.includes('from site_backup_snapshots where tenant_id = ? and data_source_id = ?')) {
            const results = tables.site_backup_snapshots.filter(x => x.tenant_id === this._params[0] && x.data_source_id === this._params[1]);
            return { results };
          }
          if (s.includes('from site_backup_snapshots where tenant_id = ?')) {
            const results = tables.site_backup_snapshots.filter(x => x.tenant_id === this._params[0]);
            return { results };
          }
          if (s.includes('from site_backup_items where snapshot_id = ?')) {
            const results = tables.site_backup_items.filter(x => x.snapshot_id === this._params[0]);
            return { results };
          }
          if (s.includes('from site_backup_policies p join site_data_sources s on s.id = p.data_source_id')) {
            const results = tables.site_backup_policies
              .filter(p => p.is_active && p.schedule !== 'manual')
              .map(p => {
                const src = tables.site_data_sources.find(s => s.id === p.data_source_id);
                return { ...p, tenant_id: src?.tenant_id };
              });
            return { results };
          }

          return { results: [] };
        },
        async run() {
          const s = sql.toLowerCase().replace(/\s+/g, ' ');

          // Insert Organizations
          if (s.includes('insert into organizations') || s.includes('insert or ignore into organizations')) {
            const org = { id: this._params[0], workos_organization_id: this._params[1], name: this._params[2] };
            tables.organizations.push(org);
            return { success: true };
          }

          // Insert Organization Members
          if (s.includes('insert into organization_members') || s.includes('insert or ignore into organization_members')) {
            const mem = { id: this._params[0], organization_id: this._params[1], user_id: this._params[2], role: this._params[3] };
            tables.organization_members.push(mem);
            return { success: true };
          }

          // Insert Products
          if (s.includes('insert into products')) {
            const prod = { id: this._params[0], organization_id: this._params[1], name: this._params[2] };
            tables.products.push(prod);
            return { success: true };
          }

          // Insert / Update Pages
          if (s.includes('insert into site_pages')) {
            const [id, tenant_id, slug, title, type, content, parent_id, is_homepage, auth_required, order_index, seo_title, seo_description, created_at, updated_at] = this._params;
            const existingIdx = tables.site_pages.findIndex(x => x.tenant_id === tenant_id && (x.id === id || x.slug === slug));
            const newRecord = {
              id: existingIdx >= 0 ? tables.site_pages[existingIdx].id : id,
              tenant_id, slug, title, type, content, parent_id,
              is_homepage: Number(is_homepage), auth_required: Number(auth_required), order_index: Number(order_index),
              seo_title, seo_description, status: 'draft',
              created_at: existingIdx >= 0 ? tables.site_pages[existingIdx].created_at : created_at,
              updated_at,
            };
            if (existingIdx >= 0) tables.site_pages[existingIdx] = newRecord;
            else tables.site_pages.push(newRecord);
            return { success: true };
          }

          if (s.includes('update site_pages set is_homepage = 0 where tenant_id = ?')) {
            tables.site_pages.forEach(p => { if (p.tenant_id === this._params[0]) p.is_homepage = 0; });
            return { success: true };
          }

          if (s.includes('update site_pages set is_homepage = 1')) {
            const page = tables.site_pages.find(p => p.tenant_id === this._params[1] && p.id === this._params[2]);
            if (page) page.is_homepage = 1;
            return { success: true };
          }

          if (s.includes('update site_pages set title = ?')) {
            const [title, slug, type, content, is_homepage, auth_required, parent_id, order_index, seo_title, seo_description, updated_at, tenant_id, id] = this._params;
            const page = tables.site_pages.find(p => p.tenant_id === tenant_id && p.id === id);
            if (page) {
              Object.assign(page, { title, slug, type, content, is_homepage, auth_required, parent_id, order_index, seo_title, seo_description, updated_at });
            }
            return { success: true };
          }

          if (s.includes('delete from site_pages where tenant_id = ? and id = ?')) {
            tables.site_pages = tables.site_pages.filter(p => !(p.tenant_id === this._params[0] && p.id === this._params[1]));
            return { success: true };
          }

          if (s.includes('update site_pages set status = \'published\' where tenant_id = ?')) {
            tables.site_pages.forEach(p => { if (p.tenant_id === this._params[0]) p.status = 'published'; });
            return { success: true };
          }

          // Insert / Update Routes
          if (s.includes('insert into site_routes')) {
            const [id, tenant_id, path_pattern, page_id, access_level, function_binding, now1, now2] = this._params;
            const existingIdx = tables.site_routes.findIndex(x => x.tenant_id === tenant_id && x.path_pattern === path_pattern);
            const route = {
              id: existingIdx >= 0 ? tables.site_routes[existingIdx].id : id,
              tenant_id, path_pattern, page_id, access_level: access_level || 'public',
              function_binding: function_binding || null, status: 'draft',
              created_at: now1, updated_at: now2,
            };
            if (existingIdx >= 0) tables.site_routes[existingIdx] = route;
            else tables.site_routes.push(route);
            return { success: true };
          }

          if (s.includes('update site_routes set path_pattern = ?')) {
            const [path_pattern, page_id, access_level, function_binding, updated_at, tenant_id, id] = this._params;
            const r = tables.site_routes.find(x => x.tenant_id === tenant_id && x.id === id);
            if (r) Object.assign(r, { path_pattern, page_id, access_level, function_binding, updated_at });
            return { success: true };
          }

          if (s.includes('delete from site_routes where tenant_id = ? and id = ?')) {
            tables.site_routes = tables.site_routes.filter(x => !(x.tenant_id === this._params[0] && x.id === this._params[1]));
            return { success: true };
          }

          if (s.includes('delete from site_routes where tenant_id = ? and page_id = ?')) {
            tables.site_routes = tables.site_routes.filter(x => !(x.tenant_id === this._params[0] && x.page_id === this._params[1]));
            return { success: true };
          }

          if (s.includes('update site_routes set status = \'published\' where tenant_id = ?')) {
            tables.site_routes.forEach(r => { if (r.tenant_id === this._params[0]) r.status = 'published'; });
            return { success: true };
          }

          // Insert / Update Functions
          if (s.includes('insert into site_functions')) {
            const [id, tenant_id, name, description, definition, capabilities, now1, now2] = this._params;
            const existingIdx = tables.site_functions.findIndex(x => x.tenant_id === tenant_id && x.name === name);
            const fn = {
              id: existingIdx >= 0 ? tables.site_functions[existingIdx].id : id,
              tenant_id, name, description, definition, capabilities,
              status: 'draft', version: existingIdx >= 0 ? (tables.site_functions[existingIdx].version + 1) : 1,
              timeout_ms: 1500, created_at: now1, updated_at: now2,
            };
            if (existingIdx >= 0) tables.site_functions[existingIdx] = fn;
            else tables.site_functions.push(fn);
            return { success: true };
          }

          if (s.includes('update site_functions set name = ?')) {
            const [name, description, definition, capabilities, version, updated_at, tenant_id, id] = this._params;
            const fn = tables.site_functions.find(x => x.tenant_id === tenant_id && x.id === id);
            if (fn) Object.assign(fn, { name, description, definition, capabilities, version, updated_at });
            return { success: true };
          }

          if (s.includes('delete from site_functions where tenant_id = ?')) {
            tables.site_functions = tables.site_functions.filter(x => !(x.tenant_id === this._params[0] && (x.id === this._params[1] || x.name === this._params[2])));
            return { success: true };
          }

          if (s.includes('update site_functions set status = \'published\' where tenant_id = ?')) {
            tables.site_functions.forEach(f => { if (f.tenant_id === this._params[0]) f.status = 'published'; });
            return { success: true };
          }

          // Deployments
          if (s.includes('insert into site_deployments')) {
            const [id, tenant_id, version, snapshot, deployed_by, created_at] = this._params;
            tables.site_deployments.push({ id, tenant_id, version, status: 'published', snapshot, deployed_by, created_at });
            return { success: true };
          }

          if (s.includes('update site_deployments set status = \'superseded\' where tenant_id = ? and status = \'published\'')) {
            tables.site_deployments.forEach(d => { if (d.tenant_id === this._params[0] && d.status === 'published') d.status = 'superseded'; });
            return { success: true };
          }

          // Navigation
          if (s.includes('insert into site_navigation')) {
            const [id, tenant_id, items, now1, now2] = this._params;
            const existingIdx = tables.site_navigation.findIndex(x => x.tenant_id === tenant_id);
            const nav = { id, tenant_id, menu_location: 'header', items, status: 'draft', created_at: now1, updated_at: now2 };
            if (existingIdx >= 0) tables.site_navigation[existingIdx] = nav;
            else tables.site_navigation.push(nav);
            return { success: true };
          }

          // Storage
          if (s.includes('insert into site_storage') || s.includes('insert or replace into site_storage')) {
            const [id, tenant_id, key, value, bytes_size, created_at, updated_at] = this._params;
            const existingIdx = tables.site_storage.findIndex(x => x.tenant_id === tenant_id && x.key === key);
            const record = { id: existingIdx >= 0 ? tables.site_storage[existingIdx].id : id, tenant_id, key, value, bytes_size, created_at, updated_at };
            if (existingIdx >= 0) tables.site_storage[existingIdx] = record;
            else tables.site_storage.push(record);
            return { success: true };
          }

          if (s.includes('delete from site_storage where tenant_id = ? and key = ?')) {
            tables.site_storage = tables.site_storage.filter(x => !(x.tenant_id === this._params[0] && x.key === this._params[1]));
            return { success: true };
          }

          // Quotas
          if (s.includes('insert or ignore into site_quotas') || s.includes('insert into site_quotas')) {
            const [id, tenant_id, max_pages, max_routes, max_functions, max_invocations, max_storage, max_published_versions, max_ai, resets_at, now1, now2] = this._params;
            const existing = tables.site_quotas.find(x => x.tenant_id === tenant_id);
            if (!existing) {
              tables.site_quotas.push({
                id, tenant_id, max_pages, max_routes, max_functions,
                max_function_invocations_monthly: max_invocations, function_invocations_used: 0,
                max_storage_bytes: max_storage, storage_used_bytes: 0,
                max_published_versions, max_ai_actions_monthly: max_ai, ai_actions_used: 0,
                resets_at, created_at: now1, updated_at: now2,
              });
            }
            return { success: true };
          }

          if (s.includes('update site_quotas set max_pages = ? where tenant_id = ?')) {
            let q = tables.site_quotas.find(x => x.tenant_id === this._params[1]);
            if (!q) {
              q = { tenant_id: this._params[1], max_pages: Number(this._params[0]), max_routes: 50, max_functions: 30 };
              tables.site_quotas.push(q);
            } else {
              q.max_pages = Number(this._params[0]);
            }
            return { success: true };
          }

          if (s.includes('update site_quotas set function_invocations_used = function_invocations_used + 1')) {
            const q = tables.site_quotas.find(x => x.tenant_id === this._params[1]);
            if (q) q.function_invocations_used = (q.function_invocations_used || 0) + 1;
            return { success: true };
          }

          if (s.includes('update site_quotas set ai_actions_used = ai_actions_used + 1')) {
            const q = tables.site_quotas.find(x => x.tenant_id === this._params[1]);
            if (q) q.ai_actions_used = (q.ai_actions_used || 0) + 1;
            return { success: true };
          }

          // Execution logs
          if (s.includes('insert into site_execution_logs')) {
            const [id, tenant_id, function_name, event_type, details, duration_ms, status_code, created_at] = this._params;
            tables.site_execution_logs.push({ id, tenant_id, function_name, event_type, details, duration_ms, status_code, created_at });
            return { success: true };
          }

          // Orders create
          if (s.includes('insert into orders')) {
            const [id, user_id, organization_id, customer_id, customer_name, customer_phone, customer_address, items, total, delivery_type, notes, created_at, updated_at] = this._params;
            tables.orders.push({
              id, user_id, organization_id, customer_id, customer_name, customer_phone,
              customer_address, items, total, delivery_type, status: 'pending', payment_status: 'pending', notes, created_at, updated_at
            });
            return { success: true };
          }

          // Project Imports Run Handlers
          if (s.includes('insert into site_imported_projects')) {
            const [id, tenant_id, project_name, framework, now1, now2] = this._params;
            const existingIdx = tables.site_imported_projects.findIndex(x => x.id === id || (x.tenant_id === tenant_id && (x.project_name === project_name || x.name === project_name)));
            const rec = { id, tenant_id, project_name, name: project_name, framework, current_version_id: null, status: 'analyzed', created_at: now1, updated_at: now2 };
            if (existingIdx >= 0) tables.site_imported_projects[existingIdx] = rec;
            else tables.site_imported_projects.push(rec);
            return { success: true };
          }

          if (s.includes('update site_imported_projects set current_version_id = ?')) {
            const [current_version_id, updated_at, id] = this._params;
            const p = tables.site_imported_projects.find(x => x.id === id);
            if (p) {
              p.current_version_id = current_version_id;
              p.status = 'committed';
              p.updated_at = updated_at;
            }
            return { success: true };
          }

          if (s.includes('insert into site_import_versions')) {
            const [id, project_id, version_number, project_fingerprint, manifest_b2_key, source_archive_b2_key, created_at] = this._params;
            tables.site_import_versions.push({
              id, project_id, version_number, project_fingerprint, manifest_b2_key, source_archive_b2_key, import_status: 'SNAPSHOT_PENDING', created_at
            });
            return { success: true };
          }

          if (s.includes('update site_import_versions set import_status =')) {
            const statusMatch = s.match(/import_status\s*=\s*'([^']+)'/i);
            const status = statusMatch ? statusMatch[1].toUpperCase() : this._params[0];
            const id = statusMatch ? this._params[0] : this._params[1];
            const v = tables.site_import_versions.find(x => x.id === id);
            if (v) {
              v.import_status = status;
            }
            return { success: true };
          }

          if (s.includes('insert into site_source_files') || s.includes('insert or replace into site_source_files')) {
            const [id, version_id, source_path, file_hash, file_size, file_type, relevant_metadata] = this._params;
            tables.site_source_files.push({ id, version_id, source_path, path: source_path, file_hash, file_size, file_type, relevant_metadata });
            return { success: true };
          }

          if (s.includes('insert or replace into site_source_mappings') || s.includes('insert into site_source_mappings')) {
            const [id, project_id, version_id, source_path, resource_type, resource_id, deterministic_identity, source_hash, studio_hash, metadata, now1, now2] = this._params;
            const existingIdx = tables.site_source_mappings.findIndex(x => x.project_id === project_id && (x.deterministic_identity === deterministic_identity || (x.source_path === source_path && x.resource_type === resource_type)));
            const mapping = {
              id: existingIdx >= 0 ? tables.site_source_mappings[existingIdx].id : id,
              project_id, version_id, source_path, resource_type, resource_id, deterministic_identity, source_hash, studio_hash,
              mapping_status: 'active', metadata, created_at: now1, updated_at: now2
            };
            if (existingIdx >= 0) tables.site_source_mappings[existingIdx] = mapping;
            else tables.site_source_mappings.push(mapping);
            return { success: true };
          }

          if (s.includes('update site_source_mappings set source_hash = ?')) {
            const [source_hash, studio_hash, version_id, updated_at, id] = this._params;
            const m = tables.site_source_mappings.find(x => x.id === id);
            if (m) {
              m.source_hash = source_hash;
              m.studio_hash = studio_hash;
              m.version_id = version_id;
              m.updated_at = updated_at;
            }
            return { success: true };
          }

          if (s.includes('insert into site_import_changes')) {
            const [id, project_id, version_id, source_path, resource_type, resource_id, change_type, resolution, diff_hunks, resolved_content, created_at] = this._params;
            tables.site_import_changes.push({ id, project_id, version_id, source_path, resource_type, resource_id, change_type, resolution, diff_hunks, resolved_content, created_at });
            return { success: true };
          }

          // Data & Storage run() handlers
          if (s.includes('insert into site_data_sources')) {
            const [id, tenant_id, type, provider, name, connection_strategy, cred_ref, caps, meta, created_at, updated_at] = this._params;
            tables.site_data_sources.push({
              id, tenant_id, type, provider, name, connection_strategy, status: 'connected',
              credential_reference: cred_ref, capabilities: caps, metadata: meta, created_at, updated_at
            });
            return { success: true };
          }
          if (s.includes('delete from site_data_sources where id = ?')) {
            tables.site_data_sources = tables.site_data_sources.filter(x => x.id !== this._params[0]);
            return { success: true };
          }

          if (s.includes('insert into site_data_source_credentials')) {
            const [id, tenant_id, key_version, envelope_version, encrypted_envelope, created_at, updated_at] = this._params;
            tables.site_data_source_credentials.push({ id, tenant_id, key_version, envelope_version, encrypted_envelope, created_at, updated_at });
            return { success: true };
          }
          if (s.includes('delete from site_data_source_credentials where id = ?')) {
            tables.site_data_source_credentials = tables.site_data_source_credentials.filter(x => x.id !== this._params[0]);
            return { success: true };
          }

          if (s.includes('insert into site_backup_policies')) {
            const [id, tenant_id, data_source_id, schedule, retention_days, enable_object_lock, selected_tables, selected_prefixes, created_at, updated_at] = this._params;
            tables.site_backup_policies.push({
              id, tenant_id, data_source_id, schedule, retention_days, enable_object_lock, selected_tables, selected_prefixes, is_active: 1, created_at, updated_at
            });
            return { success: true };
          }
          if (s.includes('delete from site_backup_policies where data_source_id = ?')) {
            tables.site_backup_policies = tables.site_backup_policies.filter(x => x.data_source_id !== this._params[0]);
            return { success: true };
          }
          if (s.includes('update site_backup_policies set last_run_at =')) {
            const [next_run_at, id] = this._params;
            const pol = tables.site_backup_policies.find(p => p.id === id);
            if (pol) {
              pol.last_run_at = new Date().toISOString();
              pol.next_run_at = next_run_at;
            }
            return { success: true };
          }

          if (s.includes('insert into site_backup_snapshots')) {
            const [id, tenant_id, data_source_id, snapshot_number, snapshot_type, b2_root_prefix, created_at] = this._params;
            tables.site_backup_snapshots.push({
              id, tenant_id, data_source_id, snapshot_number, snapshot_type, status: 'REQUESTED', b2_root_prefix, created_at
            });
            return { success: true };
          }
          if (s.includes('update site_backup_snapshots set')) {
            const id = this._params[this._params.length - 1];
            const snap = tables.site_backup_snapshots.find(x => x.id === id);
            if (snap) {
              snap.status = this._params[0] || snap.status;
            }
            return { success: true };
          }

          if (s.includes('insert into site_backup_items')) {
            const [id, snapshot_id, source_path, item_type, size_bytes, content_hash, b2_object_key, metadata, created_at] = this._params;
            tables.site_backup_items.push({
              id, snapshot_id, source_path, item_type, size_bytes, content_hash, b2_object_key, metadata, created_at
            });
            return { success: true };
          }

          if (s.includes('insert into site_backup_operations')) {
            const [id, tenant_id, data_source_id, snapshot_id, idempotency_key, created_at, updated_at] = this._params;
            tables.site_backup_operations.push({
              id, tenant_id, data_source_id, snapshot_id, operation_type: 'backup', status: 'REQUESTED',
              current_step: 'init', progress_percent: 0, idempotency_key, created_at, updated_at
            });
            return { success: true };
          }
          if (s.includes('update site_backup_operations set')) {
            const id = this._params[this._params.length - 1];
            const op = tables.site_backup_operations.find(x => x.id === id);
            if (op) {
              op.status = this._params[0] || op.status;
              op.current_step = this._params[1] || op.current_step;
              op.progress_percent = this._params[2] !== undefined ? this._params[2] : op.progress_percent;
              if (this._params[3]) op.details = this._params[3];
              if (this._params[4]) op.error_message = this._params[4];
            }
            return { success: true };
          }

          if (s.includes('insert into site_restore_operations')) {
            const [id, tenant_id, snapshot_id, data_source_id, mode, created_at, updated_at] = this._params;
            tables.site_restore_operations.push({
              id, tenant_id, snapshot_id, data_source_id, mode, status: 'REQUESTED', current_step: 'init', progress_percent: 0, created_at, updated_at
            });
            return { success: true };
          }
          if (s.includes('update site_restore_operations set')) {
            const id = this._params[this._params.length - 1];
            const op = tables.site_restore_operations.find(x => x.id === id);
            if (op) {
              op.status = this._params[0] || op.status;
              op.current_step = this._params[1] || op.current_step;
              op.progress_percent = this._params[2] !== undefined ? this._params[2] : op.progress_percent;
            }
            return { success: true };
          }

          if (s.includes('insert into site_export_operations')) {
            const [id, tenant_id, snapshot_id, data_source_id, format, created_at] = this._params;
            tables.site_export_operations.push({
              id, tenant_id, snapshot_id, data_source_id, format, status: 'REQUESTED', created_at
            });
            return { success: true };
          }
          if (s.includes('update site_export_operations set')) {
            const id = this._params[this._params.length - 1];
            const op = tables.site_export_operations.find(x => x.id === id);
            if (op) {
              op.status = this._params[0] || op.status;
              if (this._params[1]) op.b2_export_key = this._params[1];
              if (this._params[2]) op.download_url = this._params[2];
              if (this._params[3]) op.size_bytes = this._params[3];
            }
            return { success: true };
          }

          return { success: true };
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
    async exec() {
      return Promise.resolve();
    },
  };

  return db;
}
