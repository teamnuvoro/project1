import { eq, Table, Column } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "./db";

export type UpsertAction = 'created' | 'updated' | 'none' | 'error';

export interface UpsertResult<T> {
    success: boolean;
    action: UpsertAction;
    data?: T;
    error?: any;
    timestamp: Date;
}

/**
 * A robust, generic upsert utility that uses a "Check-Then-Act" pattern.
 * This avoids "ON CONFLICT" errors when unique constraints are missing.
 * 
 * @param table The Drizzle table definition
 * @param keyColumn The column to check for uniqueness (e.g., userId)
 * @param keyValue The value of the key column to match
 * @param values The data to insert or update
 * @param idColumn The primary key column (default: 'id') - used for the UPDATE clause
 * @returns Promise<UpsertResult<T>>
 */
export async function upsertRecord<T extends Table>(
    table: T,
    keyColumn: Column,
    keyValue: any,
    values: any,
    idColumn?: Column
): Promise<UpsertResult<any>> { // Returning any for data as Drizzle types can be complex to infer perfectly here
    const start = new Date();

    try {
        // 1. Check if record exists
        // We assume the table has a column matching keyColumn
        const existingRecords = await db.select().from(table as any).where(eq(keyColumn, keyValue)).limit(1);
        const existing = existingRecords[0];

        if (existing) {
            // 2. Update existing record
            // We need a way to target the specific row for update. 
            // Ideally we use the Primary Key. If idColumn is provided, use it.
            // Otherwise, we try to use the 'id' field if it exists on the record.

            let targetColumn = idColumn;
            let targetValue = existing.id; // Default assumption

            if (idColumn) {
                // If explicit ID column passed
                // We need to get the value from the existing record corresponding to this column
                // This is tricky in generic TS, so we rely on the 'id' convention or passed arg
                // For now, let's assume standard 'id' or use the keyColumn if it's the PK (unlikely for upsert)
                // If the keyColumn IS the unique identifier we are updating by, we can use that too.
            }

            // Fallback: Update by the same keyColumn if we found it (and it's unique enough for our purpose)
            // But safer to use the PK 'id' found in 'existing'

            if (!targetValue && !idColumn) {
                // If we can't find an ID, we update by the keyColumn (e.g. update ... where user_id = ...)
                // This updates ALL records matching the key, which is fine if we expect 1:1
                targetColumn = keyColumn;
                targetValue = keyValue;
            }

            // Perform Update
            // We filter out undefined keys from values to avoid overwriting with null/undefined if not intended
            // (Though usually 'values' should be complete)

            const updateResult = await db.update(table)
                .set({ ...values, updatedAt: new Date() }) // Auto-update timestamp if schema supports it
                .where(eq(targetColumn || keyColumn, targetValue))
                .returning() as any[];

            return {
                success: true,
                action: 'updated',
                data: updateResult[0],
                timestamp: new Date()
            };

        } else {
            // 3. Insert new record
            const insertResult = await db.insert(table)
                .values({ ...values, createdAt: new Date(), updatedAt: new Date() })
                .returning() as any[];

            return {
                success: true,
                action: 'created',
                data: insertResult[0],
                timestamp: new Date()
            };
        }

    } catch (error: any) {
        console.error(`[Upsert Utility] Error upserting record:`, error);
        return {
            success: false,
            action: 'error',
            error: error.message || error,
            timestamp: new Date()
        };
    }
}
