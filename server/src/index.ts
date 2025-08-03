
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createCustomerInputSchema,
  createProductInputSchema,
  createProductVariantInputSchema,
  createTransactionInputSchema,
  loginInputSchema,
  salesReportQuerySchema,
  inventoryReportSchema
} from './schema';

// Import handlers
import { login, getCurrentUser } from './handlers/auth';
import { createUser, getUsers, getUserById, updateUserStatus } from './handlers/users';
import { createCustomer, getCustomers, getCustomerById, getCustomerPurchaseHistory } from './handlers/customers';
import { 
  createProduct, 
  getProducts, 
  createProductVariant, 
  getProductVariants, 
  getLowStockVariants, 
  updateStock 
} from './handlers/products';
import { 
  createTransaction, 
  getTransactions, 
  getTransactionById, 
  getTransactionItems, 
  refundTransaction 
} from './handlers/transactions';
import { startShift, endShift, getCurrentShift, getShiftHistory } from './handlers/shifts';
import { 
  getSalesReport, 
  getTopSellingProducts, 
  getProfitReport, 
  getInventoryReport, 
  getDashboardStats 
} from './handlers/reports';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  getCurrentUser: publicProcedure
    .input(z.string())
    .query(({ input }) => getCurrentUser(input)),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(z.number())
    .query(({ input }) => getUserById(input)),

  updateUserStatus: publicProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(({ input }) => updateUserStatus(input.id, input.isActive)),

  // Customer management
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  getCustomers: publicProcedure
    .query(() => getCustomers()),

  getCustomerById: publicProcedure
    .input(z.number())
    .query(({ input }) => getCustomerById(input)),

  getCustomerPurchaseHistory: publicProcedure
    .input(z.number())
    .query(({ input }) => getCustomerPurchaseHistory(input)),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .query(() => getProducts()),

  createProductVariant: publicProcedure
    .input(createProductVariantInputSchema)
    .mutation(({ input }) => createProductVariant(input)),

  getProductVariants: publicProcedure
    .query(() => getProductVariants()),

  getLowStockVariants: publicProcedure
    .query(() => getLowStockVariants()),

  updateStock: publicProcedure
    .input(z.object({ variantId: z.number(), quantity: z.number() }))
    .mutation(({ input }) => updateStock(input.variantId, input.quantity)),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .query(() => getTransactions()),

  getTransactionById: publicProcedure
    .input(z.number())
    .query(({ input }) => getTransactionById(input)),

  getTransactionItems: publicProcedure
    .input(z.number())
    .query(({ input }) => getTransactionItems(input)),

  refundTransaction: publicProcedure
    .input(z.number())
    .mutation(({ input }) => refundTransaction(input)),

  // Shift management
  startShift: publicProcedure
    .input(z.object({ cashierId: z.number(), openingCash: z.number() }))
    .mutation(({ input }) => startShift(input.cashierId, input.openingCash)),

  endShift: publicProcedure
    .input(z.object({ shiftId: z.number(), closingCash: z.number() }))
    .mutation(({ input }) => endShift(input.shiftId, input.closingCash)),

  getCurrentShift: publicProcedure
    .input(z.number())
    .query(({ input }) => getCurrentShift(input)),

  getShiftHistory: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getShiftHistory(input)),

  // Reports and analytics
  getSalesReport: publicProcedure
    .input(salesReportQuerySchema)
    .query(({ input }) => getSalesReport(input)),

  getTopSellingProducts: publicProcedure
    .input(z.number().default(10))
    .query(({ input }) => getTopSellingProducts(input)),

  getProfitReport: publicProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(({ input }) => getProfitReport(input.startDate, input.endDate)),

  getInventoryReport: publicProcedure
    .input(inventoryReportSchema)
    .query(({ input }) => getInventoryReport(input)),

  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`POS TRPC server listening at port: ${port}`);
}

start();
