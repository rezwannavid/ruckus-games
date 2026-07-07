# Deployment

This project has two deployable parts:

- `apps/web`: Next.js app. Deploy this to Vercel.
- `apps/server`: Express + Socket.IO server. Deploy this to a long-running Node host such as Railway, Fly.io, or Render.

Do not deploy the current Socket.IO server as a regular Vercel serverless function. The fastest stable production path is Vercel for the web app and Railway/Fly/Render for the realtime server.

## Recommended Fast Path

### 1. Push the repo to GitHub

Vercel and Railway can both import directly from GitHub.

### 2. Deploy the realtime server first

Recommended host: Railway.

Create a new Railway service from this GitHub repo and configure it for the server app:

- Root directory: `apps/server`
- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Start command: `pnpm start`
- Environment variables:
  - `PORT`: Railway normally injects this automatically, so only set it if the host asks for it.
  - `WEB_ORIGIN`: the Vercel URL after the web app is deployed. Temporarily use `http://localhost:3000` during first setup if needed.

After deploy, test:

```bash
curl https://your-server-url.example.com/health
```

### 3. Deploy the web app to Vercel

Import the GitHub repo in Vercel:

- Framework preset: Next.js
- Root directory: `apps/web`
- Build command: `pnpm build`
- Environment variables:
  - `NEXT_PUBLIC_SERVER_URL`: your deployed realtime server URL

Deploy the project, then copy the production Vercel URL.

### 4. Lock CORS to your web URL

Set the server environment variable:

```bash
WEB_ORIGIN=https://your-vercel-app.vercel.app
```

For multiple allowed web origins, use commas:

```bash
WEB_ORIGIN=https://your-vercel-app.vercel.app,https://www.yourdomain.com
```

Restart or redeploy the server after changing this value.

### 5. Smoke Test

Open the Vercel URL on two devices:

1. Create a room as host.
2. Copy the invite link.
3. Join from another phone.
4. Confirm both players appear in the lobby.
5. Start Imposter.
6. End the game and confirm you return to the same room.

## Production Stability Notes

The server currently stores rooms in `rooms.dev.json`. That is fine for local development, but it is not durable production storage. For a usable public link, keep the server on one instance. Before scaling to multiple instances or relying on long-lived rooms, move room state to Redis or Postgres.

Recommended upgrade path:

- Room/session state: Upstash Redis or Railway Redis.
- Multi-instance Socket.IO: Redis adapter.
- Game history/users: Postgres with Prisma or Drizzle.
- Error reporting: Sentry.
- Uptime checks: Better Stack or UptimeRobot.
- Product analytics: PostHog.
- End-to-end tests: Playwright.
