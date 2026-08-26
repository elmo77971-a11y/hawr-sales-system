import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { adjustInventory, createCategory, createCustomer, createEmployee, createExpense, createProduct, getDailySummary, getSaleDetails, listEmployees, listSales, updateEmployee, listPurchaseItems, updatePurchaseItem, deletePurchaseItem, updateProduct, createSupplier, createSale, createPurchase, deleteCategory, recordInstallmentPayment, deleteCustomer, deleteExpense, deleteProduct, deleteSupplier, updateCategory, updateCustomer, updateSupplier, getReportSummary, listCategories, listInstallments, listInventoryMovements, listProducts, listCustomers, listSuppliers, listExpenses, recordSyncOperations } from "./db";

export const appRouter = router({
  system: systemRouter,
  employees: router({
    list: protectedProcedure.query(() => listEmployees()),
    create: adminProcedure.input(z.object({ name: z.string().min(2).max(180), email: z.string().email().optional().or(z.literal("")), employeeCode: z.string().min(1).max(40), role: z.enum(["user", "admin"]).default("user") })).mutation(({ input }) => createEmployee({ ...input, email: input.email || undefined })),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(180).optional(), email: z.string().email().optional().or(z.literal("")), employeeCode: z.string().min(1).max(40).optional(), role: z.enum(["user", "admin"]).optional(), isActive: z.boolean().optional() })).mutation(({ input }) => { const { id, ...data } = input; return updateEmployee(id, { ...data, email: data.email || undefined }); }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  sales: router({
    list: protectedProcedure.query(() => listSales()),
    details: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getSaleDetails(input.id)),
    create: protectedProcedure.input(z.object({ invoiceNo: z.string().min(1), customerId: z.number().int().positive().optional(), customerName: z.string().max(180).optional(), sellerId: z.number().int().positive().optional(), sellerCode: z.string().max(40).optional(), paidAmount: z.string(), paymentMethod: z.enum(["cash", "card", "transfer", "installment"]), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), unitPrice: z.string() })).min(1) })).mutation(({ input, ctx }) => createSale({ ...input, sellerId: ctx.user.id, sellerCode: input.sellerCode || String(ctx.user.id) })),
  }),
  purchases: router({
    list: protectedProcedure.query(() => listPurchaseItems()),
    updateItem: adminProcedure.input(z.object({ id: z.number().int().positive(), quantity: z.number().int().positive(), unitPrice: z.string() })).mutation(({ input }) => updatePurchaseItem(input.id, { quantity: input.quantity, unitPrice: input.unitPrice })),
    deleteItem: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deletePurchaseItem(input.id)),
    create: protectedProcedure.input(z.object({ invoiceNo: z.string().min(1), movementType: z.enum(["purchase", "return"]).default("purchase"), supplierId: z.number().int().positive().optional(), paidAmount: z.string(), items: z.array(z.object({ productId: z.number().int().positive().optional(), quantity: z.number().int().positive(), unitPrice: z.string(), location: z.string().max(120).optional(), product: z.object({ name: z.string().min(2), sku: z.string().min(1), barcode: z.string().optional(), unit: z.string().optional(), location: z.string().max(120).optional(), salePrice: z.string().optional(), minStock: z.number().int().nonnegative().optional() }).optional() })).min(1) })).mutation(({ input }) => createPurchase(input)),
  }),
  installments: router({
    list: protectedProcedure.query(() => listInstallments()),
    collect: protectedProcedure.input(z.object({ installmentId: z.number().int().positive(), amount: z.string(), paymentMethod: z.enum(["cash", "card", "transfer"]), note: z.string().optional() })).mutation(({ input }) => recordInstallmentPayment(input)),
  }),
  inventory: router({
    adjust: protectedProcedure.input(z.object({ productId: z.number().int().positive(), quantity: z.number().int(), note: z.string().optional() })).mutation(({ input }) => adjustInventory(input)),
  }),
  dashboard: router({
    dailySummary: protectedProcedure.input(z.object({ from: z.coerce.date(), to: z.coerce.date() })).query(({ input }) => getDailySummary(input)),
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
    createProduct: protectedProcedure.input(z.object({ name: z.string().min(2), sku: z.string().min(1), barcode: z.string().optional(), unit: z.string().optional(), location: z.string().max(120).optional(), salePrice: z.string(), costPrice: z.string().optional(), stockQty: z.number().int().nonnegative().optional(), minStock: z.number().int().nonnegative().optional(), categoryId: z.number().int().positive().optional() })).mutation(({ input }) => createProduct(input)),
    createCustomer: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional() })).mutation(({ input }) => createCustomer(input)),
    createSupplier: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional() })).mutation(({ input }) => createSupplier(input)),
    createExpense: protectedProcedure.input(z.object({ title: z.string().min(2), category: z.string().min(2), amount: z.string(), notes: z.string().optional() })).mutation(({ input }) => createExpense(input)),
    updateProduct: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).optional(), sku: z.string().min(1).optional(), barcode: z.string().optional(), unit: z.string().optional(), location: z.string().max(120).optional(), salePrice: z.string().optional(), costPrice: z.string().optional(), stockQty: z.number().int().nonnegative().optional(), minStock: z.number().int().nonnegative().optional(), categoryId: z.number().int().positive().optional() })).mutation(({ input }) => { const { id, ...changes } = input; return updateProduct(id, changes); }),
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
