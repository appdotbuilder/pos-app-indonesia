
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  varchar
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'cashier']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'card', 'qr_code', 'e_wallet']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'cancelled', 'refunded']);
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed_amount']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category_id: integer('category_id'),
  base_price: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Product variants table
export const productVariantsTable = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').notNull(),
  variant_name: varchar('variant_name', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock_quantity: integer('stock_quantity').notNull(),
  low_stock_threshold: integer('low_stock_threshold').notNull(),
  size: varchar('size', { length: 50 }),
  color: varchar('color', { length: 50 }),
  type: varchar('type', { length: 50 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_number: varchar('transaction_number', { length: 50 }).notNull().unique(),
  customer_id: integer('customer_id'),
  cashier_id: integer('cashier_id').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  payment_amount: numeric('payment_amount', { precision: 10, scale: 2 }).notNull(),
  change_amount: numeric('change_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  status: transactionStatusEnum('status').default('completed').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  product_variant_id: integer('product_variant_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Promotions table
export const promotionsTable = pgTable('promotions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  discount_type: discountTypeEnum('discount_type').notNull(),
  discount_value: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  min_purchase_amount: numeric('min_purchase_amount', { precision: 10, scale: 2 }),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Shifts table
export const shiftsTable = pgTable('shifts', {
  id: serial('id').primaryKey(),
  cashier_id: integer('cashier_id').notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time'),
  opening_cash: numeric('opening_cash', { precision: 10, scale: 2 }).notNull(),
  closing_cash: numeric('closing_cash', { precision: 10, scale: 2 }),
  total_sales: numeric('total_sales', { precision: 10, scale: 2 }).default('0').notNull(),
  transaction_count: integer('transaction_count').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable),
  shifts: many(shiftsTable)
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  transactions: many(transactionsTable)
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  products: many(productsTable)
}));

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [productsTable.category_id],
    references: [categoriesTable.id]
  }),
  variants: many(productVariantsTable)
}));

export const productVariantsRelations = relations(productVariantsTable, ({ one, many }) => ({
  product: one(productsTable, {
    fields: [productVariantsTable.product_id],
    references: [productsTable.id]
  }),
  transactionItems: many(transactionItemsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [transactionsTable.customer_id],
    references: [customersTable.id]
  }),
  cashier: one(usersTable, {
    fields: [transactionsTable.cashier_id],
    references: [usersTable.id]
  }),
  items: many(transactionItemsTable)
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id]
  }),
  productVariant: one(productVariantsTable, {
    fields: [transactionItemsTable.product_variant_id],
    references: [productVariantsTable.id]
  })
}));

export const shiftsRelations = relations(shiftsTable, ({ one }) => ({
  cashier: one(usersTable, {
    fields: [shiftsTable.cashier_id],
    references: [usersTable.id]
  })
}));

// Export all tables for drizzle queries
export const tables = {
  users: usersTable,
  customers: customersTable,
  categories: categoriesTable,
  products: productsTable,
  productVariants: productVariantsTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
  promotions: promotionsTable,
  shifts: shiftsTable
};
