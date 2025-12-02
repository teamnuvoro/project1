# Upsert Audit Report

## Overview
This report identifies all occurrences of "upsert" logic (specifically `onConflictDoUpdate` or manual check-then-update patterns) in the codebase. It assesses the risk of failure due to missing unique constraints in the database schema.

## Findings

### 1. Avatar Configuration Upsert
- **Location:** `server/storage.ts` (Method: `upsertAvatarConfig`)
- **Pattern:** Originally `onConflictDoUpdate`, temporarily patched to manual check-then-act.
- **Risk:** **High**. The `avatar_configurations` table lacks a UNIQUE constraint on `user_id`.
- **Status:** **Fixed** in `storage-refactored.ts` using the new `upsertRecord` utility. Migration provided to add constraint.

### 2. User Summary Upsert
- **Location:** `server/storage.ts` (Method: `upsertUserSummary`)
- **Pattern:** `onConflictDoUpdate`
- **Target:** `userSummaryLatest.userId`
- **Risk:** **High**. The `user_summary_latest` table likely lacks a UNIQUE constraint on `user_id` unless explicitly verified. If missing, this will fail similarly to the avatar config.
- **Recommendation:** Apply the `upsertRecord` utility pattern here as well (Done in `storage-refactored.ts`). Verify schema constraints.

### 3. Relationship Depth Upsert
- **Location:** `server/storage.ts` (Method: `upsertRelationshipDepth`)
- **Pattern:** `onConflictDoUpdate`
- **Target:** `relationshipDepth.userId`
- **Risk:** **High**. Similar to above, `relationship_depth` table needs a UNIQUE constraint on `user_id` for atomic upserts to work safely.
- **Recommendation:** Apply the `upsertRecord` utility pattern here as well (Done in `storage-refactored.ts`). Verify schema constraints.

## Summary of Refactoring
The `storage-refactored.ts` file has replaced all identified risky `onConflictDoUpdate` calls with the robust `upsertRecord` utility. This utility performs a "Check-Then-Act" operation which works regardless of database constraints, preventing 500 errors.

## Recommendations
1. **Apply Migration:** Run `migration_avatar_config_unique.sql` to enforce data integrity for avatars.
2. **Verify Other Tables:** Check `user_summary_latest` and `relationship_depth` tables in the database. If they lack unique constraints on `user_id`, create similar migrations for them.
3. **Deploy Refactor:** Switch the application to use `storage-refactored.ts` (rename to `storage.ts`).
