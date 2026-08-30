const { app, BrowserWindow, dialog, Menu, shell, clipboard, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const QRCode = require("qrcode");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");

let mainWindow;
let setupWindow;
let pairingWindow;
let localServer;
let pairingToken;
let lanHost;
let isQuitting = false;
const isDailyBackupInvocation = process.argv.includes("--daily-backup");
let updateConfigured = false;
let updateState = { status: "idle", version: null, downloaded: false, error: null };

const gotSingleInstanceLock = isDailyBackupInvocation ? true : app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();

function dataDirectory() { return path.join(app.getPath("userData"), "data"); }
function databasePath() { return path.join(dataDirectory(), "hawr-gallery.sqlite"); }
function settingsPath() { return path.join(dataDirectory(), "desktop-settings.json"); }
function readSettings() { try { return JSON.parse(fs.readFileSync(settingsPath(), "utf8")); } catch { return {}; } }
function writeSettings(patch) { fs.mkdirSync(dataDirectory(), { recursive: true }); fs.writeFileSync(settingsPath(), JSON.stringify({ ...readSettings(), ...patch }, null, 2)); }
function privateIPv4(address) { return /^(10|192\.168)\./.test(address) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(address); }
function networkAddresses() { const addresses = []; for (const entries of Object.values(os.networkInterfaces())) for (const item of entries || []) if (item.family === "IPv4" && !item.internal && !addresses.includes(item.address)) addresses.push(item.address); return addresses.sort((a, b) => Number(privateIPv4(b)) - Number(privateIPv4(a))); }
function localIPv4() { return networkAddresses()[0] || "127.0.0.1"; }
function pairingUrl(port) { return `http://${lanHost}:${port}/__desktop/pair?token=${encodeURIComponent(pairingToken)}`; }
function assetPath(name) { return path.join(app.getAppPath(), "assets", name); }
function showStartupError(error) { const detail = error?.stack || String(error); console.error("Hawr Gallery startup failed:", detail); dialog.showErrorBox("تعذر تشغيل معرض حور", `${error?.message || String(error)}\n\nيمكنك إرسال هذه التفاصيل للدعم:\n${detail}`); }

function publishUpdateState(next) {
  updateState = { ...updateState, ...next };
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("desktop-update-status", updateState);
}
function configureAutoUpdater() {
  if (updateConfigured || !app.isPackaged) return;
  updateConfigured = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => publishUpdateState({ status: "checking", error: null }));
  autoUpdater.on("update-available", info => publishUpdateState({ status: "available", version: info.version, error: null }));
  autoUpdater.on("update-not-available", info => publishUpdateState({ status: "up-to-date", version: info.version, error: null }));
  autoUpdater.on("download-progress", progress => publishUpdateState({ status: "downloading", percent: Math.round(progress.percent) }));
  autoUpdater.on("update-downloaded", info => publishUpdateState({ status: "downloaded", version: info.version, downloaded: true, percent: 100, error: null }));
  autoUpdater.on("error", error => publishUpdateState({ status: "error", error: error?.message || String(error) }));
  void autoUpdater.checkForUpdates().catch(error => publishUpdateState({ status: "error", error: error?.message || String(error) }));
}

async function startLocalServer() {
  fs.mkdirSync(dataDirectory(), { recursive: true });
  process.env.NODE_ENV = "production";
  process.env.LOCAL_DESKTOP_MODE = "1";
  process.env.LOCAL_DB_PATH = databasePath();
  const preferredPort = Number(readSettings().lanPort) || 3688;
  process.env.PORT = String(preferredPort);
  process.env.ELECTRON_MAIN_PROCESS = "1";
  pairingToken = crypto.randomBytes(18).toString("base64url");
  lanHost = localIPv4();
  const bundledServer = path.join(app.getAppPath(), "dist", "desktop-server.js");
  if (!fs.existsSync(bundledServer)) throw new Error(`ملف تشغيل الخادم المحلي غير موجود: ${bundledServer}`);
  const serverModule = await import(pathToFileURL(bundledServer).href);
  if (typeof serverModule.startDesktopServer !== "function") throw new Error("تعذر العثور على startDesktopServer داخل حزمة البرنامج");
  localServer = await serverModule.startDesktopServer({ host: "0.0.0.0", port: preferredPort, pairingToken });
  writeSettings({ lanPort: localServer.port });
  return localServer.port;
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({ width: 720, height: 620, resizable: false, show: true, title: "الإعداد الأولي — معرض حور", icon: assetPath("hawr-icon.png"), webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } });
  setupWindow.loadFile(path.join(__dirname, "setup.html")).catch(showStartupError);
  setupWindow.on("closed", () => { setupWindow = null; if (!mainWindow && !isQuitting) app.quit(); });
}

