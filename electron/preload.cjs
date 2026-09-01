const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hawrDesktop", {
  isDesktop: true,
  appName: "معرض حور للأدوات المنزلية",
  completeSetup: (values) => ipcRenderer.invoke("complete-setup", values),
  getLocalSetupState: () => ipcRenderer.invoke("desktop-local-setup-state"),
  backupDatabase: () => ipcRenderer.invoke("desktop-backup-database"),
  restoreDatabase: () => ipcRenderer.invoke("desktop-restore-database"),
  resetDatabase: () => ipcRenderer.invoke("desktop-reset-database"),
  getAutomaticBackupStatus: () => ipcRenderer.invoke("desktop-automatic-backup-status"),
});
