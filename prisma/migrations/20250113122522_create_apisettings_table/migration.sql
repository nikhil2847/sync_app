-- CreateTable
CREATE TABLE "apiSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "apiEndpoint" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "SKU" TEXT NOT NULL,
    "Stock" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
