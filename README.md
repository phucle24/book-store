# Trạm Đọc Một Chút

MVP website review sách affiliate bằng Next.js App Router, Prisma và PostgreSQL.

## Development

```bash
npm install
npx prisma generate
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
npm run lint
npm run build
```
