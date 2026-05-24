const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  win.loadURL('http://162.141.0.9:5173');
}

app.whenReady().then(() => {
  createWindow();
});