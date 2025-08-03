
import { db } from '../db';
import { productsTable, productVariantsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput, type Product, type CreateProductVariantInput, type ProductVariant } from '../schema';
import { eq, lte, SQL } from 'drizzle-orm';

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // Validate category exists if provided
    if (input.category_id !== null) {
      const category = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();
      
      if (category.length === 0) {
        throw new Error(`Category with id ${input.category_id} does not exist`);
      }
    }

    // Insert product record
    const result = await db.insert(productsTable)
      .values({
        name: input.name,
        description: input.description,
        category_id: input.category_id,
        base_price: input.base_price.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      base_price: parseFloat(product.base_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      base_price: parseFloat(product.base_price)
    }));
  } catch (error) {
    console.error('Fetching products failed:', error);
    throw error;
  }
}

export async function createProductVariant(input: CreateProductVariantInput): Promise<ProductVariant> {
  try {
    // Validate product exists
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();
    
    if (product.length === 0) {
      throw new Error(`Product with id ${input.product_id} does not exist`);
    }

    // Check SKU uniqueness
    const existingSku = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.sku, input.sku))
      .execute();
    
    if (existingSku.length > 0) {
      throw new Error(`SKU ${input.sku} already exists`);
    }

    // Insert product variant record
    const result = await db.insert(productVariantsTable)
      .values({
        product_id: input.product_id,
        variant_name: input.variant_name,
        sku: input.sku,
        price: input.price.toString(), // Convert number to string for numeric column
        stock_quantity: input.stock_quantity,
        low_stock_threshold: input.low_stock_threshold,
        size: input.size,
        color: input.color,
        type: input.type
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const variant = result[0];
    return {
      ...variant,
      price: parseFloat(variant.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product variant creation failed:', error);
    throw error;
  }
}

export async function getProductVariants(): Promise<ProductVariant[]> {
  try {
    const results = await db.select()
      .from(productVariantsTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(variant => ({
      ...variant,
      price: parseFloat(variant.price)
    }));
  } catch (error) {
    console.error('Fetching product variants failed:', error);
    throw error;
  }
}

export async function getLowStockVariants(): Promise<ProductVariant[]> {
  try {
    const results = await db.select()
      .from(productVariantsTable)
      .where(lte(productVariantsTable.stock_quantity, productVariantsTable.low_stock_threshold))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(variant => ({
      ...variant,
      price: parseFloat(variant.price)
    }));
  } catch (error) {
    console.error('Fetching low stock variants failed:', error);
    throw error;
  }
}

export async function updateStock(variantId: number, quantity: number): Promise<ProductVariant> {
  try {
    // Check if variant exists and get current stock
    const existingVariant = await db.select()
      .from(productVariantsTable)
      .where(eq(productVariantsTable.id, variantId))
      .execute();
    
    if (existingVariant.length === 0) {
      throw new Error(`Product variant with id ${variantId} does not exist`);
    }

    const currentStock = existingVariant[0].stock_quantity;
    const newStock = currentStock + quantity;

    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current: ${currentStock}, Requested: ${Math.abs(quantity)}`);
    }

    // Update stock quantity
    const result = await db.update(productVariantsTable)
      .set({ 
        stock_quantity: newStock,
        updated_at: new Date()
      })
      .where(eq(productVariantsTable.id, variantId))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const variant = result[0];
    return {
      ...variant,
      price: parseFloat(variant.price)
    };
  } catch (error) {
    console.error('Stock update failed:', error);
    throw error;
  }
}
