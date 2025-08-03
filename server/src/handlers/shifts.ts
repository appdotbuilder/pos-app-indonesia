
import { db } from '../db';
import { shiftsTable, transactionsTable, usersTable } from '../db/schema';
import { type Shift } from '../schema';
import { eq, and, isNull, sum, count, between, desc } from 'drizzle-orm';

export async function startShift(cashierId: number, openingCash: number): Promise<Shift> {
  try {
    // Check if cashier exists
    const cashier = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, cashierId))
      .limit(1)
      .execute();

    if (cashier.length === 0) {
      throw new Error('Cashier not found');
    }

    // Check if cashier already has an active shift
    const activeShift = await db.select()
      .from(shiftsTable)
      .where(
        and(
          eq(shiftsTable.cashier_id, cashierId),
          isNull(shiftsTable.end_time)
        )
      )
      .limit(1)
      .execute();

    if (activeShift.length > 0) {
      throw new Error('Cashier already has an active shift');
    }

    // Create new shift
    const result = await db.insert(shiftsTable)
      .values({
        cashier_id: cashierId,
        start_time: new Date(),
        opening_cash: openingCash.toString(),
        total_sales: '0',
        transaction_count: 0
      })
      .returning()
      .execute();

    const shift = result[0];
    return {
      ...shift,
      opening_cash: parseFloat(shift.opening_cash),
      closing_cash: shift.closing_cash ? parseFloat(shift.closing_cash) : null,
      total_sales: parseFloat(shift.total_sales)
    };
  } catch (error) {
    console.error('Start shift failed:', error);
    throw error;
  }
}

export async function endShift(shiftId: number, closingCash: number): Promise<Shift> {
  try {
    // Get the shift to end
    const shifts = await db.select()
      .from(shiftsTable)
      .where(eq(shiftsTable.id, shiftId))
      .limit(1)
      .execute();

    if (shifts.length === 0) {
      throw new Error('Shift not found');
    }

    const shift = shifts[0];

    if (shift.end_time) {
      throw new Error('Shift is already ended');
    }

    // Calculate total sales and transaction count for this shift period
    const salesData = await db.select({
      total_sales: sum(transactionsTable.total_amount),
      transaction_count: count(transactionsTable.id)
    })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.cashier_id, shift.cashier_id),
          between(transactionsTable.created_at, shift.start_time, new Date()),
          eq(transactionsTable.status, 'completed')
        )
      )
      .execute();

    const totalSales = salesData[0]?.total_sales ? parseFloat(salesData[0].total_sales) : 0;
    const transactionCount = salesData[0]?.transaction_count || 0;

    // Update shift with end time, closing cash, and calculated totals
    const result = await db.update(shiftsTable)
      .set({
        end_time: new Date(),
        closing_cash: closingCash.toString(),
        total_sales: totalSales.toString(),
        transaction_count: transactionCount
      })
      .where(eq(shiftsTable.id, shiftId))
      .returning()
      .execute();

    const updatedShift = result[0];
    return {
      ...updatedShift,
      opening_cash: parseFloat(updatedShift.opening_cash),
      closing_cash: parseFloat(updatedShift.closing_cash!),
      total_sales: parseFloat(updatedShift.total_sales)
    };
  } catch (error) {
    console.error('End shift failed:', error);
    throw error;
  }
}

export async function getCurrentShift(cashierId: number): Promise<Shift | null> {
  try {
    const shifts = await db.select()
      .from(shiftsTable)
      .where(
        and(
          eq(shiftsTable.cashier_id, cashierId),
          isNull(shiftsTable.end_time)
        )
      )
      .limit(1)
      .execute();

    if (shifts.length === 0) {
      return null;
    }

    const shift = shifts[0];
    return {
      ...shift,
      opening_cash: parseFloat(shift.opening_cash),
      closing_cash: shift.closing_cash ? parseFloat(shift.closing_cash) : null,
      total_sales: parseFloat(shift.total_sales)
    };
  } catch (error) {
    console.error('Get current shift failed:', error);
    throw error;
  }
}

export async function getShiftHistory(cashierId?: number): Promise<Shift[]> {
  try {
    // Build the query properly to avoid TypeScript inference issues
    const baseQuery = db.select().from(shiftsTable);
    
    let query;
    if (cashierId !== undefined) {
      query = baseQuery.where(eq(shiftsTable.cashier_id, cashierId));
    } else {
      query = baseQuery;
    }

    // Apply ordering - use desc for most recent first
    const results = await query
      .orderBy(desc(shiftsTable.start_time))
      .execute();

    return results.map(shift => ({
      ...shift,
      opening_cash: parseFloat(shift.opening_cash),
      closing_cash: shift.closing_cash ? parseFloat(shift.closing_cash) : null,
      total_sales: parseFloat(shift.total_sales)
    }));
  } catch (error) {
    console.error('Get shift history failed:', error);
    throw error;
  }
}
