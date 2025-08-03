
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  transactionsTable, 
  transactionItemsTable, 
  productVariantsTable, 
  productsTable,
  usersTable,
  customersTable,
  categoriesTable,
  shiftsTable
} from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { 
  createTransaction, 
  getTransactions, 
  getTransactionById, 
  getTransactionItems, 
  refundTransaction 
} from '../handlers/transactions';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async () => {
  const result = await db.insert(usersTable).values({
    username: 'testcashier',
    email: 'cashier@test.com',
    password_hash: 'hashedpassword',
    full_name: 'Test Cashier',
    role: 'cashier'
  }).returning().execute();
  return result[0];
};

const createTestCustomer = async () => {
  const result = await db.insert(customersTable).values({
    name: 'Test Customer',
    email: 'customer@test.com',
    phone: '1234567890',
    address: '123 Test St'
  }).returning().execute();
  return result[0];
};

const createTestProduct = async () => {
  const category = await db.insert(categoriesTable).values({
    name: 'Test Category',
    description: 'Category for testing'
  }).returning().execute();

  const product = await db.insert(productsTable).values({
    name: 'Test Product',
    description: 'Product for testing',
    category_id: category[0].id,
    base_price: '10.00'
  }).returning().execute();

  const variant = await db.insert(productVariantsTable).values({
    product_id: product[0].id,
    variant_name: 'Default Variant',
    sku: 'TEST-001',
    price: '15.99',
    stock_quantity: 100,
    low_stock_threshold: 10,
    size: 'M',
    color: 'Red',
    type: 'Standard'
  }).returning().execute();

  return variant[0];
};

