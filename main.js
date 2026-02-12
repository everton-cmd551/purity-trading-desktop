const { app, BrowserWindow, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Configure auto-updater logging
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Don't auto-download — let user decide
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Purity Trading ERP",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    const productionURL = 'https://puritytrading.vercel.app';

    win.setMenuBarVisibility(false);

    if (!app.isPackaged) {
        win.loadURL('http://localhost:3000');
        win.webContents.openDevTools();
    } else {
        win.loadURL(productionURL);
    }

    // Open external links in the default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') && !url.includes('puritytrading.vercel.app')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    return win;
}

// ── Auto-Update Logic ──────────────────────────────────────────────

function setupAutoUpdater() {
    // Check for updates 5 seconds after launch
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 5000);

    // Also check every 30 minutes
    setInterval(() => {
        autoUpdater.checkForUpdates();
    }, 30 * 60 * 1000);

    autoUpdater.on('update-available', (info) => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Update Available',
            message: `A new version (v${info.version}) of Purity Trading ERP is available.`,
            detail: 'Would you like to download and install it now?',
            buttons: ['Update Now', 'Later'],
            defaultId: 0,
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let message = `Download speed: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s`;
        message += ` — ${Math.round(progressObj.percent)}% complete`;
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.setTitle(`Purity Trading ERP — Updating ${Math.round(progressObj.percent)}%`);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
            win.setTitle('Purity Trading ERP');
        }

        dialog.showMessageBox({
            type: 'info',
            title: 'Update Ready',
            message: `Version ${info.version} has been downloaded.`,
            detail: 'The application will restart to apply the update.',
            buttons: ['Restart Now', 'Restart Later'],
            defaultId: 0,
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true);
            }
        });
    });

    autoUpdater.on('error', (err) => {
        // Silently log errors — don't bother the user
        console.error('Auto-update error:', err.message);
    });
}

// ── App Lifecycle ──────────────────────────────────────────────────

app.whenReady().then(() => {
    createWindow();

    // Only run auto-updater in packaged app
    if (app.isPackaged) {
        setupAutoUpdater();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
