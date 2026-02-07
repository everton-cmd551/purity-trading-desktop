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
            // NUCLEAR FIX: Use a new partition to abandon all old cache/storage
            partition: 'persist:purity_trading_live_v2',
            devTools: false // Production grade: Disable DevTools
        }
    });

    // --- CURTAIN LIFTER LOGIC (Move to top to ensure it runs) ---

    // 1. Show when ready (Standard Way)
    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.destroy();
        }
        mainWindow.show();
        mainWindow.maximize();
    });

    // 2. Backup: Show when finished loading
    mainWindow.webContents.on('did-finish-load', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.destroy();
            mainWindow.show();
            mainWindow.maximize();
        }
    });

    // 3. Failsafe (Safety Net): Force show after 5 seconds NO MATTER WHAT
    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.destroy();
            mainWindow.show();
            mainWindow.maximize();
        }
    }, 5000);

    // --- END CURTAIN LIFTER ---

    // Clear HTTP cache (Non-blocking: no await)
    mainWindow.webContents.session.clearCache();

    console.log('Loading URL: https://puritytrading.vercel.app');
    mainWindow.loadURL('https://puritytrading.vercel.app');

    // AGGRESSIVE CACHE BUSTING: Unregister any existing Service Workers
    mainWindow.webContents.executeJavaScript(`
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for(let registration of registrations) {
                    registration.unregister();
                }
            });
            caches.keys().then(names => {
                for (let name of names) caches.delete(name);
            });
        }
    `);

    // Force crisp view
    mainWindow.webContents.setZoomFactor(0.85);
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);

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
