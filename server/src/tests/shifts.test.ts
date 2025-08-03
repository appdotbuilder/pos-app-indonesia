
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shiftsTable, transactionsTable } from '../db/schema';
import { startShift, endShift, getCurrentShift, getShiftHistory } from '../handlers/shifts';
import { eq, and, isNull } from 'drizzle-orm';

describe('Shifts handlers', () => {
  let testCashierId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test cashier
    const cashierResult = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();
    
    testCashierId = cashierResult[0].id;
  });

  afterEach(resetDB);

  describe('startShift', () => {
    it('should start a new shift', async () => {
      const openingCash = 500.00;
      const result = await startShift(testCashierId, openingCash);

      expect(result.cashier_id).toEqual(testCashierId);
      expect(result.opening_cash).toEqual(500.00);
      expect(result.closing_cash).toBeNull();
      expect(result.total_sales).toEqual(0);
      expect(result.transaction_count).toEqual(0);
      expect(result.start_time).toBeInstanceOf(Date);
      expect(result.end_time).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save shift to database', async () => {
      const result = await startShift(testCashierId, 300.00);

      const shifts = await db.select()
        .from(shiftsTable)
        .where(eq(shiftsTable.id, result.id))
        .execute();

      expect(shifts).toHaveLength(1);
      expect(shifts[0].cashier_id).toEqual(testCashierId);
      expect(parseFloat(shifts[0].opening_cash)).toEqual(300.00);
      expect(shifts[0].end_time).toBeNull();
    });

    it('should throw error for non-existent cashier', async () => {
      await expect(startShift(99999, 500.00)).rejects.toThrow(/cashier not found/i);
    });

    it('should throw error if cashier already has active shift', async () => {
      await startShift(testCashierId, 500.00);
      
      await expect(startShift(testCashierId, 600.00)).rejects.toThrow(/already has an active shift/i);
    });
  });

  describe('endShift', () => {
    it('should end an active shift', async () => {
      const shift = await startShift(testCashierId, 500.00);
      const closingCash = 750.00;
      
      const result = await endShift(shift.id, closingCash);

      expect(result.id).toEqual(shift.id);
      expect(result.cashier_id).toEqual(testCashierId);
      expect(result.opening_cash).toEqual(500.00);
      expect(result.closing_cash).toEqual(750.00);
      expect(result.end_time).toBeInstanceOf(Date);
      expect(result.total_sales).toEqual(0);
      expect(result.transaction_count).toEqual(0);
    });

    it('should calculate sales totals from transactions', async () => {
      const shift = await startShift(testCashierId, 500.00);

      // Create test transactions during shift period
      await db.insert(transactionsTable)
        .values([
          {
            transaction_number: 'TXN001',
            cashier_id: testCashierId,
            subtotal: '100.00',
            total_amount: '100.00',
            payment_method: 'cash',
            payment_amount: '100.00',
            status: 'completed'
          },
          {
            transaction_number: 'TXN002',
            cashier_id: testCashierId,
            subtotal: '50.00',
            total_amount: '50.00',
            payment_method: 'card',
            payment_amount: '50.00',
            status: 'completed'
          }
        ])
        .execute();

      const result = await endShift(shift.id, 650.00);

      expect(result.total_sales).toEqual(150.00);
      expect(result.transaction_count).toEqual(2);
    });

    it('should throw error for non-existent shift', async () => {
      await expect(endShift(99999, 500.00)).rejects.toThrow(/shift not found/i);
    });

    it('should throw error for already ended shift', async () => {
      const shift = await startShift(testCashierId, 500.00);
      await endShift(shift.id, 600.00);
      
      await expect(endShift(shift.id, 700.00)).rejects.toThrow(/already ended/i);
    });
  });

  describe('getCurrentShift', () => {
    it('should return active shift for cashier', async () => {
      const shift = await startShift(testCashierId, 500.00);
      
      const result = await getCurrentShift(testCashierId);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(shift.id);
      expect(result!.cashier_id).toEqual(testCashierId);
      expect(result!.end_time).toBeNull();
    });

    it('should return null if no active shift', async () => {
      const result = await getCurrentShift(testCashierId);
      
      expect(result).toBeNull();
    });

    it('should return null after shift is ended', async () => {
      const shift = await startShift(testCashierId, 500.00);
      await endShift(shift.id, 600.00);
      
      const result = await getCurrentShift(testCashierId);
      
      expect(result).toBeNull();
    });
  });

  describe('getShiftHistory', () => {
    it('should return all shifts when no cashier filter', async () => {
      // Create another cashier
      const cashier2Result = await db.insert(usersTable)
        .values({
          username: 'cashier2',
          email: 'cashier2@test.com',
          password_hash: 'hashedpassword',
          full_name: 'Cashier Two',
          role: 'cashier'
        })
        .returning()
        .execute();

      // Create shifts for both cashiers
      const shift1 = await startShift(testCashierId, 500.00);
      const shift2 = await startShift(cashier2Result[0].id, 300.00);
      
      const result = await getShiftHistory();

      expect(result).toHaveLength(2);
      expect(result.some(s => s.id === shift1.id)).toBe(true);
      expect(result.some(s => s.id === shift2.id)).toBe(true);
    });

    it('should filter shifts by cashier ID', async () => {
      // Create another cashier
      const cashier2Result = await db.insert(usersTable)
        .values({
          username: 'cashier2',
          email: 'cashier2@test.com',
          password_hash: 'hashedpassword',
          full_name: 'Cashier Two',
          role: 'cashier'
        })
        .returning()
        .execute();

      // Create shifts for both cashiers
      const shift1 = await startShift(testCashierId, 500.00);
      await startShift(cashier2Result[0].id, 300.00);
      
      const result = await getShiftHistory(testCashierId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual(shift1.id);
      expect(result[0].cashier_id).toEqual(testCashierId);
    });

    it('should return empty array if no shifts found', async () => {
      const result = await getShiftHistory(testCashierId);
      
      expect(result).toHaveLength(0);
    });

    it('should include both active and ended shifts', async () => {
      const activeShift = await startShift(testCashierId, 500.00);
      
      // Create another cashier for ended shift
      const cashier2Result = await db.insert(usersTable)
        .values({
          username: 'cashier2',
          email: 'cashier2@test.com',
          password_hash: 'hashedpassword',
          full_name: 'Cashier Two',
          role: 'cashier'
        })
        .returning()
        .execute();

      const endedShift = await startShift(cashier2Result[0].id, 300.00);
      await endShift(endedShift.id, 400.00);
      
      const result = await getShiftHistory();

      expect(result).toHaveLength(2);
      expect(result.some(s => s.id === activeShift.id && s.end_time === null)).toBe(true);
      expect(result.some(s => s.id === endedShift.id && s.end_time !== null)).toBe(true);
    });
  });
});
