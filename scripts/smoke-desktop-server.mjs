import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dbPath = path.join(os.tmpdir(), `hawr-gallery-smoke-${process.pid}.sqlite`);
process.env.NODE_ENV = "production";
process.env.LOCAL_DESKTOP_MODE = "1";
process.env.LOCAL_DB_PATH = dbPath;
process.env.PORT = "0";
process.env.ELECTRON_MAIN_PROCESS = "1";

const desktopServerUrl = pathToFileURL(path.join(root, "dist", "desktop-server.js")).href;
const { startDesktopServer } = await import(desktopServerUrl);
const runtime = await startDesktopServer({ host: "127.0.0.1", pairingToken: "smoke-token" });
const baseUrl = `http://127.0.0.1:${runtime.port}`;

try {
  const page = await fetch(`${baseUrl}/`);
  if (!page.ok) throw new Error(`Desktop page returned HTTP ${page.status}`);
  const html = await page.text();
  if (!html.includes("<div id=\"root\">") && !html.includes("<div id=\"root\"></div>")) {
    throw new Error("Desktop page did not contain the React root");
  }

  const denied = await fetch(`${baseUrl}/__desktop/pair?token=wrong`, { redirect: "manual" });
  if (denied.status !== 401) throw new Error(`Invalid pairing token returned HTTP ${denied.status}`);

  const approved = await fetch(`${baseUrl}/__desktop/pair?token=smoke-token`, { redirect: "manual" });
  if (approved.status !== 302) throw new Error(`Valid pairing token returned HTTP ${approved.status}`);

  console.log(`Desktop server smoke test passed on port ${runtime.port}.`);
} finally {
  await new Promise((resolve) => runtime.server.close(resolve));
  for (const suffix of ["", "-wal", "-shm"]) {
    try { fs.rmSync(`${dbPath}${suffix}`, { force: true }); } catch { /* ignore cleanup errors */ }
  }
}
