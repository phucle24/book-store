-- CreateTable
CREATE TABLE "IntentEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "articleId" TEXT,
    "bookId" TEXT,
    "painPointId" TEXT,
    "path" TEXT NOT NULL,
    "metadata" JSONB,
    "userAgent" TEXT,
    "referer" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntentEvent_type_createdAt_idx" ON "IntentEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "IntentEvent_articleId_createdAt_idx" ON "IntentEvent"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "IntentEvent_bookId_createdAt_idx" ON "IntentEvent"("bookId", "createdAt");

-- CreateIndex
CREATE INDEX "IntentEvent_painPointId_createdAt_idx" ON "IntentEvent"("painPointId", "createdAt");

-- AddForeignKey
ALTER TABLE "IntentEvent" ADD CONSTRAINT "IntentEvent_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentEvent" ADD CONSTRAINT "IntentEvent_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntentEvent" ADD CONSTRAINT "IntentEvent_painPointId_fkey" FOREIGN KEY ("painPointId") REFERENCES "PainPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
