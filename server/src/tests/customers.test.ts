
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, usersTable, categoriesTable, productsTable, productVariantsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer, getCustomers, getCustomerById, getCustomerPurchaseHistory } from '../handlers/customers';
import { eq } from 'drizzle-orm';

const testCustomerInput: CreateCustomerInput = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  address: '123 Main St, City, State'
};

const testCustomerInputMinimal: CreateCustomerInput = {
  name: 'Jane Smith',
  email: null,
  phone: null,
  address: null
};

describe('Customer Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createCustomer', () => {
    it('should create a customer with all fields', async () => {
      const result = await createCustomer(testCustomerInput);

      expect(result.name).toEqual('John Doe');
      expect(result.email).toEqual('john@example.com');
      expect(result.phone).toEqual('+1234567890');
      expect(result.address).toEqual('123 Main St, City, State');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a customer with minimal fields', async () => {
      const result = await createCustomer(testCustomerInputMinimal);

      expect(result.name).toEqual('Jane Smith');
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save customer to database', async () => {
      const result = await createCustomer(testCustomerInput);

      const customers = await db.select()
        .from(customersTable)
        .where(eq(customersTable.id, result.id))
        .execute();

      expect(customers).toHaveLength(1);
      expect(customers[0].name).toEqual('John Doe');
      expect(customers[0].email).toEqual('john@example.com');
    });
  });

  describe('getCustomers', () => {
    it('should return empty array when no customers exist', async () => {
      const result = await getCustomers();
      expect(result).toEqual([]);
    });

    it('should return all customers ordered by name', async () => {
      await createCustomer({ name: 'Zoe Wilson', email: null, phone: null, address: null });
      await createCustomer({ name: 'Alice Brown', email: null, phone: null, address: null });
      await createCustomer({ name: 'Bob Johnson', email: null, phone: null, address: null });

      const result = await getCustomers();

      expect(result).toHaveLength(3);
      expect(result[0].name).toEqual('Alice Brown');
      expect(result[1].name).toEqual('Bob Johnson');
      expect(result[2].name).toEqual('Zoe Wilson');
    });

    it('should return customers with all fields', async () => {
      await createCustomer(testCustomerInput);

      const result = await getCustomers();

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('John Doe');
      expect(result[0].email).toEqual('john@example.com');
      expect(result[0].phone).toEqual('+1234567890');
      expect(result[0].address).toEqual('123 Main St, City, State');
    });
  });

  describe('getCustomerById', () => {
    it('should return null when customer does not exist', async () => {
      const result = await getCustomerById(999);
      expect(result).toBeNull();
    });

    it('should return customer when found', async () => {
      const created = await createCustomer(testCustomerInput);

      const result = await getCustomerById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('John Doe');
      expect(result!.email).toEqual('john@example.com');
    });
  });

  describe('getCustomerPurchaseHistory', () => {
    it('should return empty array when customer has no purchases', async () => {
      const customer = await createCustomer(testCustomerInput);

      const result = await getCustomerPurchaseHistory(customer.id);

      expect(result).toEqual([]);
    });

    it('should return purchase history with transaction and product details', async () => {
      // Create prerequisite data
      const customer = await createCustomer(testCustomerInput);

      const cashier = await db.insert(usersTable)
        .values({
          username: 'cashier1',
          email: 'cashier@example.com',
          password_hash: 'hash',
          full_name: 'Test Cashier',
          role: 'cashier'
        })
        .returning()
        .execute();

      const category = await db.insert(categoriesTable)
        .values({
          name: 'Electronics',
          description: 'Electronic products'
        })
        .returning()
        .execute();

      const product = await db.insert(productsTable)
        .values({
          name: 'Laptop',
          description: 'Gaming laptop',
          category_id: category[0].id,
          base_price: '999.99'
        })
        .returning()
        .execute();

      const variant = await db.insert(productVariantsTable)
        .values({
          product_id: product[0].id,
          variant_name: '16GB RAM',
          sku: 'LAP-16GB',
          price: '1199.99',
          stock_quantity: 10,
          low_stock_threshold: 2
        })
        .returning()
        .execute();

      const transaction = await db.insert(transactionsTable)
        .values({
          transaction_number: 'TXN001',
          customer_id: customer.id,
          cashier_id: cashier[0].id,
          subtotal: '1199.99',
          discount_amount: '0',
          tax_amount: '120.00',
          total_amount: '1319.99',
          payment_method: 'card',
          payment_amount: '1319.99',
          change_amount: '0',
          status: 'completed'
        })
        .returning()
        .execute();

      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction[0].id,
          product_variant_id: variant[0].id,
          quantity: 1,
          unit_price: '1199.99',
          discount_amount: '0',
          total_price: '1199.99'
        })
        .execute();

      const result = await getCustomerPurchaseHistory(customer.id);

      expect(result).toHaveLength(1);
      expect(result[0].transaction_number).toEqual('TXN001');
      expect(result[0].product_name).toEqual('Laptop');
      expect(result[0].variant_name).toEqual('16GB RAM');
      expect(result[0].quantity).toEqual(1);
      expect(result[0].payment_method).toEqual('card');
      expect(typeof result[0].total_amount).toEqual('number');
      expect(result[0].total_amount).toEqual(1319.99);
      expect(typeof result[0].unit_price).toEqual('number');
      expect(result[0].unit_price).toEqual(1199.99);
      expect(typeof result[0].total_price).toEqual('number');
      expect(result[0].total_price).toEqual(1199.99);
    });

    it('should order purchase history by transaction date descending', async () => {
      // Create prerequisite data
      const customer = await createCustomer(testCustomerInput);

      const cashier = await db.insert(usersTable)
        .values({
          username: 'cashier1',
          email: 'cashier@example.com',
          password_hash: 'hash',
          full_name: 'Test Cashier',
          role: 'cashier'
        })
        .returning()
        .execute();

      const category = await db.insert(categoriesTable)
        .values({
          name: 'Books',
          description: 'Book products'
        })
        .returning()
        .execute();

      const product = await db.insert(productsTable)
        .values({
          name: 'Novel',
          description: 'Fiction book',
          category_id: category[0].id,
          base_price: '19.99'
        })
        .returning()
        .execute();

      const variant = await db.insert(productVariantsTable)
        .values({
          product_id: product[0].id,
          variant_name: 'Paperback',
          sku: 'BOOK-PB',
          price: '19.99',
          stock_quantity: 50,
          low_stock_threshold: 5
        })
        .returning()
        .execute();

      // Create two transactions with different timestamps
      const transaction1 = await db.insert(transactionsTable)
        .values({
          transaction_number: 'TXN001',
          customer_id: customer.id,
          cashier_id: cashier[0].id,
          subtotal: '19.99',
          total_amount: '19.99',
          payment_method: 'cash',
          payment_amount: '20.00',
          change_amount: '0.01'
        })
        .returning()
        .execute();

      const transaction2 = await db.insert(transactionsTable)
        .values({
          transaction_number: 'TXN002',
          customer_id: customer.id,
          cashier_id: cashier[0].id,
          subtotal: '39.98',
          total_amount: '39.98',
          payment_method: 'card',
          payment_amount: '39.98',
          change_amount: '0'
        })
        .returning()
        .execute();

      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction1[0].id,
          product_variant_id: variant[0].id,
          quantity: 1,
          unit_price: '19.99',
          total_price: '19.99'
        })
        .execute();

      await db.insert(transactionItemsTable)
        .values({
          transaction_id: transaction2[0].id,
          product_variant_id: variant[0].id,
          quantity: 2,
          unit_price: '19.99',
          total_price: '39.98'
        })
        .execute();

      const result = await getCustomerPurchaseHistory(customer.id);

      expect(result).toHaveLength(2);
      // Should be ordered by transaction date desc, so newer transaction first
      expect(result[0].transaction_number).toEqual('TXN002');
      expect(result[1].transaction_number).toEqual('TXN001');
    });
  });
});
