-- CreateEnum
CREATE TYPE "ArticleSourceKind" AS ENUM ('REFERENCE', 'BUYER_REVIEWS', 'PUBLISHER', 'EDITORIAL_NOTE');

-- AlterTable
ALTER TABLE "Book"
ADD COLUMN "editorialScore" DOUBLE PRECISION,
ADD COLUMN "scoreBreakdown" JSONB;

-- AlterTable
ALTER TABLE "Article"
ADD COLUMN "verdictScore" DOUBLE PRECISION,
ADD COLUMN "verdictSummary" TEXT;

-- CreateTable
CREATE TABLE "ArticleSource" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "domain" TEXT,
    "kind" "ArticleSourceKind" NOT NULL DEFAULT 'REFERENCE',
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "painPointId" TEXT,
    "token" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleSource_articleId_idx" ON "ArticleSource"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_token_key" ON "Subscriber"("token");

-- CreateIndex
CREATE INDEX "Subscriber_createdAt_idx" ON "Subscriber"("createdAt");

-- CreateIndex
CREATE INDEX "Subscriber_painPointId_idx" ON "Subscriber"("painPointId");

-- CreateIndex
CREATE INDEX "Article_status_publishedAt_idx" ON "Article"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "ReviewInsight_status_idx" ON "ReviewInsight"("status");

-- CreateIndex
CREATE INDEX "ClickEvent_createdAt_idx" ON "ClickEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ClickEvent_affiliateLinkId_createdAt_idx" ON "ClickEvent"("affiliateLinkId", "createdAt");

-- AddForeignKey
ALTER TABLE "ArticleSource" ADD CONSTRAINT "ArticleSource_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_painPointId_fkey" FOREIGN KEY ("painPointId") REFERENCES "PainPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
