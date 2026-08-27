import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  path.join(root, "dist", "desktop-server.js"),
  path.join(root, "dist", "public", "index.html"),
  path.join(root, "electron", "main.cjs"),
  path.join(root, "electron", "loading.html"),
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing desktop build file: ${file}`);
}

const desktopBundle = fs.readFileSync(path.join(root, "dist", "desktop-server.js"), "utf8");
const forbiddenRuntimeImports = [
  'from "vite"',
  'from "@vitejs/',
  'from "@tailwindcss/vite"',
  'from "vite-plugin-manus-runtime"',
  'require("vite")',
];
const found = forbiddenRuntimeImports.filter((token) => desktopBundle.includes(token));
if (found.length > 0) throw new Error(`Development-only imports leaked into desktop-server.js: ${found.join(", ")}`);

const main = fs.readFileSync(path.join(root, "electron", "main.cjs"), "utf8");
if (!main.includes('path.join(app.getAppPath(), "dist", "desktop-server.js")')) {
  throw new Error("Electron main process is not pointing at dist/desktop-server.js");
}

console.log("Desktop production bundle verified: required files exist and no Vite runtime imports leaked.");
