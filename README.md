# Visual Honesty

A platform for investigating deception in data visualizations. For agent prototypes, see [vh-agent](https://github.com/rorokapur/vh-agent).

## Quick Start

**1. Initial Setup**
```bash
git clone https://github.com/rorokapur/visual-honesty.git
cd visual-honesty
cp .env.example .env
npm install
```
*Open `.env` and configure your `DB_PASSWORD` and a secure `SESSION_SECRET` before starting.*

**2. Run Development (Hot-Reloading)**
```bash
npm run dev
```
* Client available at: `http://localhost:5173`
* Backend available at: `http://localhost:3000`

**3. Run Production (Consolidated)**
```bash
npm start
```
*In production, the frontend and API are served from Express via Caddy, which handles HTTPS automatically.*

**Stop:**
```bash
npm run stop
```

---

## Config Files

* **`.env`**: Secrets file
* **`.env.example`**: Template
* **`Caddyfile`**: HTTPS reverse proxy config — edit `localhost` before deploying
---

## HTTPS (Production)

HTTPS is handled automatically by [Caddy](https://caddyserver.com/) via Let's Encrypt. Before deploying, edit `Caddyfile` and replace `localhost` with your actual domain:

```
# Replace with your domain before deploying
localhost {
    reverse_proxy app:3000
}
```

No certificate management required — Caddy handles issuance and renewal automatically as long as your domain's DNS points to your server.

---

## Database Scripts
*The project must be running before these commands can be executed.*

### 1. Run Migrations
Required for first-time setup or after schema updates.
```bash
docker exec -it visual-honesty-app npm run migrate
```

### 2. Create an Admin Account
**Dev:**
```bash
docker exec -it visual-honesty-app npx tsx scripts/create-admin.ts <email> <password>
```
**Prod:**
```bash
docker exec -it visual-honesty-app npm run create-admin:prod <email> <password>
```

### 3. Clear Study Responses
**Dev:**
```bash
docker exec -it visual-honesty-app npx tsx scripts/clear-responses.ts --confirm
```
**Prod:**
```bash
docker exec -it visual-honesty-app npm run clear-responses:prod -- --confirm
```
