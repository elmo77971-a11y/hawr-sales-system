import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Windows desktop packaging", () => {
  it("includes the Hawr icon and optional signing configuration", () => {
    const packageJson = JSON.parse(read("package.json"));
    const workflow = read(".github/workflows/windows-desktop.yml");
    expect(packageJson.build.icon).toBe("assets/hawr-icon.ico");
    expect(fs.existsSync(path.join(root, "assets/hawr-icon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(root, "electron/loading.html"))).toBe(true);
    expect(workflow).toContain("WIN_CSC_LINK");
    expect(workflow).toContain("WIN_CSC_KEY_PASSWORD");
  });

  it("contains a first-run wizard and secure LAN pairing route", () => {
    const main = read("electron/main.cjs");
    const setup = read("electron/setup.html");
    const server = read("server/_core/index.ts");
    const desktopServer = read("server/desktop-server.ts");
    expect(setup).toContain("completeSetup");
    expect(main).toContain("setupComplete");
    expect(main).toContain("/__desktop/pair");
    expect(main).toContain('loadFile(path.join(__dirname, "loading.html"))');
    expect(main).toContain("showStartupError");
    expect(read("electron/loading.html")).toContain("جارٍ تشغيل النظام المحلي");
    expect(main).toContain("mainWindow.show()");
    expect(main).toContain('dist", "desktop-server.js');
    expect(desktopServer).toContain("startDesktopServer");
    expect(desktopServer).toContain('import { serveStatic } from "./_core/static"');
    expect(desktopServer).not.toContain('from "vite"');
    expect(server).toContain("hawr_pair=approved");
    expect(server).toContain("يلزم فتح رابط الربط");
    expect(server).toContain('import { serveStatic } from "./static"');
    expect(server).toContain('const { setupVite } = await import("./vite")');
  });
});
