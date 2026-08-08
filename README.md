# Discord Activity Reverse Proxy (pstream.cfd)

This Cloudflare Worker acts as a reverse proxy for embedding `https://pstream.cfd` inside a Discord Activity iframe (`*.discordsays.com`).

## Why is this needed?
1. **CSP & Same-Origin Restrictions:** Discord Activity iframes enforce a strict Content Security Policy (CSP). Outbound `fetch()` requests to absolute URLs like `https://api.themoviedb.org` or `https://court.fontaine.lol` are blocked.
2. **Relative URL Requirement:** For Discord's **Proxy Path Mappings** to work, the frontend must make requests to relative paths (`/tmdb/...`, `/court/...`, `/justice/...`).
3. **SRI (Subresource Integrity) Fix:** Because `pstream.cfd` returns pre-compiled JS bundles with hardcoded absolute URLs, this Worker intercepts the HTML and JS on the fly, rewriting `https://...` to relative paths. Modifying JavaScript bundles invalidates their `integrity="sha512-..."` hashes in the HTML (`index.html`), so the Worker automatically strips SRI attributes from `<script>` tags to prevent browsers from rejecting the rewritten code.

---

## Deployment Instructions

### 1. Deploy the Cloudflare Worker
You can deploy this worker in two ways:

#### Method A: Using Cloudflare Dashboard (Quick & Browser-only)
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/) ➔ **Workers & Pages**.
2. Click **Create Application** ➔ **Create Worker**.
3. Name your worker (`zstream-discord-proxy`) and click **Deploy**.
4. Click **Edit Code**, replace the default script with the contents of [`worker.js`](file:///home/adior/p-stream/discord-activity-proxy/worker.js), and click **Deploy**.
5. Copy your new Worker URL (e.g., `https://zstream-discord-proxy.yourname.workers.dev`).

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
* **Target:** `zstream-discord-proxy.yourname.workers.dev` *(Your Cloudflare Worker URL without `https://`)*

### Proxy Path Mappings
Add these mappings so Discord's proxy intercepts the rewritten relative paths:

| Prefix | Target | Description |
| :--- | :--- | :--- |
| `/tmdb` | `api.themoviedb.org` | TMDB API endpoints |
| `/image-tmdb` | `image.tmdb.org` | TMDB Posters & Backdrops |
| `/sync` | `sync.pstream.cfd` | P-Stream Sync Backend API |
| `/court` | `court.fontaine.lol` | Fontaine metadata API |
| `/justice` | `justice.fontaine.lol` | Fontaine tracking & site API |
| `/aurora` | `aurora.fontaine.lol` | Fontaine traffic / setup API |
| `/natsuki` | `natsuki.fontaine.lol` | Subtitle API |
| `/artemis` | `artemis.fontaine.lol` | Casting API |

Once configured, launch your Discord Activity. All API and metadata calls from `pstream.cfd` will transparently route through your Cloudflare Worker and Discord's internal proxy tunnels without CORS, SRI, or CSP failures!
