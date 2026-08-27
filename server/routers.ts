import { z } from "zod";
import { COOKIE_NAME, LOCAL_SESSION_COOKIE } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { adjustInventory, createCategory, createCustomer, createEmployee, createExpense, createProduct, getDailySummary, getSaleDetails, getSalesByEmployee, listEmployees, listSales, updateEmployee, resetEmployeeCode, listLocalAuthEvents, listPurchaseItems, updatePurchaseItem, deletePurchaseItem, updateProduct, createSupplier, createSale, createPurchase, deleteCategory, recordInstallmentPayment, deleteCustomer, deleteExpense, deleteProduct, deleteSupplier, updateCategory, updateCustomer, updateSupplier, getReportSummary, transferInventory, listCategories, listInstallments, listInventoryMovements, listProducts, listCustomers, listSuppliers, listExpenses, recordSyncOperations, createLocalManager, deleteLocalSession, getLocalAuthStatus, loginLocalManager, loginLocalEmployee, verifyLocalManagerPassword } from "./db";

async function verifySensitiveManagerPassword(password: string | undefined) {
  if (process.env.LOCAL_DESKTOP_MODE !== "1" && !process.env.LOCAL_DB_PATH) return;
  if (!password || !(await verifyLocalManagerPassword(password))) throw new TRPCError({ code: "FORBIDDEN", message: "كلمة مرور المدير غير صحيحة أو منتهية الصلاحية" });
}

