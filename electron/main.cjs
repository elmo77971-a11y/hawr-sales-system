const { app, BrowserWindow, dialog, Menu, shell, clipboard, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

let mainWindow;
let setupWindow;
let localServer;
let pairingToken;
let lanHost;

function dataDirectory() { return path.join(app.getPath("userData"), "data"); }
function databasePath() { return path.join(dataDirectory(), "hawr-gallery.sqlite"); }
function settingsPath() { return path.join(dataDirectory(), "desktop-settings.json"); }
function readSettings() { try { return JSON.parse(fs.readFileSync(settingsPath(), "utf8")); } catch { return {}; } }
function writeSettings(patch) { fs.mkdirSync(dataDirectory(), { recursive: true }); fs.writeFileSync(settingsPath(), JSON.stringify({ ...readSettings(), ...patch }, null, 2)); }
function localIPv4() { for (const entries of Object.values(os.networkInterfaces())) for (const item of entries || []) if (item.family === "IPv4" && !item.internal) return item.address; return "127.0.0.1"; }
function pairingUrl(port) { return `http://${lanHost}:${port}/__desktop/pair?token=${encodeURIComponent(pairingToken)}`; }

async function startLocalServer() {
  fs.mkdirSync(dataDirectory(), { recursive: true });
  process.env.NODE_ENV = "production"; process.env.LOCAL_DESKTOP_MODE = "1"; process.env.LOCAL_DB_PATH = databasePath(); process.env.PORT = "0"; process.env.ELECTRON_MAIN_PROCESS = "1";
  pairingToken = crypto.randomBytes(18).toString("base64url"); lanHost = localIPv4();
  const serverModule = await import(pathToFileURL(path.join(process.resourcesPath, "app.asar", "dist", "index.js")).href).catch(async () => import(pathToFileURL(path.join(__dirname, "..", "dist", "index.js")).href));
  localServer = await serverModule.startServer({ host: "0.0.0.0", pairingToken });
  return localServer.port;
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({ width: 720, height: 620, resizable: false, title: "الإعداد الأولي — معرض حور", icon: path.join(__dirname, "..", "assets", "hawr-icon.png"), webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } });
  setupWindow.loadFile(path.join(__dirname, "setup.html"));
  setupWindow.on("closed", () => { setupWindow = null; if (!mainWindow) app.quit(); });
}

ipcMain.handle("complete-setup", (_event, values) => {
  const galleryName = String(values?.galleryName || "").trim() || "معرض حور للأدوات المنزلية";
  writeSettings({ setupComplete: true, galleryName, backupReminder: Boolean(values?.backupReminder), setupCompletedAt: new Date().toISOString() });
  if (setupWindow) setupWindow.close();
  void createMainWindow();
  return { success: true };
});

function backupDatabase() {
  if (!fs.existsSync(databasePath())) return dialog.showMessageBox(mainWindow, { type: "warning", title: "لا توجد بيانات", message: "لم يتم إنشاء قاعدة بيانات بعد." });
  return dialog.showSaveDialog(mainWindow, { title: "حفظ نسخة احتياطية", defaultPath: path.join(app.getPath("documents"), `hawr-gallery-backup-${new Date().toISOString().slice(0, 10)}.sqlite`), filters: [{ name: "SQLite Database", extensions: ["sqlite"] }] }).then(result => { if (!result.canceled && result.filePath) fs.copyFileSync(databasePath(), result.filePath); });
}
async function restoreDatabase() {
  const result = await dialog.showOpenDialog(mainWindow, { title: "استعادة نسخة احتياطية", properties: ["openFile"], filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }] });
  if (result.canceled || !result.filePaths[0]) return;
  const confirm = await dialog.showMessageBox(mainWindow, { type: "warning", buttons: ["استعادة", "إلغاء"], defaultId: 1, title: "تأكيد الاستعادة", message: "سيتم استبدال البيانات المحلية الحالية. هل تريد المتابعة؟" });
  if (confirm.response === 0) { fs.copyFileSync(result.filePaths[0], databasePath()); await dialog.showMessageBox(mainWindow, { type: "info", title: "تمت الاستعادة", message: "أُعيدت قاعدة البيانات. أغلق البرنامج وافتحه مرة أخرى." }); }
}
function showPhoneLink() {
  if (!localServer) return;
  const url = pairingUrl(localServer.port); clipboard.writeText(url);
  dialog.showMessageBox(mainWindow, { type: "info", title: "ربط الهاتف عبر Wi‑Fi", message: `افتح هذا الرابط من الهاتف المتصل بنفس شبكة Wi‑Fi:\n\n${url}`, detail: "تم نسخ الرابط تلقائيًا. الرابط صالح حتى إغلاق البرنامج، وبعد الفتح سيُحفظ الارتباط على الهاتف." });
}
function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "ملف", submenu: [{ label: "نسخ احتياطي للبيانات", click: backupDatabase }, { label: "استعادة نسخة احتياطية", click: restoreDatabase }, { type: "separator" }, { role: "quit", label: "إغلاق البرنامج" }] },
    { label: "اتصال الهاتف", submenu: [{ label: "عرض رابط الربط عبر Wi‑Fi", click: showPhoneLink }, { label: "فتح مجلد البيانات", click: () => shell.openPath(dataDirectory()) }] },
    { label: "مساعدة", submenu: [{ label: "حول معرض حور", click: () => dialog.showMessageBox(mainWindow, { type: "info", title: "معرض حور", message: "نظام إدارة المبيعات والمخزون يعمل محليًا على هذا الكمبيوتر." }) }] },
  ]));
}
async function createMainWindow() {
  const port = await startLocalServer();
  mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 1024, minHeight: 700, title: readSettings().galleryName || "معرض حور للأدوات المنزلية", icon: path.join(__dirname, "..", "assets", "hawr-icon.png"), backgroundColor: "#f7f7f5", webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } });
  await mainWindow.loadURL(`http://127.0.0.1:${port}/`); createMenu();
  mainWindow.on("closed", () => { mainWindow = null; if (localServer?.server) localServer.server.close(); });
}
function launch() { if (!readSettings().setupComplete) createSetupWindow(); else void createMainWindow(); }
app.whenReady().then(launch).catch(error => { dialog.showErrorBox("تعذر تشغيل معرض حور", error?.stack || String(error)); app.quit(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (!mainWindow && !setupWindow) launch(); });
