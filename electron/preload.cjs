const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("hawrDesktop", {
  isDesktop: true,
  appName: "معرض حور للأدوات المنزلية",
});
