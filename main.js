const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;
let splashWindow;

// Secure Storage IPC Handlers
ipcMain.handle('encrypt-data', async (event, plainText) => {
    if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(plainText);
    }
    throw new Error('Encryption not available');
});

ipcMain.handle('decrypt-data', async (event, encryptedBuffer) => {
    if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(encryptedBuffer);
    }
    throw new Error('Encryption not available');
});

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        center: true,
        webPreferences: {
            nodeIntegration: false
        }
    });

    splashWindow.loadFile('splash.html');
}

async function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        show: false, // Initially hide while loading
        autoHideMenuBar: true, // Native look: Hide menus
        icon: path.join(__dirname, 'assets/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true, // Financial Grade: Enable Sandboxing
            preload: path.join(__dirname, 'preload.js'),
            devTools: false // Production grade: Disable DevTools
        }
    });

    // FORCE LOAD PRODUCTION URL
    // Clear only HTTP cache to ensure we get the latest deployment, but keep cookies (login)
    await mainWindow.webContents.session.clearCache();

    mainWindow.loadURL('https://puritytrading.vercel.app');

    // Force the view to be compact and crisp (85% zoom)
    mainWindow.webContents.setZoomFactor(0.85);

    // Optional: Prevent users from zooming in/out accidentally
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

    // Once the main system is ready, switch windows
    mainWindow.once('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.destroy();
        }
        mainWindow.show();
        mainWindow.maximize();
    });

    // Handle crash or refresh
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', () => {
    createSplashWindow();
    createMainWindow();

    // Check for updates immediately
    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});

// Auto-Updater Events
autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
    log.info('Update available.');
    // Automatically download
    autoUpdater.downloadUpdate();
});
autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available.');
});
autoUpdater.on('error', (err) => {
    log.info('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded');
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'A new version has been downloaded. Restart the application to apply the updates.',
        buttons: ['Restart & Install']
    }).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
});
