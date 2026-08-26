const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hawrDesktop", {
  isDesktop: true,
  appName: "معرض حور للأدوات المنزلية",
  completeSetup: (values) => ipcRenderer.invoke("complete-setup", values),
});
