
import { db } from '../db';
import { 
  transactionsTable, 
  transactionItemsTable, 
  productVariantsTable, 
  productsTable, 
  usersTable,
  shiftsTable 
} from '../db/schema';
import { type SalesReportQuery, type InventoryReportQuery } from '../schema';
import { eq, and, gte, lte, sum, count, desc, asc, sql, SQL } from 'drizzle-orm';

export async function getSalesReport(query: SalesReportQuery): Promise<any> {
  const startDate = new Date(query.start_date);
  const endDate = new Date(query.end_date);
  // Set end date to end of day
  endDate.setHours(23, 59, 59, 999);

  // Build base conditions
  const conditions: SQL<unknown>[] = [
    gte(transactionsTable.created_at, startDate),
    lte(transactionsTable.created_at, endDate),
    eq(transactionsTable.status, 'completed')
  ];

  if (query.cashier_id) {
    conditions.push(eq(transactionsTable.cashier_id, query.cashier_id));
  }

  // Get total sales summary
  const salesSummary = await db
    .select({
      total_sales: sum(transactionsTable.total_amount),
      transaction_count: count(transactionsTable.id),
      avg_transaction: sql<string>`ROUND(AVG(${transactionsTable.total_amount}), 2)`
    })
    .from(transactionsTable)
    .where(and(...conditions))
    .execute();

  // Get sales by payment method
  const paymentMethodStats = await db
    .select({
      payment_method: transactionsTable.payment_method,
      total_amount: sum(transactionsTable.total_amount),
      count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(and(...conditions))
    .groupBy(transactionsTable.payment_method)
    .execute();

  // Get daily breakdown
  const dailyBreakdown = await db
    .select({
      date: sql<string>`DATE(${transactionsTable.created_at})`,
      total_sales: sum(transactionsTable.total_amount),
      transaction_count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(and(...conditions))
    .groupBy(sql`DATE(${transactionsTable.created_at})`)
    .orderBy(sql`DATE(${transactionsTable.created_at})`)
    .execute();

  // Get cashier performance if specific cashier not requested
  let cashierPerformance: any[] = [];
  if (!query.cashier_id) {
    const cashierStats = await db
      .select({
        cashier_id: transactionsTable.cashier_id,
        cashier_name: usersTable.full_name,
        total_sales: sum(transactionsTable.total_amount),
        transaction_count: count(transactionsTable.id)
      })
      .from(transactionsTable)
      .innerJoin(usersTable, eq(transactionsTable.cashier_id, usersTable.id))
      .where(and(...conditions))
      .groupBy(transactionsTable.cashier_id, usersTable.full_name)
      .orderBy(desc(sum(transactionsTable.total_amount)))
      .execute();

    cashierPerformance = cashierStats.map(stat => ({
      cashier_id: stat.cashier_id,
      cashier_name: stat.cashier_name,
      total_sales: parseFloat(stat.total_sales || '0'),
      transaction_count: stat.transaction_count
    }));
  }

  const summary = salesSummary[0];
  const paymentMethods = paymentMethodStats.reduce((acc, stat) => {
    acc[stat.payment_method] = {
      total_amount: parseFloat(stat.total_amount || '0'),
      count: stat.count
    };
    return acc;
  }, {} as Record<string, any>);

  return {
    period: {
      start_date: query.start_date,
      end_date: query.end_date
    },
    total_sales: parseFloat(summary.total_sales || '0'),
    transaction_count: summary.transaction_count,
    average_transaction: parseFloat(summary.avg_transaction || '0'),
    payment_methods: paymentMethods,
    cashier_performance: cashierPerformance,
    daily_breakdown: dailyBreakdown.map(day => ({
      date: day.date,
      total_sales: parseFloat(day.total_sales || '0'),
      transaction_count: day.transaction_count
    }))
  };
}

export async function getTopSellingProducts(limit: number = 10): Promise<any[]> {
  const topProducts = await db
    .select({
      product_id: productsTable.id,
      product_name: productsTable.name,
      variant_id: productVariantsTable.id,
      variant_name: productVariantsTable.variant_name,
      sku: productVariantsTable.sku,
      total_quantity: sum(transactionItemsTable.quantity),
      total_revenue: sum(transactionItemsTable.total_price)
    })
    .from(transactionItemsTable)
    .innerJoin(productVariantsTable, eq(transactionItemsTable.product_variant_id, productVariantsTable.id))
    .innerJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
    .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
    .where(eq(transactionsTable.status, 'completed'))
    .groupBy(
      productsTable.id,
      productsTable.name,
      productVariantsTable.id,
      productVariantsTable.variant_name,
      productVariantsTable.sku
    )
    .orderBy(desc(sum(transactionItemsTable.quantity)))
    .limit(limit)
    .execute();

  return topProducts.map(product => ({
    product_id: product.product_id,
    product_name: product.product_name,
    variant_id: product.variant_id,
    variant_name: product.variant_name,
    sku: product.sku,
    total_quantity: parseInt(product.total_quantity || '0'), // Convert string to number
    total_revenue: parseFloat(product.total_revenue || '0')
  }));
}

export async function getProfitReport(startDate: string, endDate: string): Promise<any> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get total revenue from completed transactions
  const revenueResult = await db
    .select({
      total_revenue: sum(transactionsTable.total_amount)
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.created_at, start),
        lte(transactionsTable.created_at, end),
        eq(transactionsTable.status, 'completed')
      )
    )
    .execute();

  // Get product-wise analysis
  const productAnalysis = await db
    .select({
      product_id: productsTable.id,
      product_name: productsTable.name,
      variant_name: productVariantsTable.variant_name,
      total_quantity: sum(transactionItemsTable.quantity),
      total_revenue: sum(transactionItemsTable.total_price)
    })
    .from(transactionItemsTable)
    .innerJoin(transactionsTable, eq(transactionItemsTable.transaction_id, transactionsTable.id))
    .innerJoin(productVariantsTable, eq(transactionItemsTable.product_variant_id, productVariantsTable.id))
    .innerJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id))
    .where(
      and(
        gte(transactionsTable.created_at, start),
        lte(transactionsTable.created_at, end),
        eq(transactionsTable.status, 'completed')
      )
    )
    .groupBy(
      productsTable.id,
      productsTable.name,
      productVariantsTable.variant_name
    )
    .orderBy(desc(sum(transactionItemsTable.total_price)))
    .execute();

  const totalRevenue = parseFloat(revenueResult[0]?.total_revenue || '0');

  return {
    total_revenue: totalRevenue,
    total_cost: 0, // Cost data not available in current schema
    gross_profit: 0, // Cannot calculate without cost data
    profit_margin: 0, // Cannot calculate without cost data
    product_analysis: productAnalysis.map(product => ({
      product_id: product.product_id,
      product_name: product.product_name,
      variant_name: product.variant_name,
      total_quantity: parseInt(product.total_quantity || '0'), // Convert string to number
      total_revenue: parseFloat(product.total_revenue || '0')
    }))
  };
}

