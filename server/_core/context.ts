import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { parse as parseCookie } from "cookie";
import { LOCAL_SESSION_COOKIE } from "@shared/const";
import { sdk } from "./sdk";
import { getLocalUserBySession, getUserByOpenId, getLocalAuthStatus, upsertUser } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  if (process.env.LOCAL_DESKTOP_MODE === "1") {
    const localAuth = await getLocalAuthStatus();
    if (localAuth.configured) {
      const cookies = parseCookie(opts.req.headers.cookie || "");
      user = (await getLocalUserBySession(cookies[LOCAL_SESSION_COOKIE])) as User | null;
    }
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return { req: opts.req, res: opts.res, user };
}
