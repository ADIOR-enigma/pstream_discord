# Discord Activity Reverse Proxy (pstream.cfd)

This Cloudflare Worker acts as a reverse proxy for embedding `https://pstream.cfd` inside a Discord Activity iframe (`*.discordsays.com`).

## Why is this needed?
1. **CSP & Same-Origin Restrictions:** Discord Activity iframes enforce a strict Content Security Policy (CSP). Outbound `fetch()` requests to absolute URLs like `https://api.themoviedb.org` or `https://ava.pstream.cfd` are blocked.
2. **Relative URL Requirement:** To route traffic through our single Worker root mapping, the frontend must make requests to relative paths (`/p-tmdb/...`, `/p-ava/...`, etc.).
3. **CSP Nonce Forwarding:** Discord dynamically injects a CSP nonce to all valid `<script>` tags on load. The worker injects an interceptor script, stores the nonce in `data-proxy-nonce`, and safely applies it to any dynamically generated scripts by the app to prevent CSP script blocks.

---

## Deployment Instructions

### 1. Deploy the Cloudflare Worker
You can deploy this worker in two ways:

#### Method A: Using Cloudflare Dashboard (Quick & Browser-only)
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Workers & Pages**.
2. Click **Create Application** ➔ **Create Worker**.
3. Name your worker (`pstream-discord-proxy`) and click **Deploy**.
4. Click **Edit Code**, replace the default script with the contents of [`worker.js`](./worker.js), and upload [`interceptor.js`](./interceptor.js) alongside it, then click **Deploy**.
5. Copy your new Worker URL (e.g., `https://pstream-discord-proxy.yourname.workers.dev`).

#### Method B: Using Wrangler CLI (Terminal)
```bash
cd discord-activity-proxy
npx wrangler login
npx wrangler deploy
```

---

## 2. Configure Discord Developer Portal

Go to your application in the **Discord Developer Portal** ➔ **URL Mappings** page and configure exactly as follows:

### Root Mapping
* **Prefix:** `/`
* **Target:** `pstream-discord-proxy.yourname.workers.dev`

Once configured, launch your Discord Activity. All API and metadata calls from `pstream.cfd` will transparently route through your Cloudflare Worker and Discord's internal proxy tunnels without CSP failures!

---

## 3. Proxy Features & Endpoints

* `/p-health`: Returns proxy health JSON status, active routes, and timestamp.
* `/p-log`: Client log ingestion endpoint with rate-limiting.
* Subtitle & Track support: Automatic CORS header injection (`Content-Type: text/vtt`) and `crossorigin="anonymous"` DOM enforcement.
* Watch Party Sync: Micro-seek prevention, host drift spoofing, and autoplay policy recovery.
* TMDB Fallback: Automatic mirror failover to `api.tmdb.org` on 5xx errors.

