const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');

// Fix: Disable hardware acceleration to prevent white screen on some systems
app.disableHardwareAcceleration();

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Purity Trading ERP",
        webPreferences: {
            nodeIntegration: false, // Security: Must be FALSE for remote content
            contextIsolation: true, // Security: Must be TRUE
            // preload: path.join(__dirname, 'preload.js') // Optional if needed later
        }
    });

    // CRITICAL: Load the live production URL. 
    // Do NOT load localhost or file:// in production.
    const productionURL = 'https://puritytrading.vercel.app';

    // Remove the default menu (optional, makes it look more like an app)
    win.setMenuBarVisibility(false); // Enable menu for debugging

    // Enhanced Error Handling
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
        // Show error to user so they know what happened
        dialog.showErrorBox('Connection Error', `Failed to load application.\nError: ${errorDescription} (${errorCode})\nPlease check your internet connection.`);
    });

    win.webContents.on('crashed', (event) => {
        console.error('Renderer process crashed');
        dialog.showErrorBox('Application Error', 'The application renderer process crashed. Please restart the app.');
    });

    if (app.isPackaged) {
        // If running the .exe, load the Live Vercel App
        console.log(`Loading Production URL: ${productionURL}`);
        win.loadURL(productionURL).catch(err => console.error('Error loading URL:', err));
        // win.webContents.openDevTools(); // <--- CRITICAL: Open Console for debugging
    } else {
        // If running 'npm start', load localhost
        win.loadURL('http://localhost:3000');
    }

    // Always open DevTools for now to see console errors
    // win.webContents.openDevTools(); // Commented out for production, but can be enabled for debugging

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer Console] ${message} (${sourceId}:${line})`);
    });

    // UX: Open external links (like PDF invoices or Help pages) in the user's default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') && !url.includes('puritytrading.vercel.app')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
