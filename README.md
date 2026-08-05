# Trạm Đọc Một Chút

MVP website review sách affiliate bằng Next.js App Router, Prisma và PostgreSQL.

## Development

```bash
npm install
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Mở `http://localhost:3000`.

## Environment

Copy `.env.example` sang `.env` và cấu hình:

- `DATABASE_URL`: connection string PostgreSQL pooled.
- `DIRECT_URL`: connection string direct dùng cho Prisma migration.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: login admin MVP.
- `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`: AI generator.
- `CRON_SECRET`: secret để gọi cron publish bài scheduled.
- `GOOGLE_SITE_VERIFICATION`: mã verify Google Search Console.
- `NEXT_PUBLIC_SITE_URL`: domain public, ví dụ `https://example.com`.

## Scheduled Publishing

Route cron:

```bash
POST /api/cron/publish-scheduled
Authorization: Bearer <CRON_SECRET>
```

Hoặc dùng header:

```bash
x-cron-secret: <CRON_SECRET>
```

Cron sẽ publish các bài có `status = SCHEDULED` và `scheduledAt <= now()`.

## Google Search Console

1. Deploy website với `NEXT_PUBLIC_SITE_URL` đúng domain.
2. Thêm mã verification vào `GOOGLE_SITE_VERIFICATION`.
3. Verify domain trong Google Search Console.
4. Submit sitemap: `/sitemap.xml`.

## Checks

```bash
npm ci
npm run lint
npm run build
npx prisma migrate status
npm run release:check
```

## Production Release

Production dùng VPS/Node server, PM2, Nginx, Certbot và Neon Postgres.

Lệnh deploy chính trên VPS:

```bash
npm ci
npm run prisma:migrate:deploy
npm run build
pm2 restart book-store || pm2 start npm --name book-store -- start
```

Không dùng `prisma migrate dev` trên production.

Xem checklist chi tiết tại [docs/VPS_RELEASE.md](docs/VPS_RELEASE.md).