export const appRouter = router({
  system: systemRouter,
  employees: router({
    list: adminProcedure.query(() => listEmployees()),
    create: adminProcedure.input(z.object({ name: z.string().min(2).max(180), email: z.string().email().optional().or(z.literal("")), employeeCode: z.string().min(1).max(40), role: z.enum(["user", "admin"]).default("user") })).mutation(({ input }) => createEmployee({ ...input, email: input.email || undefined })),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).max(180).optional(), email: z.string().email().optional().or(z.literal("")), employeeCode: z.string().min(1).max(40).optional(), role: z.enum(["user", "admin"]).optional(), isActive: z.boolean().optional() })).mutation(({ input }) => { const { id, ...data } = input; return updateEmployee(id, { ...data, email: data.email || undefined }); }),
    resetCode: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => resetEmployeeCode(input.id)),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    localStatus: publicProcedure.query(() => getLocalAuthStatus()),
    localRegister: publicProcedure.input(z.object({ name: z.string().min(2).max(180), managerCode: z.string().regex(/^[A-Za-z0-9_-]{3,40}$/), password: z.string().min(6).max(200) })).mutation(({ input, ctx }) => createLocalManager(input).then(result => { ctx.res.cookie(LOCAL_SESSION_COOKIE, result.token, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 1000 * 60 * 60 * 24 * 30 }); return result.user; })),
    localLogin: publicProcedure.input(z.object({ name: z.string().min(2).max(180), managerCode: z.string().min(3).max(40), password: z.string().min(1).max(200) })).mutation(({ input, ctx }) => loginLocalManager(input).then(result => { ctx.res.cookie(LOCAL_SESSION_COOKIE, result.token, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 1000 * 60 * 60 * 24 * 30 }); return result.user; })),
    localEmployeeLogin: publicProcedure.input(z.object({ name: z.string().min(2).max(180), employeeCode: z.string().min(1).max(40) })).mutation(({ input, ctx }) => loginLocalEmployee(input).then(result => { ctx.res.cookie(LOCAL_SESSION_COOKIE, result.token, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 1000 * 60 * 60 * 24 * 30 }); return result.user; })),
    localAudit: adminProcedure.input(z.object({ limit: z.number().int().positive().max(500).optional() }).optional()).query(({ input }) => listLocalAuthEvents(input?.limit)),
    localLogout: publicProcedure.mutation(async ({ ctx }) => { const token = ctx.req.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(`${LOCAL_SESSION_COOKIE}=`))?.slice(LOCAL_SESSION_COOKIE.length + 1); await deleteLocalSession(token); ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 0 }); return { success: true } as const; }),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  sales: router({
    list: protectedProcedure.query(() => listSales()),
    details: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getSaleDetails(input.id)),
    create: protectedProcedure.input(z.object({ invoiceNo: z.string().min(1), customerId: z.number().int().positive().optional(), customerName: z.string().max(180).optional(), sellerId: z.number().int().positive().optional(), sellerCode: z.string().max(40).optional(), paidAmount: z.string(), paymentMethod: z.enum(["cash", "card", "transfer", "installment"]), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), unitPrice: z.string() })).min(1) })).mutation(({ input, ctx }) => createSale({ ...input, sellerId: ctx.user.id, sellerCode: input.sellerCode || String(ctx.user.id) })),
  }),
  purchases: router({
    list: protectedProcedure.query(() => listPurchaseItems()),
    updateItem: adminProcedure.input(z.object({ id: z.number().int().positive(), quantity: z.number().int().positive(), unitPrice: z.string(), managerPassword: z.string().optional() })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); return updatePurchaseItem(input.id, { quantity: input.quantity, unitPrice: input.unitPrice }); }),
    deleteItem: adminProcedure.input(z.object({ id: z.number().int().positive(), managerPassword: z.string().optional() })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); return deletePurchaseItem(input.id); }),
    create: adminProcedure.input(z.object({ invoiceNo: z.string().min(1), movementType: z.enum(["purchase", "return"]).default("purchase"), supplierId: z.number().int().positive().optional(), paidAmount: z.string(), managerPassword: z.string().optional(), items: z.array(z.object({ productId: z.number().int().positive().optional(), quantity: z.number().int().positive(), unitPrice: z.string(), unit: z.string().max(40).optional(), location: z.string().max(120).optional(), product: z.object({ name: z.string().min(2), sku: z.string().min(1), barcode: z.string().optional(), unit: z.string().optional(), location: z.string().max(120).optional(), salePrice: z.string().optional(), minStock: z.number().int().nonnegative().optional() }).optional() })).min(1) })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); const { managerPassword: _managerPassword, ...purchaseInput } = input; return createPurchase(purchaseInput); }),
  }),
  installments: router({
    list: protectedProcedure.query(() => listInstallments()),
    collect: protectedProcedure.input(z.object({ installmentId: z.number().int().positive(), amount: z.string(), paymentMethod: z.enum(["cash", "card", "transfer"]), note: z.string().optional() })).mutation(({ input }) => recordInstallmentPayment(input)),
  }),
  inventory: router({
    adjust: adminProcedure.input(z.object({ productId: z.number().int().positive(), quantity: z.number().int(), note: z.string().optional(), managerPassword: z.string().optional() })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); const { managerPassword: _managerPassword, ...adjustInput } = input; return adjustInventory(adjustInput); }),
    transfer: adminProcedure.input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), fromLocation: z.string().min(1).max(120), toLocation: z.string().min(1).max(120), note: z.string().optional(), managerPassword: z.string().optional() })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); const { managerPassword: _managerPassword, ...transferInput } = input; return transferInventory(transferInput); }),
  }),
  dashboard: router({
    dailySummary: protectedProcedure.input(z.object({ from: z.coerce.date(), to: z.coerce.date() })).query(({ input }) => getDailySummary(input)),
  }),
  reports: router({ summary: protectedProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional(), sellerId: z.number().int().positive().optional() }).optional()).query(({ input }) => getReportSummary({ from: input?.from ? new Date(`${input.from}T00:00:00`) : undefined, to: input?.to ? new Date(`${input.to}T23:59:59.999`) : undefined, sellerId: input?.sellerId })), byEmployee: adminProcedure.input(z.object({ from: z.string().optional(), to: z.string().optional() }).optional()).query(({ input }) => getSalesByEmployee({ from: input?.from ? new Date(`${input.from}T00:00:00`) : undefined, to: input?.to ? new Date(`${input.to}T23:59:59.999`) : undefined })) }),
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
    createProduct: adminProcedure.input(z.object({ name: z.string().min(2), sku: z.string().min(1), barcode: z.string().optional(), unit: z.string().optional(), location: z.string().max(120).optional(), salePrice: z.string(), costPrice: z.string().optional(), stockQty: z.number().int().nonnegative().optional(), minStock: z.number().int().nonnegative().optional(), categoryId: z.number().int().positive().optional(), managerPassword: z.string().optional() })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); const { managerPassword: _managerPassword, ...productInput } = input; return createProduct(productInput); }),
    createCustomer: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional(), address: z.string().optional() })).mutation(({ input }) => createCustomer(input)),
    createSupplier: protectedProcedure.input(z.object({ name: z.string().min(2), phone: z.string().optional() })).mutation(({ input }) => createSupplier(input)),
    createExpense: protectedProcedure.input(z.object({ title: z.string().min(2), category: z.string().min(2), amount: z.string(), notes: z.string().optional() })).mutation(({ input }) => createExpense(input)),
    updateProduct: adminProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().min(2).optional(), sku: z.string().min(1).optional(), barcode: z.string().optional(), unit: z.string().optional(), location: z.string().max(120).optional(), salePrice: z.string().optional(), costPrice: z.string().optional(), stockQty: z.number().int().nonnegative().optional(), minStock: z.number().int().nonnegative().optional(), categoryId: z.number().int().positive().optional(), managerPassword: z.string().optional() })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); const { id, managerPassword: _managerPassword, ...changes } = input; return updateProduct(id, changes); }),
    deleteProduct: adminProcedure.input(z.object({ id: z.number().int().positive(), managerPassword: z.string().optional() })).mutation(async ({ input }) => { await verifySensitiveManagerPassword(input.managerPassword); return deleteProduct(input.id); }),
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
      return q ? rows.filter((p: any) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : rows;
    }),
  }),
});
export type AppRouter = typeof appRouter;
