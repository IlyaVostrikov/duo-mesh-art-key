-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "collections_collector_id_title_key" ON "collections"("collector_id", "title");
