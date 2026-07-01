-- CreateEnum
CREATE TYPE "KeywordIdeaStatus" AS ENUM ('IDEA', 'BRIEFED', 'WRITING', 'SCHEDULED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "clusterId" TEXT;

-- CreateTable
CREATE TABLE "ContentCluster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "pillarArticleId" TEXT,
    "categoryId" TEXT,
    "painPointId" TEXT,
    "audienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordIdea" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "status" "KeywordIdeaStatus" NOT NULL DEFAULT 'IDEA',
    "articleType" "ArticleType" NOT NULL DEFAULT 'REVIEW',
    "notes" TEXT,
    "briefMarkdown" TEXT,
    "outlineMarkdown" TEXT,
    "clusterId" TEXT,
    "articleId" TEXT,
    "painPointId" TEXT,
    "audienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordIdea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentCluster_slug_key" ON "ContentCluster"("slug");

-- CreateIndex
CREATE INDEX "KeywordIdea_status_priority_idx" ON "KeywordIdea"("status", "priority");

-- CreateIndex
CREATE INDEX "KeywordIdea_clusterId_idx" ON "KeywordIdea"("clusterId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ContentCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCluster" ADD CONSTRAINT "ContentCluster_pillarArticleId_fkey" FOREIGN KEY ("pillarArticleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCluster" ADD CONSTRAINT "ContentCluster_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCluster" ADD CONSTRAINT "ContentCluster_painPointId_fkey" FOREIGN KEY ("painPointId") REFERENCES "PainPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCluster" ADD CONSTRAINT "ContentCluster_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordIdea" ADD CONSTRAINT "KeywordIdea_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ContentCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordIdea" ADD CONSTRAINT "KeywordIdea_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordIdea" ADD CONSTRAINT "KeywordIdea_painPointId_fkey" FOREIGN KEY ("painPointId") REFERENCES "PainPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordIdea" ADD CONSTRAINT "KeywordIdea_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
