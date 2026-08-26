const { app, BrowserWindow, dialog, Menu, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

let mainWindow;
let localServer;

function dataDirectory() {
  return path.join(app.getPath("userData"), "data");
}

function databasePath() {
  return path.join(dataDirectory(), "hawr-gallery.sqlite");
}

async function startLocalServer() {
  fs.mkdirSync(dataDirectory(), { recursive: true });
  process.env.NODE_ENV = "production";
  process.env.LOCAL_DESKTOP_MODE = "1";
  process.env.LOCAL_DB_PATH = databasePath();
  process.env.PORT = "0";
  process.env.ELECTRON_MAIN_PROCESS = "1";
  const serverModule = await import(pathToFileURL(path.join(process.resourcesPath, "app.asar", "dist", "index.js")).href).catch(async () => import(pathToFileURL(path.join(__dirname, "..", "dist", "index.js")).href));
  localServer = await serverModule.startServer();
  return localServer.port;
}

function createMenu() {
  const isArabic = "ar";
  const template = [
    {
      label: "ملف",
      submenu: [
        { label: "نسخ احتياطي للبيانات", click: backupDatabase },
        { label: "استعادة نسخة احتياطية", click: restoreDatabase },
        { type: "separator" },
        { role: "quit", label: "إغلاق البرنامج" },
      ],
    },
    {
      label: "مساعدة",
      submenu: [
        { label: "فتح مجلد البيانات", click: () => shell.openPath(dataDirectory()) },
        { label: "حول معرض حور", click: () => dialog.showMessageBox(mainWindow, { type: "info", title: "معرض حور", message: "نظام إدارة المبيعات والمخزون يعمل محليًا على هذا الكمبيوتر." }) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function backupDatabase() {
  if (!fs.existsSync(databasePath())) return dialog.showMessageBox(mainWindow, { type: "warning", title: "لا توجد بيانات", message: "لم يتم إنشاء قاعدة بيانات بعد." });
  const result = await dialog.showSaveDialog(mainWindow, { title: "حفظ نسخة احتياطية", defaultPath: path.join(app.getPath("documents"), `hawr-gallery-backup-${new Date().toISOString().slice(0, 10)}.sqlite`), filters: [{ name: "SQLite Database", extensions: ["sqlite"] }] });
  if (!result.canceled && result.filePath) fs.copyFileSync(databasePath(), result.filePath);
}

async function restoreDatabase() {
  const result = await dialog.showOpenDialog(mainWindow, { title: "استعادة نسخة احتياطية", properties: ["openFile"], filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }] });
  if (result.canceled || !result.filePaths[0]) return;
  const confirm = await dialog.showMessageBox(mainWindow, { type: "warning", buttons: ["استعادة", "إلغاء"], defaultId: 1, title: "تأكيد الاستعادة", message: "سيتم استبدال البيانات المحلية الحالية. هل تريد المتابعة؟" });
  if (confirm.response === 0) {
    fs.mkdirSync(dataDirectory(), { recursive: true });
    fs.copyFileSync(result.filePaths[0], databasePath());
    await dialog.showMessageBox(mainWindow, { type: "info", title: "تمت الاستعادة", message: "أُعيدت قاعدة البيانات. أغلق البرنامج وافتحه مرة أخرى لتطبيق النسخة." });
  }
}

async function createWindow() {
  const port = await startLocalServer();
  mainWindow = new BrowserWindow({ width: 1440, height: 960, minWidth: 1024, minHeight: 700, title: "معرض حور للأدوات المنزلية", backgroundColor: "#f7f7f5", webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false } });
  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  createMenu();
  mainWindow.on("closed", () => { mainWindow = null; if (localServer?.server) localServer.server.close(); });
}

app.whenReady().then(createWindow).catch(error => { dialog.showErrorBox("تعذر تشغيل معرض حور", error?.stack || String(error)); app.quit(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (!mainWindow) void createWindow(); });
