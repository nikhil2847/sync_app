-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "postType" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published" TEXT,
    "Status" TEXT,
    "logDetails" TEXT,
    "sessionId" TEXT NOT NULL DEFAULT 'default_session'
);
INSERT INTO "new_history" ("Status", "id", "logDetails", "postType", "published", "sessionId", "startedAt") SELECT "Status", "id", "logDetails", "postType", "published", coalesce("sessionId", 'default_session') AS "sessionId", "startedAt" FROM "history";
DROP TABLE "history";
ALTER TABLE "new_history" RENAME TO "history";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
