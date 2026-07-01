-- CreateEnum
CREATE TYPE "ResearchRunStatus" AS ENUM ('PENDING', 'RESEARCHED', 'BOOK_GENERATED', 'ARTICLE_CREATED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResearchSourceStatus" AS ENUM ('USED', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "ResearchSourceType" AS ENUM ('SEARCH_RESULT', 'FETCHED_PAGE', 'PRODUCT_PAGE', 'MANUAL_NOTE', 'MANUAL_REVIEW');

-- CreateTable
CREATE TABLE "ResearchRun" (
    "id" TEXT NOT NULL,
    "bookTitle" TEXT NOT NULL,
    "author" TEXT,
    "affiliateUrl" TEXT,
    "productUrl" TEXT,
    "manualBookData" TEXT,
    "sourceNotes" TEXT,
    "rawReviews" TEXT,
    "status" "ResearchRunStatus" NOT NULL DEFAULT 'PENDING',
    "warnings" TEXT[],
    "sourceSummary" JSONB,
    "confidence" DOUBLE PRECISION,
    "createdBookId" TEXT,
    "createdArticleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "researchRunId" TEXT NOT NULL,
    "url" TEXT,
    "domain" TEXT,
    "title" TEXT,
    "sourceType" "ResearchSourceType" NOT NULL DEFAULT 'SEARCH_RESULT',
    "status" "ResearchSourceStatus" NOT NULL DEFAULT 'USED',
    "summary" TEXT,
    "facts" JSONB,
    "confidence" DOUBLE PRECISION,
    "contentHash" TEXT,
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchRun_status_createdAt_idx" ON "ResearchRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchRun_createdBookId_idx" ON "ResearchRun"("createdBookId");

-- CreateIndex
CREATE INDEX "ResearchRun_createdArticleId_idx" ON "ResearchRun"("createdArticleId");

-- CreateIndex
CREATE INDEX "ResearchSource_researchRunId_idx" ON "ResearchSource"("researchRunId");

-- CreateIndex
CREATE INDEX "ResearchSource_domain_idx" ON "ResearchSource"("domain");

-- CreateIndex
CREATE INDEX "ResearchSource_contentHash_idx" ON "ResearchSource"("contentHash");

-- AddForeignKey
ALTER TABLE "ResearchRun" ADD CONSTRAINT "ResearchRun_createdBookId_fkey" FOREIGN KEY ("createdBookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRun" ADD CONSTRAINT "ResearchRun_createdArticleId_fkey" FOREIGN KEY ("createdArticleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_researchRunId_fkey" FOREIGN KEY ("researchRunId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
