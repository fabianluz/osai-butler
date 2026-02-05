const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple local apps this is fine
    },
    // icon: path.join(__dirname, 'public/vite.svg') // Uncomment if you have an icon
  });

  // In production, load the built index.html
  // In development, load the vite server
  const isDev = !app.isPackaged;

  if (isDev) {
    // We try to load the URL, if it fails (server not running), we wait or retry
    win.loadURL("http://localhost:5173").catch((e) => {
      console.log("Vite server not ready yet. Reloading...");
      setTimeout(() => win.reload(), 1000);
    });
    win.webContents.openDevTools(); // Open console for debugging
  } else {
    // This loads the React build output
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
