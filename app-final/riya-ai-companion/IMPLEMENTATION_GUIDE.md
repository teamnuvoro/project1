# Implementation Guide: Fix Avatar Config Upsert

This guide outlines the steps to permanently fix the avatar configuration upsert issue and future-proof the codebase against similar errors.

## 1. Apply Database Migration
The root cause of the error is a missing UNIQUE constraint on `avatar_configurations.user_id`.

1.  **Run the SQL Migration:**
    Execute the contents of `migration_avatar_config_unique.sql` against your PostgreSQL database.
    ```bash
    # Example using psql (adjust connection string as needed)
    psql "$DATABASE_URL" -f migration_avatar_config_unique.sql
    ```
    *Note: This migration safely handles duplicates by keeping the most recent one before adding the constraint.*

## 2. Deploy the Upsert Utility
A new, robust utility has been created to handle upserts safely (`server/upsert-utility.ts`).

1.  **Verify File:** Ensure `server/upsert-utility.ts` exists.
2.  **Verify Tests:** Run the test suite to confirm logic.
    ```bash
    npm test upsert-tests.ts
    ```

## 3. Switch to Refactored Storage
The storage layer has been refactored to use the new utility for all risky operations.

1.  **Backup:** Rename your current `server/storage.ts` to `server/storage.backup.ts`.
2.  **Replace:** Rename `server/storage-refactored.ts` to `server/storage.ts`.
    ```bash
    mv server/storage.ts server/storage.backup.ts
    mv server/storage-refactored.ts server/storage.ts
    ```
3.  **Restart Server:** Restart your application to load the new code.

## 4. Verification
1.  **Test Avatar Config:** Go to the "Personality Selection" page in the app and try changing personas. It should work without errors.
2.  **Check Logs:** Look for "Upsert Utility" logs if enabled (or standard request logs) to confirm successful operations.

## 5. Future Maintenance
- **Audit:** Refer to `upsert-audit-report.md` for other potential areas of improvement.
- **New Features:** Always use `upsertRecord()` from `server/upsert-utility.ts` when you need to "save or update" a record based on a unique key.
