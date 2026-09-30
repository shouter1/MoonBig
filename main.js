const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: "#f2f5fb",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "geolocation") {
      callback(true);
      return;
    }
    callback(false);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
