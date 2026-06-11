# FeraSetu — Cloudflare Worker API

A self-contained shopkeeper/store backend that runs **natively on Cloudflare
Workers**, backed by **Cloudflare D1** (SQLite at the edge).

> ⚠️ This is **not** the Express app in [`../backend`](../backend). That one is
> Node-only (sync MySQL/SQLite, `nodemailer` SMTP, `multer` uploads, `node-cron`)
> and cannot run on Workers. This Worker reimplements the core store routes so
> they deploy cleanly to Cloudflare. Auth / AI / email / payments / uploads are
> **not** included here yet.

## Files

- `../wrangler.toml` — Worker config (entry point + D1 binding). Lives at repo root so you can deploy with `npx wrangler deploy` from `/`.
- `worker/index.js` — the Worker (all routes, CORS, error handling).
- `worker/schema.sql` — reference schema (auto-created on first request; manual init optional).

## One-time setup

```bash
# 1. Log in (opens a browser)
npx wrangler login

# 2. Create the D1 database
npx wrangler d1 create fera-shopkeeper
#    -> copy the printed `database_id`

# 3. Paste that id into wrangler.toml:
#    [[d1_databases]]  database_id = "xxxxxxxx-xxxx-..."
```

## Deploy

From the repository root:

```bash
npx wrangler deploy
```

Tables are created automatically on the first request — no migration step needed.

## Routes to test

After deploy, Wrangler prints your Worker URL (e.g. `https://fera-shopkeeper.<account>.workers.dev`).

```bash
BASE="https://fera-shopkeeper.<account>.workers.dev"

curl $BASE/                       # service info
curl $BASE/api/health             # {"status":"ok",...}

# Products
curl $BASE/api/products
curl -X POST $BASE/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Sugar 1kg","price":45,"stock":20,"description":"Local grocery"}'

# Orders
curl $BASE/api/orders
curl -X POST $BASE/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"Asha","items":[{"name":"Sugar 1kg","price":45,"qty":2}],"total":90}'
```

## Notes

- **CORS** is open (`*`) by default. To lock it down, set
  `Access-Control-Allow-Origin` in `worker/index.js` to your frontend domain.
- **Errors** are always JSON: `404` for unknown routes, `422` for validation,
  `500` for unexpected failures. The Worker never crashes the request.
- **Logs**: `npx wrangler tail` to stream live logs.
- **Local dev**: `npx wrangler dev` (uses a local D1 instance).
