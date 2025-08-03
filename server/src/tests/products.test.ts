
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, productVariantsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput, type CreateProductVariantInput } from '../schema';
import { 
  createProduct, 
  getProducts, 
  createProductVariant, 
  getProductVariants, 
  getLowStockVariants, 
  updateStock 
} from '../handlers/products';
import { eq } from 'drizzle-orm';

// Test data
const testCategory = {
  name: 'Electronics',
  description: 'Electronic products'
};

const testProductInput: CreateProductInput = {
  name: 'Test Product',
  description: 'A product for testing',
  category_id: null,
  base_price: 99.99
};

const testProductWithCategoryInput: CreateProductInput = {
  name: 'Test Product with Category',
  description: 'A product with category',
  category_id: 1,
  base_price: 149.99
};

const testVariantInput: CreateProductVariantInput = {
  product_id: 1,
  variant_name: 'Standard Version',
  sku: 'TEST-001',
  price: 99.99,
  stock_quantity: 50,
  low_stock_threshold: 10,
  size: 'Medium',
  color: 'Blue',
  type: 'Standard'
};

describe('Products Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createProduct', () => {
    it('should create a product without category', async () => {
      const result = await createProduct(testProductInput);

      expect(result.name).toEqual('Test Product');
      expect(result.description).toEqual('A product for testing');
      expect(result.category_id).toBeNull();
      expect(result.base_price).toEqual(99.99);
      expect(typeof result.base_price).toBe('number');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a product with valid category', async () => {
      // Create category first
      const categoryResult = await db.insert(categoriesTable)
        .values(testCategory)
        .returning()
        .execute();

      const result = await createProduct({
        ...testProductWithCategoryInput,
        category_id: categoryResult[0].id
      });

      expect(result.name).toEqual('Test Product with Category');
      expect(result.category_id).toEqual(categoryResult[0].id);
      expect(result.base_price).toEqual(149.99);
      expect(typeof result.base_price).toBe('number');
    });

    it('should save product to database', async () => {
      const result = await createProduct(testProductInput);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, result.id))
        .execute();

      expect(products).toHaveLength(1);
      expect(products[0].name).toEqual('Test Product');
      expect(parseFloat(products[0].base_price)).toEqual(99.99);
    });

    it('should throw error for non-existent category', async () => {
      expect(async () => {
        await createProduct({
          ...testProductInput,
          category_id: 999
        });
      }).toThrow(/Category with id 999 does not exist/);
    });
  });

  describe('getProducts', () => {
    it('should return empty array when no products exist', async () => {
      const result = await getProducts();
      expect(result).toEqual([]);
    });

    it('should return all products with correct numeric conversion', async () => {
      await createProduct(testProductInput);
      await createProduct({
        ...testProductInput,
        name: 'Second Product',
        base_price: 199.99
      });

      const result = await getProducts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Test Product');
      expect(result[0].base_price).toEqual(99.99);
      expect(typeof result[0].base_price).toBe('number');
      expect(result[1].name).toEqual('Second Product');
      expect(result[1].base_price).toEqual(199.99);
      expect(typeof result[1].base_price).toBe('number');
    });
  });

  describe('createProductVariant', () => {
    beforeEach(async () => {
      // Create a product for variant testing
      await createProduct(testProductInput);
    });

    it('should create a product variant', async () => {
      const result = await createProductVariant(testVariantInput);

      expect(result.product_id).toEqual(1);
      expect(result.variant_name).toEqual('Standard Version');
      expect(result.sku).toEqual('TEST-001');
      expect(result.price).toEqual(99.99);
      expect(typeof result.price).toBe('number');
      expect(result.stock_quantity).toEqual(50);
      expect(result.low_stock_threshold).toEqual(10);
      expect(result.size).toEqual('Medium');
      expect(result.color).toEqual('Blue');
      expect(result.type).toEqual('Standard');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save variant to database', async () => {
      const result = await createProductVariant(testVariantInput);

      const variants = await db.select()
        .from(productVariantsTable)
        .where(eq(productVariantsTable.id, result.id))
        .execute();

      expect(variants).toHaveLength(1);
      expect(variants[0].sku).toEqual('TEST-001');
      expect(parseFloat(variants[0].price)).toEqual(99.99);
      expect(variants[0].stock_quantity).toEqual(50);
    });

    it('should throw error for non-existent product', async () => {
      expect(async () => {
        await createProductVariant({
          ...testVariantInput,
          product_id: 999
        });
      }).toThrow(/Product with id 999 does not exist/);
    });

    it('should throw error for duplicate SKU', async () => {
      await createProductVariant(testVariantInput);

      expect(async () => {
        await createProductVariant({
          ...testVariantInput,
          sku: 'TEST-001'
        });
      }).toThrow(/SKU TEST-001 already exists/);
    });
  });

  describe('getProductVariants', () => {
    beforeEach(async () => {
      await createProduct(testProductInput);
    });

    it('should return empty array when no variants exist', async () => {
      const result = await getProductVariants();
      expect(result).toEqual([]);
    });

    it('should return all variants with correct numeric conversion', async () => {
      await createProductVariant(testVariantInput);
      await createProductVariant({
        ...testVariantInput,
        sku: 'TEST-002',
        variant_name: 'Premium Version',
        price: 149.99
      });

      const result = await getProductVariants();

      expect(result).toHaveLength(2);
      expect(result[0].sku).toEqual('TEST-001');
      expect(result[0].price).toEqual(99.99);
      expect(typeof result[0].price).toBe('number');
      expect(result[1].sku).toEqual('TEST-002');
      expect(result[1].price).toEqual(149.99);
      expect(typeof result[1].price).toBe('number');
    });
  });

  describe('getLowStockVariants', () => {
    beforeEach(async () => {
      await createProduct(testProductInput);
    });

    it('should return empty array when no low stock variants exist', async () => {
      await createProductVariant({
        ...testVariantInput,
        stock_quantity: 50,
        low_stock_threshold: 10
      });

      const result = await getLowStockVariants();
      expect(result).toEqual([]);
    });

    it('should return variants with stock at or below threshold', async () => {
      // Create variant with stock equal to threshold
      await createProductVariant({
        ...testVariantInput,
        sku: 'LOW-001',
        stock_quantity: 5,
        low_stock_threshold: 5
      });

      // Create variant with stock below threshold
      await createProductVariant({
        ...testVariantInput,
        sku: 'LOW-002',
        stock_quantity: 2,
        low_stock_threshold: 10
      });

      // Create variant with sufficient stock
      await createProductVariant({
        ...testVariantInput,
        sku: 'HIGH-001',
        stock_quantity: 50,
        low_stock_threshold: 10
      });

      const result = await getLowStockVariants();

      expect(result).toHaveLength(2);
      expect(result.find(v => v.sku === 'LOW-001')).toBeDefined();
      expect(result.find(v => v.sku === 'LOW-002')).toBeDefined();
      expect(result.find(v => v.sku === 'HIGH-001')).toBeUndefined();
    });
  });

  describe('updateStock', () => {
    beforeEach(async () => {
      await createProduct(testProductInput);
      await createProductVariant({
        ...testVariantInput,
        stock_quantity: 20
      });
    });

    it('should increase stock quantity', async () => {
      const result = await updateStock(1, 10);

      expect(result.stock_quantity).toEqual(30);
      expect(result.price).toEqual(99.99);
      expect(typeof result.price).toBe('number');
    });

    it('should decrease stock quantity', async () => {
      const result = await updateStock(1, -5);

      expect(result.stock_quantity).toEqual(15);
    });

    it('should throw error for non-existent variant', async () => {
      expect(async () => {
        await updateStock(999, 10);
      }).toThrow(/Product variant with id 999 does not exist/);
    });

    it('should throw error for insufficient stock', async () => {
      expect(async () => {
        await updateStock(1, -25);
      }).toThrow(/Insufficient stock\. Current: 20, Requested: 25/);
    });

    it('should update stock to zero', async () => {
      const result = await updateStock(1, -20);

      expect(result.stock_quantity).toEqual(0);
    });
  });
});
