const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
  });

  win.loadURL('http://162.141.0.9:5173');
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
}

app.whenReady().then(() => {
  createWindow();
});
