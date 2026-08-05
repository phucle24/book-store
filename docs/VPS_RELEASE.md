# VPS Production Release Guide

Release mode: soft launch SEO on a VPS/Node server.

This guide assumes Ubuntu 22.04 or 24.04, Node.js 20 LTS, PM2, Nginx, Certbot, and Neon Postgres.

## 1. Local Pre-Release Gate

Run these before deploying:

```bash
npm ci
npm run lint
npm run build
npx prisma migrate status
npm run release:check
```

`npm run release:check` expects production-like environment variables. It fails if `NEXT_PUBLIC_SITE_URL` still points to localhost, secrets are weak, or launch content is missing required SEO/byline fields.

Do not run `prisma migrate dev` against production.

## 2. VPS Packages

```bash
sudo apt update
sudo apt install -y git nginx certbot python3-certbot-nginx curl

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pm2
```

Check versions:

```bash
node -v
npm -v
pm2 -v
nginx -v
```

## 3. App Directory

Example path:

```bash
sudo mkdir -p /var/www/book-store
sudo chown -R "$USER":"$USER" /var/www/book-store
cd /var/www/book-store
git clone <your-repo-url> .
```

For future deploys:

```bash
cd /var/www/book-store
git pull --ff-only
npm ci
npm run prisma:migrate:deploy
npm run build
pm2 restart book-store || pm2 start npm --name book-store -- start
pm2 save
```

## 4. Production `.env`

Create `/var/www/book-store/.env` manually. Never commit this file.

```env
DATABASE_URL="Neon pooled connection string"
DIRECT_URL="Neon direct connection string"
ADMIN_EMAIL="real-admin-email"
ADMIN_PASSWORD="long-random-password"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"
NEXT_PUBLIC_SITE_NAME="Trạm Đọc Một Chút"
CRON_SECRET="long-random-secret-at-least-32-characters"
GOOGLE_SITE_VERIFICATION="..."

DEEPSEEK_API_KEY="..."
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"
TAVILY_API_KEY="..."
RESEARCH_MAX_SOURCES="12"
RESEARCH_CRAWL_TIMEOUT_MS="8000"
```

Rules:

- Use Neon pooled connection string for `DATABASE_URL`.
- Use Neon direct connection string for `DIRECT_URL`.
- Keep `ADMIN_PASSWORD` long and random.
- Keep `CRON_SECRET` at least 32 random characters.
- `NEXT_PUBLIC_SITE_URL` must be the final HTTPS domain.

## 5. Database Migration

Production migration:

```bash
npm run prisma:migrate:deploy
```

For a brand-new production database only, seed once:

```bash
npm run prisma:seed
```

Do not seed over real production content unless you intentionally want sample data.

## 6. PM2 Runtime

Start the app:

```bash
pm2 start npm --name book-store -- start
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs book-store
pm2 restart book-store
```

## 7. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/book-store`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml+rss application/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/book-store /etc/nginx/sites-enabled/book-store
sudo nginx -t
sudo systemctl reload nginx
```

## 8. HTTPS

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot renew --dry-run
```

## 9. Scheduled Publishing Cron

Use system cron:

```bash
crontab -e
```

Add:

```cron
*/10 * * * * curl -fsS -X POST https://yourdomain.com/api/cron/publish-scheduled -H "Authorization: Bearer YOUR_CRON_SECRET" >/dev/null 2>&1
```

Test:

```bash
curl -i -X POST https://yourdomain.com/api/cron/publish-scheduled
curl -i -X POST https://yourdomain.com/api/cron/publish-scheduled \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected:

- Missing or wrong secret returns `401`.
- Correct secret returns JSON with `published`.

## 10. Smoke Test

After deploy:

```bash
curl -I https://yourdomain.com
curl -s https://yourdomain.com/api/health
curl -I https://yourdomain.com/robots.txt
curl -I https://yourdomain.com/sitemap.xml
```

Manual checks:

- Homepage returns `200`.
- `/admin/login` works over HTTPS.
- Article detail renders byline, updated date, FAQ, and final CTA.
- CTA redirects through `/go/[trackingSlug]` and writes `ClickEvent`.
- Search page works for a pain query.
- Scheduled article stays hidden until cron publishes it.
- AI Autopilot shows a friendly error if API keys are missing.

## 11. Google Search Console

Before submitting:

- Confirm `GOOGLE_SITE_VERIFICATION` is set.
- Confirm canonical URLs use the production domain.
- Confirm `/robots.txt` and `/sitemap.xml` are reachable.
- Submit `https://yourdomain.com/sitemap.xml`.

## 12. Backup And Rollback

Before large migrations:

- Export or snapshot Neon database.
- Tag the release commit.

Rollback app code:

```bash
cd /var/www/book-store
git checkout <previous-release-tag-or-commit>
npm ci
npm run build
pm2 restart book-store
```

Database rollback should be planned per migration. Prisma production migrations are forward-only by default.
