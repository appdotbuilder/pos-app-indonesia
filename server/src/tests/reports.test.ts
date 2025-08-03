
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createDB, resetDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  productsTable, 
  productVariantsTable, 
  transactionsTable, 
  transactionItemsTable,
  shiftsTable,
  categoriesTable
} from '../db/schema';
import { 
  getSalesReport, 
  getTopSellingProducts, 
  getProfitReport, 
  getInventoryReport, 
  getDashboardStats 
} from '../handlers/reports';
import { type SalesReportQuery, type InventoryReportQuery } from '../schema';

describe('Reports Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getSalesReport', () => {
    it('should return sales report for date range', async () => {
      // Create test data
      const cashier = await db.insert(usersTable).values({
        username: 'cashier1',
        email: 'cashier@test.com',
        password_hash: 'hash123',
        full_name: 'Test Cashier',
        role: 'cashier'
      }).returning().execute();

      const category = await db.insert(categoriesTable).values({
        name: 'Test Category',
        description: 'Test category description'
      }).returning().execute();

      const product = await db.insert(productsTable).values({
        name: 'Test Product',
        description: 'Test product',
        category_id: category[0].id,
        base_price: '10.00'
      }).returning().execute();

      const variant = await db.insert(productVariantsTable).values({
        product_id: product[0].id,
        variant_name: 'Default',
        sku: 'TEST-001',
        price: '15.00',
        stock_quantity: 100,
        low_stock_threshold: 10
      }).returning().execute();

      // Create transactions for testing
      const transaction1 = await db.insert(transactionsTable).values({
        transaction_number: 'TXN-001',
        cashier_id: cashier[0].id,
        subtotal: '100.00',
        discount_amount: '5.00',
        tax_amount: '9.50',
        total_amount: '104.50',
        payment_method: 'cash',
        payment_amount: '105.00',
        change_amount: '0.50',
        status: 'completed'
      }).returning().execute();

      const transaction2 = await db.insert(transactionsTable).values({
        transaction_number: 'TXN-002',
        cashier_id: cashier[0].id,
        subtotal: '200.00',
        discount_amount: '10.00',
        tax_amount: '19.00',
        total_amount: '209.00',
        payment_method: 'card',
        payment_amount: '209.00',
        change_amount: '0.00',
        status: 'completed'
      }).returning().execute();

      await db.insert(transactionItemsTable).values([
        {
          transaction_id: transaction1[0].id,
          product_variant_id: variant[0].id,
          quantity: 2,
          unit_price: '15.00',
          discount_amount: '0.00',
          total_price: '30.00'
        },
        {
          transaction_id: transaction2[0].id,
          product_variant_id: variant[0].id,
          quantity: 3,
          unit_price: '15.00',
          discount_amount: '0.00',
          total_price: '45.00'
        }
      ]).execute();

      const today = new Date();
      const query: SalesReportQuery = {
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };

      const result = await getSalesReport(query);

      expect(result.period.start_date).toBe(query.start_date);
      expect(result.period.end_date).toBe(query.end_date);
      expect(result.total_sales).toBe(313.50);
      expect(result.transaction_count).toBe(2);
      expect(result.average_transaction).toBeGreaterThan(0);
      expect(result.payment_methods.cash).toBeDefined();
      expect(result.payment_methods.card).toBeDefined();
      expect(result.payment_methods.cash.total_amount).toBe(104.50);
      expect(result.payment_methods.card.total_amount).toBe(209.00);
      expect(result.cashier_performance).toHaveLength(1);
      expect(result.daily_breakdown).toHaveLength(1);
    });

    it('should filter by cashier when specified', async () => {
      const cashier1 = await db.insert(usersTable).values({
        username: 'cashier1',
        email: 'cashier1@test.com',
        password_hash: 'hash123',
        full_name: 'Cashier One',
        role: 'cashier'
      }).returning().execute();

      const cashier2 = await db.insert(usersTable).values({
        username: 'cashier2',
        email: 'cashier2@test.com',
        password_hash: 'hash123',
        full_name: 'Cashier Two',
        role: 'cashier'
      }).returning().execute();

      await db.insert(transactionsTable).values([
        {
          transaction_number: 'TXN-001',
          cashier_id: cashier1[0].id,
          subtotal: '100.00',
          total_amount: '100.00',
          payment_method: 'cash',
          payment_amount: '100.00',
          status: 'completed'
        },
        {
          transaction_number: 'TXN-002',
          cashier_id: cashier2[0].id,
          subtotal: '200.00',
          total_amount: '200.00',
          payment_method: 'card',
          payment_amount: '200.00',
          status: 'completed'
        }
      ]).execute();

      const today = new Date();
      const query: SalesReportQuery = {
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0],
        cashier_id: cashier1[0].id
      };

      const result = await getSalesReport(query);

      expect(result.total_sales).toBe(100.00);
      expect(result.transaction_count).toBe(1);
      expect(result.cashier_performance).toHaveLength(0); // No cashier breakdown when filtering by specific cashier
    });
  });

  describe('getTopSellingProducts', () => {
    it('should return top selling products by quantity', async () => {
      // Create test data
      const cashier = await db.insert(usersTable).values({
        username: 'cashier1',
        email: 'cashier@test.com',
        password_hash: 'hash123',
        full_name: 'Test Cashier',
        role: 'cashier'
      }).returning().execute();

      const category = await db.insert(categoriesTable).values({
        name: 'Test Category'
      }).returning().execute();

      const product = await db.insert(productsTable).values({
        name: 'Popular Product',
        category_id: category[0].id,
        base_price: '10.00'
      }).returning().execute();

      const variant = await db.insert(productVariantsTable).values({
        product_id: product[0].id,
        variant_name: 'Default',
        sku: 'POP-001',
        price: '15.00',
        stock_quantity: 100,
        low_stock_threshold: 10
      }).returning().execute();

      const transaction = await db.insert(transactionsTable).values({
        transaction_number: 'TXN-001',
        cashier_id: cashier[0].id,
        subtotal: '150.00',
        total_amount: '150.00',
        payment_method: 'cash',
        payment_amount: '150.00',
        status: 'completed'
      }).returning().execute();

      await db.insert(transactionItemsTable).values({
        transaction_id: transaction[0].id,
        product_variant_id: variant[0].id,
        quantity: 10,
        unit_price: '15.00',
        total_price: '150.00'
      }).execute();

      const result = await getTopSellingProducts(5);

      expect(result).toHaveLength(1);
      expect(result[0].product_name).toBe('Popular Product');
      expect(result[0].variant_name).toBe('Default');
      expect(result[0].sku).toBe('POP-001');
      expect(result[0].total_quantity).toBe(10);
      expect(result[0].total_revenue).toBe(150.00);
    });

    it('should limit results correctly', async () => {
      const result = await getTopSellingProducts(3);
      expect(result).toHaveLength(0); // No data created
    });
  });

  describe('getProfitReport', () => {
    it('should return profit report for date range', async () => {
      const cashier = await db.insert(usersTable).values({
        username: 'cashier1',
        email: 'cashier@test.com',
        password_hash: 'hash123',
        full_name: 'Test Cashier',
        role: 'cashier'
      }).returning().execute();

      const category = await db.insert(categoriesTable).values({
        name: 'Test Category'
      }).returning().execute();

      const product = await db.insert(productsTable).values({
        name: 'Profit Product',
        category_id: category[0].id,
        base_price: '10.00'
      }).returning().execute();

      const variant = await db.insert(productVariantsTable).values({
        product_id: product[0].id,
        variant_name: 'Default',
        sku: 'PROF-001',
        price: '20.00',
        stock_quantity: 50,
        low_stock_threshold: 5
      }).returning().execute();

      const transaction = await db.insert(transactionsTable).values({
        transaction_number: 'TXN-001',
        cashier_id: cashier[0].id,
        subtotal: '100.00',
        total_amount: '100.00',
        payment_method: 'cash',
        payment_amount: '100.00',
        status: 'completed'
      }).returning().execute();

      await db.insert(transactionItemsTable).values({
        transaction_id: transaction[0].id,
        product_variant_id: variant[0].id,
        quantity: 5,
        unit_price: '20.00',
        total_price: '100.00'
      }).execute();

      const today = new Date().toISOString().split('T')[0];
      const result = await getProfitReport(today, today);

      expect(result.total_revenue).toBe(100.00);
      expect(result.total_cost).toBe(0); // No cost data available
      expect(result.gross_profit).toBe(0); // Cannot calculate without cost
      expect(result.profit_margin).toBe(0); // Cannot calculate without cost
      expect(result.product_analysis).toHaveLength(1);
      expect(result.product_analysis[0].product_name).toBe('Profit Product');
      expect(result.product_analysis[0].total_revenue).toBe(100.00);
    });
  });

  describe('getInventoryReport', () => {
    it('should return inventory report with all products', async () => {
      const category = await db.insert(categoriesTable).values({
        name: 'Test Category'
      }).returning().execute();

      const product = await db.insert(productsTable).values({
        name: 'Inventory Product',
        category_id: category[0].id,
        base_price: '10.00'
      }).returning().execute();

      await db.insert(productVariantsTable).values([
        {
          product_id: product[0].id,
          variant_name: 'High Stock',
          sku: 'INV-HIGH',
          price: '25.00',
          stock_quantity: 100,
          low_stock_threshold: 10
        },
        {
          product_id: product[0].id,
          variant_name: 'Low Stock',
          sku: 'INV-LOW',
          price: '30.00',
          stock_quantity: 5,
          low_stock_threshold: 10
        }
      ]).execute();

      const query: InventoryReportQuery = {
        low_stock_only: false
      };

      const result = await getInventoryReport(query);

      expect(result).toHaveLength(2);
      expect(result[0].product_name).toBe('Inventory Product');
      expect(result[0].is_low_stock).toBeDefined();
      expect(typeof result[0].price).toBe('number');
      expect(typeof result[0].stock_value).toBe('number');
    });

    it('should filter low stock items only', async () => {
      const category = await db.insert(categoriesTable).values({
        name: 'Test Category'
      }).returning().execute();

      const product = await db.insert(productsTable).values({
        name: 'Inventory Product',
        category_id: category[0].id,
        base_price: '10.00'
      }).returning().execute();

      await db.insert(productVariantsTable).values([
        {
          product_id: product[0].id,
          variant_name: 'High Stock',
          sku: 'INV-HIGH',
          price: '25.00',
          stock_quantity: 100,
          low_stock_threshold: 10
        },
        {
          product_id: product[0].id,
          variant_name: 'Low Stock',
          sku: 'INV-LOW',
          price: '30.00',
          stock_quantity: 5,
          low_stock_threshold: 10
        }
      ]).execute();

      const query: InventoryReportQuery = {
        low_stock_only: true
      };

      const result = await getInventoryReport(query);

      expect(result).toHaveLength(1);
      expect(result[0].variant_name).toBe('Low Stock');
      expect(result[0].is_low_stock).toBe(true);
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      const cashier = await db.insert(usersTable).values({
        username: 'cashier1',
        email: 'cashier@test.com',
        password_hash: 'hash123',
        full_name: 'Dashboard Cashier',
        role: 'cashier'
      }).returning().execute();

      const category = await db.insert(categoriesTable).values({
        name: 'Test Category'
      }).returning().execute();

      const product = await db.insert(productsTable).values({
        name: 'Dashboard Product',
        category_id: category[0].id,
        base_price: '10.00'
      }).returning().execute();

      const variant = await db.insert(productVariantsTable).values({
        product_id: product[0].id,
        variant_name: 'Low Stock Variant',
        sku: 'DASH-001',
        price: '15.00',
        stock_quantity: 3,
        low_stock_threshold: 10
      }).returning().execute();

      // Create today's transaction
      await db.insert(transactionsTable).values({
        transaction_number: 'TXN-TODAY',
        cashier_id: cashier[0].id,
        subtotal: '50.00',
        total_amount: '50.00',
        payment_method: 'cash',
        payment_amount: '50.00',
        status: 'completed'
      }).execute();

      // Create active shift
      await db.insert(shiftsTable).values({
        cashier_id: cashier[0].id,
        start_time: new Date(),
        opening_cash: '100.00',
        total_sales: '0.00'
      }).execute();

      const result = await getDashboardStats();

      expect(typeof result.today_sales).toBe('number');
      expect(typeof result.today_transactions).toBe('number');
      expect(result.active_shifts).toBeGreaterThanOrEqual(1);
      expect(result.low_stock_alerts).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(result.recent_transactions)).toBe(true);

      if (result.recent_transactions.length > 0) {
        const recentTx = result.recent_transactions[0];
        expect(recentTx.transaction_number).toBeDefined();
        expect(typeof recentTx.total_amount).toBe('number');
        expect(recentTx.cashier_name).toBeDefined();
      }
    });
  });
});

