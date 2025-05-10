/*
  Warnings:

  - You are about to drop the `apiSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "apiSetting";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ApiSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "apiEndpoint" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "SKU" TEXT NOT NULL,
    "Stock" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "apiEndpoint" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "SKU" TEXT NOT NULL,
    "Stock" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
