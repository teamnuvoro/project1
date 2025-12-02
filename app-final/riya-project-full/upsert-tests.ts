import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertRecord } from './server/upsert-utility';
import { db } from './server/db';
import { eq } from 'drizzle-orm';

// Mock the database module
vi.mock('./server/db', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
    }
}));

// Mock Drizzle ORM functions
vi.mock('drizzle-orm', async () => {
    const actual = await vi.importActual('drizzle-orm');
    return {
        ...actual,
        eq: vi.fn(),
    };
});

describe('Upsert Utility', () => {
    const mockTable = { _: { name: 'mock_table' } } as any;
    const mockKeyColumn = { name: 'user_id' } as any;
    const mockIdColumn = { name: 'id' } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should INSERT a new record when none exists', async () => {
        // Setup: db.select returns empty array (no existing record)
        const selectChain = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([]),
        };
        (db.select as any).mockReturnValue(selectChain);

        // Setup: db.insert returns the new record
        const newRecord = { id: 1, user_id: 123, value: 'test' };
        const insertChain = {
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([newRecord]),
        };
        (db.insert as any).mockReturnValue(insertChain);

        const result = await upsertRecord(mockTable, mockKeyColumn, 123, { value: 'test' });

        expect(result.success).toBe(true);
        expect(result.action).toBe('created');
        expect(result.data).toEqual(newRecord);
        expect(db.insert).toHaveBeenCalled();
        expect(db.update).not.toHaveBeenCalled();
    });

    it('should UPDATE an existing record when one exists', async () => {
        // Setup: db.select returns one existing record
        const existingRecord = { id: 1, user_id: 123, value: 'old' };
        const selectChain = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([existingRecord]),
        };
        (db.select as any).mockReturnValue(selectChain);

        // Setup: db.update returns the updated record
        const updatedRecord = { id: 1, user_id: 123, value: 'new' };
        const updateChain = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([updatedRecord]),
        };
        (db.update as any).mockReturnValue(updateChain);

        const result = await upsertRecord(mockTable, mockKeyColumn, 123, { value: 'new' });

        expect(result.success).toBe(true);
        expect(result.action).toBe('updated');
        expect(result.data).toEqual(updatedRecord);
        expect(db.update).toHaveBeenCalled();
        expect(db.insert).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
        // Setup: db.select throws an error
        (db.select as any).mockImplementation(() => {
            throw new Error('Database connection failed');
        });

        const result = await upsertRecord(mockTable, mockKeyColumn, 123, { value: 'test' });

        expect(result.success).toBe(false);
        expect(result.action).toBe('error');
        expect(result.error).toContain('Database connection failed');
    });
});
