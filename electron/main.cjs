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

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

function dataDirectory() { return path.join(app.getPath("userData"), "data"); }
function databasePath() { return path.join(dataDirectory(), "hawr-gallery.sqlite"); }
function settingsPath() { return path.join(dataDirectory(), "desktop-settings.json"); }
function readSettings() { try { return JSON.parse(fs.readFileSync(settingsPath(), "utf8")); } catch { return {}; } }
function writeSettings(patch) { fs.mkdirSync(dataDirectory(), { recursive: true }); fs.writeFileSync(settingsPath(), JSON.stringify({ ...readSettings(), ...patch }, null, 2)); }
function localIPv4() { for (const entries of Object.values(os.networkInterfaces())) for (const item of entries || []) if (item.family === "IPv4" && !item.internal) return item.address; return "127.0.0.1"; }
function pairingUrl(port) { return `http://${lanHost}:${port}/__desktop/pair?token=${encodeURIComponent(pairingToken)}`; }
function assetPath(name) { return path.join(app.getAppPath(), "assets", name); }
function showStartupError(error) {
  const detail = error?.stack || String(error);
  console.error("Hawr Gallery startup failed:", detail);
  dialog.showErrorBox("تعذر تشغيل معرض حور", `${error?.message || String(error)}\n\nيمكنك إرسال هذه التفاصيل للدعم:\n${detail}`);
}

async function startLocalServer() {
  fs.mkdirSync(dataDirectory(), { recursive: true });
  process.env.NODE_ENV = "production";
  process.env.LOCAL_DESKTOP_MODE = "1";
  process.env.LOCAL_DB_PATH = databasePath();
  process.env.PORT = "0";
  process.env.ELECTRON_MAIN_PROCESS = "1";
  pairingToken = crypto.randomBytes(18).toString("base64url");
  lanHost = localIPv4();
  const bundledServer = path.join(app.getAppPath(), "dist", "desktop-server.js");
  if (!fs.existsSync(bundledServer)) throw new Error(`ملف تشغيل الخادم المحلي غير موجود: ${bundledServer}`);
  const serverModule = await import(pathToFileURL(bundledServer).href);
  if (typeof serverModule.startDesktopServer !== "function") throw new Error("تعذر العثور على startDesktopServer داخل حزمة البرنامج");
  localServer = await serverModule.startDesktopServer({ host: "0.0.0.0", pairingToken });
  return localServer.port;
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({ width: 720, height: 620, resizable: false, show: true, title: "الإعداد الأولي — معرض حور", icon: assetPath("hawr-icon.png"), webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } });
  setupWindow.loadFile(path.join(__dirname, "setup.html")).catch(showStartupError);
  setupWindow.on("closed", () => { setupWindow = null; if (!mainWindow && !app.isQuitting) app.quit(); });
}

ipcMain.handle("complete-setup", async (_event, values) => {
  const galleryName = String(values?.galleryName || "").trim() || "معرض حور للأدوات المنزلية";
  writeSettings({ setupComplete: true, galleryName, backupReminder: Boolean(values?.backupReminder), setupCompletedAt: new Date().toISOString() });
  const startup = createMainWindow();
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
  await startup;
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
  if (!localServer) return dialog.showMessageBox(mainWindow, { type: "warning", title: "الخادم غير جاهز", message: "انتظر حتى يكتمل تشغيل البرنامج ثم أعد المحاولة." });
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
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); return mainWindow; }
  mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 1024, minHeight: 700, show: true, title: readSettings().galleryName || "معرض حور للأدوات المنزلية", icon: assetPath("hawr-icon.png"), backgroundColor: "#f7f7f5", webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } });
  mainWindow.on("closed", () => { mainWindow = null; if (localServer?.server) localServer.server.close(); });
  try {
    await mainWindow.loadFile(path.join(__dirname, "loading.html"));
    const port = await startLocalServer();
    if (mainWindow && !mainWindow.isDestroyed()) { await mainWindow.loadURL(`http://127.0.0.1:${port}/`); createMenu(); mainWindow.show(); }
  } catch (error) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    showStartupError(error);
    throw error;
  }
  return mainWindow;
}
async function launch() { if (!readSettings().setupComplete) createSetupWindow(); else await createMainWindow(); }

if (gotSingleInstanceLock) {
  app.on("second-instance", () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(launch).catch(error => { showStartupError(error); app.quit(); });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
  app.on("activate", () => { if (!mainWindow && !setupWindow) void launch().catch(showStartupError); });
}
