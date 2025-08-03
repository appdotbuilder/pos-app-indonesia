
import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['admin', 'manager', 'cashier']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Payment methods enum
export const paymentMethodSchema = z.enum(['cash', 'card', 'qr_code', 'e_wallet']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Transaction status enum
export const transactionStatusSchema = z.enum(['pending', 'completed', 'cancelled', 'refunded']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  category_id: z.number().nullable(),
  base_price: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Product variant schema
export const productVariantSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  variant_name: z.string(),
  sku: z.string(),
  price: z.number(),
  stock_quantity: z.number().int(),
  low_stock_threshold: z.number().int(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  type: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ProductVariant = z.infer<typeof productVariantSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  transaction_number: z.string(),
  customer_id: z.number().nullable(),
  cashier_id: z.number(),
  subtotal: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  payment_method: paymentMethodSchema,
  payment_amount: z.number(),
  change_amount: z.number(),
  status: transactionStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Transaction item schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_variant_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  discount_amount: z.number(),
  total_price: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Promotion schema
export const promotionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  discount_type: z.enum(['percentage', 'fixed_amount']),
  discount_value: z.number(),
  min_purchase_amount: z.number().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type Promotion = z.infer<typeof promotionSchema>;

// Shift schema
export const shiftSchema = z.object({
  id: z.number(),
  cashier_id: z.number(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable(),
  opening_cash: z.number(),
  closing_cash: z.number().nullable(),
  total_sales: z.number(),
  transaction_count: z.number().int(),
  created_at: z.coerce.date()
});

export type Shift = z.infer<typeof shiftSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const createProductInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  category_id: z.number().nullable(),
  base_price: z.number().positive()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const createProductVariantInputSchema = z.object({
  product_id: z.number(),
  variant_name: z.string(),
  sku: z.string(),
  price: z.number().positive(),
  stock_quantity: z.number().int().nonnegative(),
  low_stock_threshold: z.number().int().nonnegative(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  type: z.string().nullable()
});

export type CreateProductVariantInput = z.infer<typeof createProductVariantInputSchema>;

export const createTransactionInputSchema = z.object({
  customer_id: z.number().nullable(),
  cashier_id: z.number(),
  items: z.array(z.object({
    product_variant_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    discount_amount: z.number().nonnegative().default(0)
  })),
  payment_method: paymentMethodSchema,
  payment_amount: z.number().positive(),
  discount_amount: z.number().nonnegative().default(0),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Query schemas
export const salesReportQuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cashier_id: z.number().optional()
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;

export const inventoryReportSchema = z.object({
  low_stock_only: z.boolean().default(false)
});

export type InventoryReportQuery = z.infer<typeof inventoryReportSchema>;
