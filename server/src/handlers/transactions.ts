
import { db } from '../db';
import { 
  transactionsTable, 
  transactionItemsTable, 
  productVariantsTable,
  shiftsTable,
  usersTable,
  customersTable
} from '../db/schema';
import { type CreateTransactionInput, type Transaction, type TransactionItem } from '../schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // Generate unique transaction number
    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate stock availability for all items
    for (const item of input.items) {
      const variant = await db.select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.id, item.product_variant_id))
        .execute();
      
      if (variant.length === 0) {
        throw new Error(`Product variant with ID ${item.product_variant_id} not found`);
      }
      
      if (variant[0].stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for variant ${variant[0].variant_name}. Available: ${variant[0].stock_quantity}, Required: ${item.quantity}`);
      }
    }

    // Calculate totals - each item's total should be (unit_price * quantity) - discount_amount
    const subtotal = input.items.reduce((sum, item) => {
      const itemTotal = (item.unit_price * item.quantity) - item.discount_amount;
      return sum + itemTotal;
    }, 0);
    
    const tax_amount = 0; // Could be calculated based on business rules
    const total_amount = subtotal - input.discount_amount + tax_amount;
    const change_amount = input.payment_amount - total_amount;

    // Create transaction
    const transactionResult = await db.insert(transactionsTable)
      .values({
        transaction_number: transactionNumber,
        customer_id: input.customer_id,
        cashier_id: input.cashier_id,
        subtotal: subtotal.toString(),
        discount_amount: input.discount_amount.toString(),
        tax_amount: tax_amount.toString(),
        total_amount: total_amount.toString(),
        payment_method: input.payment_method,
        payment_amount: input.payment_amount.toString(),
        change_amount: change_amount.toString(),
        status: 'completed',
        notes: input.notes
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Create transaction items and update stock
    for (const item of input.items) {
      const total_price = (item.unit_price * item.quantity) - item.discount_amount;
      
      // Create transaction item
      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction.id,
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          discount_amount: item.discount_amount.toString(),
          total_price: total_price.toString()
        })
        .execute();

      // Update product variant stock
      await db.update(productVariantsTable)
        .set({
          stock_quantity: sql`stock_quantity - ${item.quantity}`,
          updated_at: new Date()
        })
        .where(eq(productVariantsTable.id, item.product_variant_id))
        .execute();
    }

    // Update shift statistics if there's an active shift for the cashier
    await db.update(shiftsTable)
      .set({
        total_sales: sql`total_sales + ${total_amount}`,
        transaction_count: sql`transaction_count + 1`
      })
      .where(and(
        eq(shiftsTable.cashier_id, input.cashier_id),
        isNull(shiftsTable.end_time)
      ))
      .execute();

    // Return transaction with numeric conversions
    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      discount_amount: parseFloat(transaction.discount_amount),
      tax_amount: parseFloat(transaction.tax_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_amount: parseFloat(transaction.payment_amount),
      change_amount: parseFloat(transaction.change_amount)
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .execute();

    return results.map(transaction => ({
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      discount_amount: parseFloat(transaction.discount_amount),
      tax_amount: parseFloat(transaction.tax_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_amount: parseFloat(transaction.payment_amount),
      change_amount: parseFloat(transaction.change_amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  try {
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const transaction = results[0];
    return {
      ...transaction,
      subtotal: parseFloat(transaction.subtotal),
      discount_amount: parseFloat(transaction.discount_amount),
      tax_amount: parseFloat(transaction.tax_amount),
      total_amount: parseFloat(transaction.total_amount),
      payment_amount: parseFloat(transaction.payment_amount),
      change_amount: parseFloat(transaction.change_amount)
    };
  } catch (error) {
    console.error('Failed to fetch transaction by ID:', error);
    throw error;
  }
}

export async function getTransactionItems(transactionId: number): Promise<TransactionItem[]> {
  try {
    const results = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price),
      discount_amount: parseFloat(item.discount_amount),
      total_price: parseFloat(item.total_price)
    }));
  } catch (error) {
    console.error('Failed to fetch transaction items:', error);
    throw error;
  }
}

export async function refundTransaction(transactionId: number): Promise<Transaction> {
  try {
    // Get transaction details
    const transactionResult = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    if (transactionResult.length === 0) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }

    const transaction = transactionResult[0];

    if (transaction.status === 'refunded') {
      throw new Error('Transaction is already refunded');
    }

    // Get transaction items to restore stock
    const items = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, transactionId))
      .execute();

    // Restore stock quantities for all items
    for (const item of items) {
      await db.update(productVariantsTable)
        .set({
          stock_quantity: sql`stock_quantity + ${item.quantity}`,
          updated_at: new Date()
        })
        .where(eq(productVariantsTable.id, item.product_variant_id))
        .execute();
    }

    // Update transaction status to refunded
    const updatedResult = await db.update(transactionsTable)
      .set({
        status: 'refunded',
        updated_at: new Date()
      })
      .where(eq(transactionsTable.id, transactionId))
      .returning()
      .execute();

    const updatedTransaction = updatedResult[0];

    // Update shift statistics if there's an active shift for the cashier
    const totalAmount = parseFloat(transaction.total_amount);
    await db.update(shiftsTable)
      .set({
        total_sales: sql`total_sales - ${totalAmount}`,
        transaction_count: sql`transaction_count - 1`
      })
      .where(and(
        eq(shiftsTable.cashier_id, transaction.cashier_id),
        isNull(shiftsTable.end_time)
      ))
      .execute();

    return {
      ...updatedTransaction,
      subtotal: parseFloat(updatedTransaction.subtotal),
      discount_amount: parseFloat(updatedTransaction.discount_amount),
      tax_amount: parseFloat(updatedTransaction.tax_amount),
      total_amount: parseFloat(updatedTransaction.total_amount),
      payment_amount: parseFloat(updatedTransaction.payment_amount),
      change_amount: parseFloat(updatedTransaction.change_amount)
    };
  } catch (error) {
    console.error('Transaction refund failed:', error);
    throw error;
  }
}