ipcMain.handle("complete-setup", async (_event, values) => {
  const galleryName = String(values?.galleryName || "").trim() || "معرض حور للأدوات المنزلية";
  writeSettings({ setupComplete: true, galleryName, backupReminder: Boolean(values?.backupReminder), setupCompletedAt: new Date().toISOString() });
  const startup = createMainWindow();
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
  await startup;
  return { success: true };
});
ipcMain.handle("desktop-local-setup-state", () => {
  if (!fs.existsSync(databasePath())) return { configured: false };
  try { const BetterSqlite3 = require("better-sqlite3"); const db = new BetterSqlite3(databasePath(), { readonly: true }); const row = db.prepare("SELECT a.managerCode,u.id AS managerId,u.role,u.isActive FROM localAuth a LEFT JOIN users u ON u.id = a.managerUserId WHERE a.id = 1 LIMIT 1").get(); db.close(); return { configured: Boolean(row?.managerId && row.role === "admin" && row.isActive !== 0 && row.managerCode) }; } catch { return { configured: false }; }
});
ipcMain.handle("desktop-update-status", () => updateState);
ipcMain.handle("desktop-update-install", () => { if (updateState.downloaded) { isQuitting = true; autoUpdater.quitAndInstall(false, true); return { success: true }; } return { success: false }; });
ipcMain.handle("desktop-network-info", () => ({ host: lanHost, port: localServer?.port || null, addresses: networkAddresses(), url: localServer ? pairingUrl(localServer.port) : null }));
ipcMain.handle("desktop-show-pairing", () => showPhoneLink());
ipcMain.handle("desktop-backup-database", async () => { try { return await backupDatabase(); } catch (error) { return { success: false, error: error?.message || String(error) }; } });
ipcMain.handle("desktop-restore-database", async () => { try { return await restoreDatabase(); } catch (error) { return { success: false, error: error?.message || String(error) }; } });
ipcMain.handle("desktop-reset-database", async () => { try { return await resetDatabase(); } catch (error) { return { success: false, error: error?.message || String(error) }; } });
ipcMain.handle("desktop-automatic-backup-status", () => ({ enabled: true, schedule: "يوميًا الساعة 23:00 حسب توقيت Windows", directory: automaticBackupDirectory(), retention: automaticBackupRetention(), lastBackupAt: readSettings().lastAutomaticBackupAt || null }));