describe('Transaction Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createTransaction', () => {
    it('should create a transaction with items', async () => {
      const cashier = await createTestUser();
      const customer = await createTestCustomer();
      const variant = await createTestProduct();

      const input: CreateTransactionInput = {
        customer_id: customer.id,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 2,
            unit_price: 15.99,
            discount_amount: 1.00
          }
        ],
        payment_method: 'cash',
        payment_amount: 35.00,
        discount_amount: 2.00,
        notes: 'Test transaction'
      };

      const result = await createTransaction(input);

      expect(result.id).toBeDefined();
      expect(result.transaction_number).toMatch(/^TXN-\d+-[a-z0-9]+$/);
      expect(result.customer_id).toEqual(customer.id);
      expect(result.cashier_id).toEqual(cashier.id);
      // Subtotal: (15.99 * 2) - 1.00 = 31.98 - 1.00 = 30.98
      expect(result.subtotal).toEqual(30.98);
      expect(result.discount_amount).toEqual(2.00);
      // Total: 30.98 - 2.00 = 28.98
      expect(result.total_amount).toEqual(28.98);
      expect(result.payment_amount).toEqual(35.00);
      // Change: 35.00 - 28.98 = 6.02
      expect(result.change_amount).toEqual(6.02);
      expect(result.payment_method).toEqual('cash');
      expect(result.status).toEqual('completed');
      expect(result.notes).toEqual('Test transaction');
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should create transaction items and update stock', async () => {
      const cashier = await createTestUser();
      const variant = await createTestProduct();
      const initialStock = variant.stock_quantity;

      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 3,
            unit_price: 15.99,
            discount_amount: 0
          }
        ],
        payment_method: 'card',
        payment_amount: 47.97,
        discount_amount: 0,
        notes: null
      };

      const transaction = await createTransaction(input);

      // Check transaction items were created
      const items = await db.select()
        .from(transactionItemsTable)
        .where(eq(transactionItemsTable.transaction_id, transaction.id))
        .execute();

      expect(items).toHaveLength(1);
      expect(items[0].product_variant_id).toEqual(variant.id);
      expect(items[0].quantity).toEqual(3);
      expect(parseFloat(items[0].unit_price)).toEqual(15.99);
      expect(parseFloat(items[0].total_price)).toEqual(47.97);

      // Check stock was updated
      const updatedVariant = await db.select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.id, variant.id))
        .execute();

      expect(updatedVariant[0].stock_quantity).toEqual(initialStock - 3);
    });

    it('should throw error for insufficient stock', async () => {
      const cashier = await createTestUser();
      const variant = await createTestProduct();

      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 150, // More than available stock (100)
            unit_price: 15.99,
            discount_amount: 0
          }
        ],
        payment_method: 'cash',
        payment_amount: 100.00,
        discount_amount: 0,
        notes: null
      };

      await expect(createTransaction(input)).rejects.toThrow(/insufficient stock/i);
    });

    it('should throw error for non-existent product variant', async () => {
      const cashier = await createTestUser();

      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: 99999, // Non-existent ID
            quantity: 1,
            unit_price: 15.99,
            discount_amount: 0
          }
        ],
        payment_method: 'cash',
        payment_amount: 20.00,
        discount_amount: 0,
        notes: null
      };

      await expect(createTransaction(input)).rejects.toThrow(/product variant.*not found/i);
    });
  });

  describe('getTransactions', () => {
    it('should return all transactions', async () => {
      const cashier = await createTestUser();
      const variant = await createTestProduct();

      // Create a test transaction
      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
            unit_price: 15.99,
            discount_amount: 0
          }
        ],
        payment_method: 'cash',
        payment_amount: 20.00,
        discount_amount: 0,
        notes: 'Test transaction'
      };

      await createTransaction(input);

      const transactions = await getTransactions();

      expect(transactions).toHaveLength(1);
      expect(transactions[0].cashier_id).toEqual(cashier.id);
      expect(transactions[0].total_amount).toEqual(15.99);
      expect(transactions[0].payment_method).toEqual('cash');
      expect(transactions[0].status).toEqual('completed');
    });

    it('should return empty array when no transactions exist', async () => {
      const transactions = await getTransactions();
      expect(transactions).toHaveLength(0);
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction by ID', async () => {
      const cashier = await createTestUser();
      const variant = await createTestProduct();

      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
            unit_price: 15.99,
            discount_amount: 0
          }
        ],
        payment_method: 'qr_code',
        payment_amount: 15.99,
        discount_amount: 0,
        notes: null
      };

      const created = await createTransaction(input);
      const fetched = await getTransactionById(created.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.id).toEqual(created.id);
      expect(fetched!.transaction_number).toEqual(created.transaction_number);
      expect(fetched!.cashier_id).toEqual(cashier.id);
      expect(fetched!.total_amount).toEqual(15.99);
      expect(fetched!.payment_method).toEqual('qr_code');
    });

    it('should return null for non-existent transaction', async () => {
      const transaction = await getTransactionById(99999);
      expect(transaction).toBeNull();
    });
  });

  describe('getTransactionItems', () => {
    it('should return transaction items', async () => {
      const cashier = await createTestUser();
      const variant = await createTestProduct();

      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 2,
            unit_price: 15.99,
            discount_amount: 1.50
          }
        ],
        payment_method: 'e_wallet',
        payment_amount: 30.00,
        discount_amount: 0,
        notes: null
      };

      const transaction = await createTransaction(input);
      const items = await getTransactionItems(transaction.id);

      expect(items).toHaveLength(1);
      expect(items[0].transaction_id).toEqual(transaction.id);
      expect(items[0].product_variant_id).toEqual(variant.id);
      expect(items[0].quantity).toEqual(2);
      expect(items[0].unit_price).toEqual(15.99);
      expect(items[0].discount_amount).toEqual(1.50);
      // Total price: (15.99 * 2) - 1.50 = 31.98 - 1.50 = 30.48
      expect(items[0].total_price).toEqual(30.48);
    });

    it('should return empty array for transaction with no items', async () => {
      const items = await getTransactionItems(99999);
      expect(items).toHaveLength(0);
    });
  });

  describe('refundTransaction', () => {
    it('should refund transaction and restore stock', async () => {
      const cashier = await createTestUser();
      const variant = await createTestProduct();
      const initialStock = variant.stock_quantity;

      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 5,
            unit_price: 15.99,
            discount_amount: 0
          }
        ],
        payment_method: 'cash',
        payment_amount: 79.95,
        discount_amount: 0,
        notes: null
      };

      const transaction = await createTransaction(input);
      
      // Verify stock was reduced
      let currentVariant = await db.select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.id, variant.id))
        .execute();
      expect(currentVariant[0].stock_quantity).toEqual(initialStock - 5);

      // Refund the transaction
      const refunded = await refundTransaction(transaction.id);

      expect(refunded.id).toEqual(transaction.id);
      expect(refunded.status).toEqual('refunded');
      expect(refunded.updated_at).toBeInstanceOf(Date);

      // Verify stock was restored
      currentVariant = await db.select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.id, variant.id))
        .execute();
      expect(currentVariant[0].stock_quantity).toEqual(initialStock);
    });

    it('should throw error for non-existent transaction', async () => {
      await expect(refundTransaction(99999)).rejects.toThrow(/transaction.*not found/i);
    });

    it('should throw error for already refunded transaction', async () => {
      const cashier = await createTestUser();
      const variant = await createTestProduct();

      const input: CreateTransactionInput = {
        customer_id: null,
        cashier_id: cashier.id,
        items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
            unit_price: 15.99,
            discount_amount: 0
          }
        ],
        payment_method: 'cash',
        payment_amount: 20.00,
        discount_amount: 0,
        notes: null
      };

      const transaction = await createTransaction(input);
      
      // Refund once
      await refundTransaction(transaction.id);
      
      // Try to refund again
      await expect(refundTransaction(transaction.id)).rejects.toThrow(/already refunded/i);
    });
  });
});
