import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { serveStatic } from "./_core/static";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  if (startPort === 0) return 0;
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function startDesktopServer(options: { port?: number } = {}) {
  const application = express();
  const server = createServer(application);
  application.use(express.json({ limit: "50mb" }));
  application.use(express.urlencoded({ limit: "50mb", extended: true }));
  application.get("/__desktop/health", (_req, res) => res.json({ ok: true, service: "hawr-gallery-desktop" }));
  application.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  serveStatic(application);

  const preferredPort = options.port ?? Number.parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(Number.isFinite(preferredPort) ? preferredPort : 0);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("تعذر معرفة منفذ الخادم المحلي");
  console.log(`Desktop server running on http://127.0.0.1:${address.port}/`);
  return { application, server, port: address.port };
}