function isSQLiteDatabase(filename) {
  try {
    const stat = fs.statSync(filename);
    if (!stat.isFile() || stat.size < 100) return false;
    const header = fs.readFileSync(filename).subarray(0, 16).toString("utf8");
    if (header !== "SQLite format 3\u0000") return false;
    const BetterSqlite3 = require("better-sqlite3");
    const db = new BetterSqlite3(filename, { readonly: true, fileMustExist: true });
    const integrity = String(db.pragma("quick_check", { simple: true }) || "").toLowerCase();
    const tableCount = Number(db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table'").get()?.count || 0);
    db.close();
    return integrity === "ok" && tableCount > 0;
  } catch (error) { console.warn("SQLite validation failed:", error?.message || error); return false; }
}
function checkpointDatabase() { try { const BetterSqlite3 = require("better-sqlite3"); const db = new BetterSqlite3(databasePath()); db.pragma("wal_checkpoint(TRUNCATE)"); db.close(); } catch (error) { console.warn("SQLite checkpoint skipped:", error?.message || error); } }
function automaticBackupDirectory() { return readSettings().autoBackupDirectory || path.join(app.getPath("documents"), "Hawr Gallery Backups"); }
function automaticBackupRetention() { const value = Number(readSettings().autoBackupRetention); return Number.isInteger(value) && value >= 3 && value <= 90 ? value : 14; }
function automaticBackupFiles(directory) { try { return fs.readdirSync(directory).filter(name => /^hawr-gallery-auto-\\d{8}-\\d{6}\\.sqlite$/.test(name)).map(name => ({ name, path: path.join(directory, name), mtime: fs.statSync(path.join(directory, name)).mtimeMs })).sort((a, b) => b.mtime - a.mtime); } catch { return []; } }
function runAutomaticBackup() {
  if (!fs.existsSync(databasePath())) return { success: false, skipped: true, reason: "لا توجد قاعدة بيانات بعد" };
  const directory = automaticBackupDirectory();
  fs.mkdirSync(directory, { recursive: true });
  checkpointDatabase();
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const filePath = path.join(directory, `hawr-gallery-auto-${stamp}.sqlite`);
  fs.copyFileSync(databasePath(), filePath);
  const files = automaticBackupFiles(directory);
  for (const file of files.slice(automaticBackupRetention())) fs.rmSync(file.path, { force: true });
  writeSettings({ autoBackupDirectory: directory, autoBackupRetention: automaticBackupRetention(), lastAutomaticBackupAt: now.toISOString(), lastAutomaticBackupPath: filePath, lastAutomaticBackupError: null });
  return { success: true, filePath, retained: Math.min(files.length, automaticBackupRetention()) };
}
async function backupDatabase() {
  if (!fs.existsSync(databasePath())) { await dialog.showMessageBox(mainWindow, { type: "warning", title: "لا توجد بيانات", message: "لم يتم إنشاء قاعدة بيانات بعد." }); return { success: false, canceled: false, error: "لا توجد قاعدة بيانات" }; }
  checkpointDatabase();
  const result = await dialog.showSaveDialog(mainWindow, { title: "حفظ نسخة احتياطية", defaultPath: path.join(app.getPath("documents"), `hawr-gallery-backup-${new Date().toISOString().slice(0, 10)}.sqlite`), filters: [{ name: "SQLite Database", extensions: ["sqlite"] }] });
  if (result.canceled || !result.filePath) return { success: false, canceled: true };
  const BetterSqlite3 = require("better-sqlite3");
  const sourceDb = new BetterSqlite3(databasePath(), { readonly: true, fileMustExist: true });
  await sourceDb.backup(result.filePath);
  sourceDb.close();
  return { success: true, filePath: result.filePath };
}
async function resetDatabase() {
  if (!fs.existsSync(databasePath())) { await dialog.showMessageBox(mainWindow, { type: "warning", title: "لا توجد قاعدة بيانات", message: "لا يمكن إعادة الضبط قبل إنشاء قاعدة بيانات." }); return { success: false, error: "لا توجد قاعدة بيانات" }; }
  const backup = await backupDatabase();
  if (!backup.success) return { success: false, canceled: Boolean(backup.canceled), error: backup.error || "يجب حفظ نسخة احتياطية أولًا" };
  const confirm = await dialog.showMessageBox(mainWindow, { type: "warning", buttons: ["إعادة ضبط والبدء من جديد", "إلغاء"], defaultId: 1, cancelId: 1, title: "تأكيد إعادة ضبط النظام", message: "تم حفظ النسخة الاحتياطية بنجاح.", detail: "سيتم حذف الحسابات والمنتجات والفواتير وكل البيانات المحلية، ثم سيظهر معالج إنشاء المدير من جديد. لا يمكن التراجع عن هذه العملية إلا باستخدام النسخة الاحتياطية." });
  if (confirm.response !== 0) return { success: false, canceled: true, backupPath: backup.filePath };
  checkpointDatabase();
  if (localServer?.server) await new Promise(resolve => localServer.server.close(resolve));
  localServer = null;
  fs.rmSync(databasePath(), { force: true });
  fs.rmSync(`${databasePath()}-wal`, { force: true });
  fs.rmSync(`${databasePath()}-shm`, { force: true });
  writeSettings({ setupComplete: false, resetAt: new Date().toISOString() });
  await dialog.showMessageBox(mainWindow, { type: "info", title: "تمت إعادة الضبط", message: "تم حذف البيانات المحلية بعد حفظ النسخة الاحتياطية. سيعاد تشغيل البرنامج لبدء الإعداد من جديد." });
  isQuitting = true;
  app.relaunch();
  app.exit(0);
  return { success: true, backupPath: backup.filePath, requiresRestart: true };
}

async function restoreDatabase() {
  const result = await dialog.showOpenDialog(mainWindow, { title: "استعادة نسخة احتياطية", properties: ["openFile"], filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }] });
  if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true };
  const source = result.filePaths[0];
  if (!isSQLiteDatabase(source)) { await dialog.showMessageBox(mainWindow, { type: "error", title: "ملف غير صالح", message: "الملف المحدد ليس قاعدة SQLite صالحة." }); return { success: false, error: "ملف SQLite غير صالح" }; }
  const confirm = await dialog.showMessageBox(mainWindow, { type: "warning", buttons: ["استعادة", "إلغاء"], defaultId: 1, title: "تأكيد الاستعادة", message: "سيتم استبدال البيانات المحلية الحالية. تأكد من وجود نسخة احتياطية حديثة قبل المتابعة." });
  if (confirm.response !== 0) return { success: false, canceled: true };
  checkpointDatabase();
  if (localServer?.server) await new Promise(resolve => localServer.server.close(resolve));
  localServer = null;
  const temporary = `${databasePath()}.restore-${Date.now()}`;
  const BetterSqlite3 = require("better-sqlite3");
  const sourceDb = new BetterSqlite3(source, { readonly: true, fileMustExist: true });
  await sourceDb.backup(temporary);
  sourceDb.close();
  fs.rmSync(`${databasePath()}-wal`, { force: true });
  fs.rmSync(`${databasePath()}-shm`, { force: true });
  fs.rmSync(databasePath(), { force: true });
  fs.renameSync(temporary, databasePath());
  await dialog.showMessageBox(mainWindow, { type: "info", title: "تمت الاستعادة", message: "تمت استعادة قاعدة البيانات بنجاح. سيعاد تشغيل البرنامج الآن لتطبيق البيانات." });
  isQuitting = true;
  app.relaunch();
  app.exit(0);
  return { success: true, requiresRestart: true };
}
function escapeHtml(value) { return String(value).replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character])); }
async function showPhoneLink() {
  if (!localServer) return dialog.showMessageBox(mainWindow, { type: "warning", title: "الخادم غير جاهز", message: "انتظر حتى يكتمل تشغيل البرنامج ثم أعد المحاولة." });
  const url = pairingUrl(localServer.port);
  clipboard.writeText(url);
  const qr = await QRCode.toDataURL(url, { width: 280, margin: 1, errorCorrectionLevel: "M" });
  if (pairingWindow && !pairingWindow.isDestroyed()) { pairingWindow.show(); pairingWindow.focus(); return { success: true, url }; }
  pairingWindow = new BrowserWindow({ width: 540, height: 700, resizable: false, title: "ربط الهاتف عبر Wi‑Fi", icon: assetPath("hawr-icon.png"), webPreferences: { contextIsolation: true, nodeIntegration: false } });
  pairingWindow.on("closed", () => { pairingWindow = null; });
  const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>ربط الهاتف — معرض حور</title><style>body{margin:0;background:#f7f7f5;color:#0b1020;font-family:Segoe UI,Tahoma,sans-serif;text-align:center;padding:28px}h1{font-size:24px;margin:0 0 10px}p{color:#64748b;line-height:1.8}.card{background:#fff;padding:24px;border:1px solid #e5e7eb;box-shadow:0 12px 35px #0b10200f}.qr{width:280px;height:280px;margin:18px auto;image-rendering:pixelated}.url{direction:ltr;word-break:break-all;background:#f1f5f9;padding:12px;font-size:12px}.hint{color:#b91c1c;font-size:13px}</style><div class="card"><div style="font-size:40px;font-weight:900;color:#e30613">ح</div><h1>ربط الهاتف عبر Wi‑Fi</h1><p>اتصل الهاتف والكمبيوتر بنفس شبكة Wi‑Fi، ثم امسح رمز QR أو افتح الرابط يدويًا.</p><img class="qr" src="${qr}" alt="رمز الربط"><div class="url">${escapeHtml(url)}</div><p class="hint">إذا لم يفتح الرابط، أوقف بيانات الهاتف مؤقتًا وتأكد أن شبكة Windows مصنفة Private وأن جدار الحماية يسمح للبرنامج.</p></div></html>`;
  await pairingWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return { success: true, url };
}
function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "ملف", submenu: [{ label: "نسخ احتياطي للبيانات", click: backupDatabase }, { label: "استعادة نسخة احتياطية", click: restoreDatabase }, { type: "separator" }, { role: "quit", label: "إغلاق البرنامج" }] },
    { label: "اتصال الهاتف", submenu: [{ label: "عرض QR ورابط الربط عبر Wi‑Fi", click: () => void showPhoneLink() }, { label: "فتح مجلد البيانات", click: () => shell.openPath(dataDirectory()) }] },
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
    if (mainWindow && !mainWindow.isDestroyed()) { await mainWindow.loadURL(`http://127.0.0.1:${port}/`); createMenu(); mainWindow.show(); configureAutoUpdater(); }
  } catch (error) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    showStartupError(error);
    throw error;
  }
  return mainWindow;
}
async function launch() { await createMainWindow(); }
async function runDailyBackupAndExit() { try { const result = runAutomaticBackup(); if (!result.success && !result.skipped) writeSettings({ lastAutomaticBackupError: result.reason || "فشل النسخ التلقائي" }); } catch (error) { try { writeSettings({ lastAutomaticBackupError: error?.message || String(error) }); } catch {} } finally { app.quit(); } }

if (gotSingleInstanceLock) {
  app.on("second-instance", () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(() => isDailyBackupInvocation ? runDailyBackupAndExit() : launch()).catch(error => { showStartupError(error); app.quit(); });
  app.on("before-quit", () => { isQuitting = true; });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
  app.on("activate", () => { if (!mainWindow && !setupWindow) void launch().catch(showStartupError); });
}
