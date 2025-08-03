
import { db } from '../db';
import { customersTable, transactionsTable, transactionItemsTable, productVariantsTable, productsTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';
import { eq, desc, asc } from 'drizzle-orm';

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  try {
    const result = await db.insert(customersTable)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const result = await db.select()
      .from(customersTable)
      .orderBy(asc(customersTable.name))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  try {
    const result = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch customer by ID:', error);
    throw error;
  }
}

export async function getCustomerPurchaseHistory(customerId: number): Promise<any[]> {
  try {
    const result = await db.select({
      transaction_id: transactionsTable.id,
      transaction_number: transactionsTable.transaction_number,
      total_amount: transactionsTable.total_amount,
      payment_method: transactionsTable.payment_method,
      transaction_date: transactionsTable.created_at,
      item_id: transactionItemsTable.id,
      product_name: productsTable.name,
      variant_name: productVariantsTable.variant_name,
      quantity: transactionItemsTable.quantity,
      unit_price: transactionItemsTable.unit_price,
      total_price: transactionItemsTable.total_price
    })
      .from(transactionsTable)
      .innerJoin(transactionItemsTable, eq(transactionsTable.id, transactionItemsTable.transaction_id))
      .innerJoin(productVariantsTable, eq(transactionItemsTable.product_variant_id, productVariantsTable.id))
      .innerJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
      .where(eq(transactionsTable.customer_id, customerId))
      .orderBy(desc(transactionsTable.created_at))
      .execute();

    // Convert numeric fields to numbers
    return result.map(row => ({
      ...row,
      total_amount: parseFloat(row.total_amount),
      unit_price: parseFloat(row.unit_price),
      total_price: parseFloat(row.total_price)
    }));
  } catch (error) {
    console.error('Failed to fetch customer purchase history:', error);
    throw error;
  }
}
