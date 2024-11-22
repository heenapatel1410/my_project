const { app, BrowserWindow, ipcMain ,desktopCapturer} = require('electron');
const path = require('path');

let mainWindow;
let dashboardWindow;

function createLoginWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      webPreferences: {
        devTools: true
      }
    },
  });

  mainWindow.loadFile('src/login.html');
  mainWindow.setMenu(null); // Disable default menu
  mainWindow.webContents.openDevTools();
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  dashboardWindow.loadFile('src/dashboard.html');
  dashboardWindow.setMenu(null);
}

app.whenReady().then(() => {
  createLoginWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createLoginWindow();
  });

  ipcMain.on('get-sources', async (event) => {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    event.reply('sources-received', sources);
});

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Listen for login success and open dashboard
ipcMain.on('login-success', (event, arg) => {
  if (arg === 'success') {
    mainWindow.close(); // Close login window
    createDashboardWindow(); // Open dashboard window
  }
});