export async function getInventoryReport(query: InventoryReportQuery): Promise<any[]> {
  // Build the base query
  const baseQuery = db
    .select({
      variant_id: productVariantsTable.id,
      product_id: productsTable.id,
      product_name: productsTable.name,
      variant_name: productVariantsTable.variant_name,
      sku: productVariantsTable.sku,
      current_stock: productVariantsTable.stock_quantity,
      low_stock_threshold: productVariantsTable.low_stock_threshold,
      price: productVariantsTable.price,
      stock_value: sql<string>`${productVariantsTable.price} * ${productVariantsTable.stock_quantity}`
    })
    .from(productVariantsTable)
    .innerJoin(productsTable, eq(productVariantsTable.product_id, productsTable.id));

  // Apply conditional filter and execute
  const results = query.low_stock_only
    ? await baseQuery
        .where(sql`${productVariantsTable.stock_quantity} <= ${productVariantsTable.low_stock_threshold}`)
        .orderBy(asc(productVariantsTable.stock_quantity))
        .execute()
    : await baseQuery
        .orderBy(asc(productVariantsTable.stock_quantity))
        .execute();

  return results.map(item => ({
    variant_id: item.variant_id,
    product_id: item.product_id,
    product_name: item.product_name,
    variant_name: item.variant_name,
    sku: item.sku,
    current_stock: item.current_stock,
    low_stock_threshold: item.low_stock_threshold,
    price: parseFloat(item.price),
    stock_value: parseFloat(item.stock_value || '0'),
    is_low_stock: item.current_stock <= item.low_stock_threshold
  }));
}

export async function getDashboardStats(): Promise<any> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's sales summary
  const todaySales = await db
    .select({
      total_sales: sum(transactionsTable.total_amount),
      transaction_count: count(transactionsTable.id)
    })
    .from(transactionsTable)
    .where(
      and(
        gte(transactionsTable.created_at, today),
        lte(transactionsTable.created_at, tomorrow),
        eq(transactionsTable.status, 'completed')
      )
    )
    .execute();

  // Active shifts count
  const activeShifts = await db
    .select({
      count: count(shiftsTable.id)
    })
    .from(shiftsTable)
    .where(sql`${shiftsTable.end_time} IS NULL`)
    .execute();

  // Low stock alerts count
  const lowStockCount = await db
    .select({
      count: count(productVariantsTable.id)
    })
    .from(productVariantsTable)
    .where(sql`${productVariantsTable.stock_quantity} <= ${productVariantsTable.low_stock_threshold}`)
    .execute();

  // Recent transactions (last 10)
  const recentTransactions = await db
    .select({
      id: transactionsTable.id,
      transaction_number: transactionsTable.transaction_number,
      total_amount: transactionsTable.total_amount,
      payment_method: transactionsTable.payment_method,
      created_at: transactionsTable.created_at,
      cashier_name: usersTable.full_name
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.cashier_id, usersTable.id))
    .where(eq(transactionsTable.status, 'completed'))
    .orderBy(desc(transactionsTable.created_at))
    .limit(10)
    .execute();

  const todayStats = todaySales[0];

  return {
    today_sales: parseFloat(todayStats?.total_sales || '0'),
    today_transactions: todayStats?.transaction_count || 0,
    active_shifts: activeShifts[0]?.count || 0,
    low_stock_alerts: lowStockCount[0]?.count || 0,
    recent_transactions: recentTransactions.map(tx => ({
      id: tx.id,
      transaction_number: tx.transaction_number,
      total_amount: parseFloat(tx.total_amount),
      payment_method: tx.payment_method,
      created_at: tx.created_at,
      cashier_name: tx.cashier_name
    }))
  };
}
