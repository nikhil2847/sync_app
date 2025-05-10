-- CreateTable
CREATE TABLE "LogDetail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "historyId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "stock" INTEGER,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogDetail_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "history" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
