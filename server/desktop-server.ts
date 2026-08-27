import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { serveStatic } from "./_core/static";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "0.0.0.0", () => probe.close(() => resolve(true)));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  if (startPort === 0) return 0;
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function startDesktopServer(options: { host?: string; port?: number; pairingToken?: string } = {}) {
  const application = express();
  const server = createServer(application);
  application.use(express.json({ limit: "50mb" }));
  application.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(application);
  registerOAuthRoutes(application);

  const isLoopback = (req: express.Request) => {
    const address = req.socket.remoteAddress || "";
    return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
  };
  application.get("/__desktop/health", (_req, res) => res.json({ ok: true, service: "hawr-gallery-desktop" }));
  application.get("/__desktop/pair", (req, res) => {
    if (!options.pairingToken || req.query.token !== options.pairingToken) {
      return res.status(401).send("رمز الربط غير صحيح أو منتهي");
    }
    res.setHeader("Set-Cookie", "hawr_pair=approved; Max-Age=2592000; Path=/; SameSite=Lax");
    return res.redirect("/");
  });
  application.use("/api/trpc", (req, res, next) => {
    if (!options.pairingToken || isLoopback(req) || req.headers.cookie?.includes("hawr_pair=approved")) return next();
    return res.status(401).json({ error: "يلزم فتح رابط الربط من الهاتف أولًا" });
  });
  application.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  serveStatic(application);

  const preferredPort = options.port ?? Number.parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(Number.isFinite(preferredPort) ? preferredPort : 0);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, options.host || "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("تعذر معرفة منفذ الخادم المحلي");
  console.log(`Desktop server running on http://127.0.0.1:${address.port}/`);
  return { application, server, port: address.port };
}
