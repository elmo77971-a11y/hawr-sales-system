import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { adjustInventory, createCategory, createCustomer, createExpense, createProduct, createSupplier, createSale, createPurchase, deleteCategory, recordInstallmentPayment, deleteCustomer, deleteExpense, deleteProduct, deleteSupplier, updateCategory, updateCustomer, updateProduct, updateSupplier, getReportSummary, listCategories, listInstallments, listInventoryMovements, listProducts, listCustomers, listSuppliers, listExpenses, recordSyncOperations } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  sales: router({
    create: protectedProcedure.input(z.object({ invoiceNo: z.string().min(1), customerId: z.number().int().positive().optional(), paidAmount: z.string(), paymentMethod: z.enum(["cash", "card", "transfer", "installment"]), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), unitPrice: z.string() })).min(1) })).mutation(({ input, ctx }) => createSale({ ...input, sellerId: ctx.user.id })),
  }),
  purchases: router({
    create: protectedProcedure.input(z.object({ invoiceNo: z.string().min(1), supplierId: z.number().int().positive().optional(), paidAmount: z.string(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), unitPrice: z.string() })).min(1) })).mutation(({ input }) => createPurchase(input)),
  }),
  installments: router({
    list: protectedProcedure.query(() => listInstallments()),
    collect: protectedProcedure.input(z.object({ installmentId: z.number().int().positive(), amount: z.string(), paymentMethod: z.enum(["cash", "card", "transfer"]), note: z.string().optional() })).mutation(({ input }) => recordInstallmentPayment(input)),
  }),
  inventory: router({
    adjust: protectedProcedure.input(z.object({ productId: z.number().int().positive(), quantity: z.number().int(), note: z.string().optional() })).mutation(({ input }) => adjustInventory(input)),
  }),
  reports: router({ summary: protectedProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional(), sellerId: z.number().int().positive().optional() }).optional()).query(({ input }) => getReportSummary({ from: input?.from ? new Date(`${input.from}T00:00:00`) : undefined, to: input?.to ? new Date(`${input.to}T23:59:59.999`) : undefined, sellerId: input?.sellerId })) }),
  sync: router({
    push: protectedProcedure.input(z.object({ operations: z.array(z.object({ id: z.string(), type: z.string(), payload: z.unknown(), createdAt: z.number() })) })).mutation(async ({ input }) => ({ accepted: await recordSyncOperations(input.operations), syncedAt: Date.now() })),
  }),
  catalog: router({
    categories: protectedProcedure.query(() => listCategories()),
    createCategory: protectedProcedure.input(z.object({ name: z.string().min(2) })).mutation(({ input }) => createCategory(input.name)),
    updateCategory: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2) })).mutation(({ input }) => updateCategory(input.id, input.name)),
    deleteCategory: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteCategory(input.id)),
    products: protectedProcedure.query(() => listProducts()),
    inventoryMovements: protectedProcedure.query(() => listInventoryMovements()),
    createProduct: protectedProcedure.input(z.object({ name: z.string().min(2), sku: z.string().min(1), barcode: z.string().optional(), unit: z.string().optional(), salePrice: z.string(), costPrice: z.string().optional(), stockQty: z.number().int().nonnegative().optional(), minStock: z.number().int().nonnegative().optional(), categoryId: z.number().int().positive().optional() })).mutation(({ input }) => createProduct(input)),
    createCustomer: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional() })).mutation(({ input }) => createCustomer(input)),
    createSupplier: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional() })).mutation(({ input }) => createSupplier(input)),
    createExpense: protectedProcedure.input(z.object({ title: z.string().min(2), category: z.string().min(2), amount: z.string(), notes: z.string().optional() })).mutation(({ input }) => createExpense(input)),
    updateProduct: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).optional(), sku: z.string().min(1).optional(), barcode: z.string().optional(), unit: z.string().optional(), salePrice: z.string().optional(), costPrice: z.string().optional(), stockQty: z.number().int().nonnegative().optional(), minStock: z.number().int().nonnegative().optional(), categoryId: z.number().int().positive().optional() })).mutation(({ input }) => { const { id, ...changes } = input; return updateProduct(id, changes); }),
    deleteProduct: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteProduct(input.id)),
    updateCustomer: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).optional(), phone: z.string().optional(), address: z.string().optional() })).mutation(({ input }) => { const { id, ...changes } = input; return updateCustomer(id, changes); }),
    deleteCustomer: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteCustomer(input.id)),
    updateSupplier: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).optional(), phone: z.string().optional() })).mutation(({ input }) => { const { id, ...changes } = input; return updateSupplier(id, changes); }),
    deleteSupplier: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteSupplier(input.id)),
    deleteExpense: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteExpense(input.id)),
    customers: protectedProcedure.query(() => listCustomers()),
    suppliers: protectedProcedure.query(() => listSuppliers()),
    expenses: protectedProcedure.query(() => listExpenses()),
    search: protectedProcedure.input(z.object({ query: z.string().default("") })).query(async ({ input }) => {
      const rows = await listProducts();
      const q = input.query.trim().toLowerCase();
      return q ? rows.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : rows;
    }),
  }),
});
export type AppRouter = typeof appRouter;
