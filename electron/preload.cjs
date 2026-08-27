const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hawrDesktop", {
  isDesktop: true,
  appName: "معرض حور للأدوات المنزلية",
  completeSetup: (values) => ipcRenderer.invoke("complete-setup", values),
  getUpdateStatus: () => ipcRenderer.invoke("desktop-update-status"),
  installUpdate: () => ipcRenderer.invoke("desktop-update-install"),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("desktop-update-status", listener);
    return () => ipcRenderer.removeListener("desktop-update-status", listener);
  },
  getNetworkInfo: () => ipcRenderer.invoke("desktop-network-info"),
  showPairing: () => ipcRenderer.invoke("desktop-show-pairing"),
});
