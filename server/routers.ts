import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { listProducts, listCustomers, listSuppliers, listExpenses } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  catalog: router({
    products: protectedProcedure.query(() => listProducts()),
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
