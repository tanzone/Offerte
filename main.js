const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// ===== SYNEXA - MAIN PROCESS =====
// Secure & Performant Electron Backend

'use strict';

// ===== CONSTANTS =====
const APP_CONFIG = {
    name: 'Synexa',
    version: '2.0.0',
    dataPath: path.join(os.homedir(), 'Synexa'),
    window: {
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700
    }
};

const DATA_FILES = {
    quotes: path.join(APP_CONFIG.dataPath, 'quotes.json'),
    products: path.join(APP_CONFIG.dataPath, 'products.json'),
    clients: path.join(APP_CONFIG.dataPath, 'clients.json'),
    settings: path.join(APP_CONFIG.dataPath, 'settings.json'),
    analytics: path.join(APP_CONFIG.dataPath, 'analytics.json'),
    reports: path.join(APP_CONFIG.dataPath, 'reports')
};

// ===== GLOBAL VARIABLES =====
let mainWindow = null;
let isAppReady = false;
let appSettings = {};

// ===== UTILITY FUNCTIONS =====
const FileManager = {
    async ensureDirectories() {
        try {
            await fs.access(APP_CONFIG.dataPath);
        } catch {
            await fs.mkdir(APP_CONFIG.dataPath, { recursive: true });
        }
        
        try {
            await fs.access(DATA_FILES.reports);
        } catch {
            await fs.mkdir(DATA_FILES.reports, { recursive: true });
        }
    },

    async safeRead(filePath, defaultValue = null) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            const parsed = JSON.parse(data);
            console.log(`✅ Loaded: ${path.basename(filePath)} (${Array.isArray(parsed) ? parsed.length : 'object'} items)`);
            return parsed;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`⚠️ Read error ${path.basename(filePath)}:`, error.message);
            }
            return defaultValue;
        }
    },

    async safeWrite(filePath, data) {
        try {
            // Create backup if file exists
            try {
                await fs.access(filePath);
                const backupPath = `${filePath}.backup`;
                await fs.copyFile(filePath, backupPath);
            } catch {
                // File doesn't exist, no backup needed
            }

            // Write new data
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ Saved: ${path.basename(filePath)}`);
            return true;
        } catch (error) {
            console.error(`❌ Write error ${path.basename(filePath)}:`, error.message);
            return false;
        }
    },

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(APP_CONFIG.dataPath, 'backups', timestamp);
            await fs.mkdir(backupDir, { recursive: true });

            const files = Object.keys(DATA_FILES).filter(key => key !== 'reports');
            
            for (const key of files) {
                const sourcePath = DATA_FILES[key];
                const destPath = path.join(backupDir, `${key}.json`);
                
                try {
                    await fs.copyFile(sourcePath, destPath);
                } catch {
                    console.log(`File ${key}.json not found, skipping backup`);
                }
            }

            console.log(`✅ Backup created: ${backupDir}`);
            return backupDir;
        } catch (error) {
            console.error('❌ Backup error:', error.message);
            return null;
        }
    }
};

const SecurityManager = {
    validateInput(data) {
        if (typeof data !== 'object' || data === null) {
            return false;
        }
        
        // Check for dangerous properties
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        const keys = Object.keys(data);
        
        return !keys.some(key => dangerousKeys.includes(key));
    },

    sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    },

    isValidPath(filePath) {
        const normalizedPath = path.normalize(filePath);
        return normalizedPath.startsWith(APP_CONFIG.dataPath) || 
               normalizedPath.startsWith(os.homedir());
    }
};

// ===== WINDOW MANAGEMENT =====
function createMainWindow() {
    mainWindow = new BrowserWindow({
        ...APP_CONFIG.window,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            allowRunningInsecureContent: false,
            experimentalFeatures: false
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        show: false,
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
        frame: false,
        backgroundColor: '#667eea',
        autoHideMenuBar: true
    });

    // Load the app
    mainWindow.loadFile('index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        isAppReady = true;
        
        // Create initial backup
        setTimeout(() => FileManager.createBackup(), 2000);
    });

    // Handle window close
    mainWindow.on('close', async (e) => {
        if (!isAppReady) return;
        
        e.preventDefault();
        
        const choice = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            buttons: ['Esci', 'Annulla'],
            defaultId: 0,
            title: 'Conferma Uscita',
            message: 'Chiudere Synexa?',
            detail: 'Tutti i dati verranno salvati automaticamente.'
        });
        
        if (choice.response === 0) {
            await FileManager.createBackup();
            isAppReady = false;
            mainWindow.destroy();
        }
    });

    // Create application menu
    createApplicationMenu();
}

function createApplicationMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Nuova Offerta',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => sendToRenderer('new-quote')
                },
                {
                    label: 'Salva Offerta',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => sendToRenderer('save-quote')
                },
                { type: 'separator' },
                {
                    label: 'Esporta PDF',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => sendToRenderer('export-pdf')
                },
                { type: 'separator' },
                {
                    label: 'Backup Dati',
                    click: () => performBackup()
                },
                { type: 'separator' },
                {
                    label: 'Esci',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Modifica',
            submenu: [
                { role: 'undo', label: 'Annulla' },
                { role: 'redo', label: 'Ripeti' },
                { type: 'separator' },
                { role: 'cut', label: 'Taglia' },
                { role: 'copy', label: 'Copia' },
                { role: 'paste', label: 'Incolla' },
                { role: 'selectall', label: 'Seleziona Tutto' }
            ]
        },
        {
            label: 'Visualizza',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => sendToRenderer('navigate-to', 'dashboard')
                },
                {
                    label: 'Offerte',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => sendToRenderer('navigate-to', 'quotes')
                },
                {
                    label: 'Clienti',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => sendToRenderer('navigate-to', 'clients')
                },
                {
                    label: 'Prodotti',
                    accelerator: 'CmdOrCtrl+4',
                    click: () => sendToRenderer('navigate-to', 'products')
                },
                { type: 'separator' },
                { role: 'reload', label: 'Ricarica' },
                { role: 'toggleDevTools', label: 'Strumenti Sviluppatore' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'Zoom Normale' },
                { role: 'zoomIn', label: 'Ingrandisci' },
                { role: 'zoomOut', label: 'Riduci' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Schermo Intero' }
            ]
        },
        {
            label: 'Aiuto',
            submenu: [
                {
                    label: 'Informazioni su Synexa',
                    click: () => showAboutDialog()
                },
                {
                    label: 'Guida Rapida',
                    click: () => sendToRenderer('show-help')
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about', label: `Informazioni su ${APP_CONFIG.name}` },
                { type: 'separator' },
                { role: 'services', label: 'Servizi', submenu: [] },
                { type: 'separator' },
                { role: 'hide', label: `Nascondi ${APP_CONFIG.name}` },
                { role: 'hideothers', label: 'Nascondi Altri' },
                { role: 'unhide', label: 'Mostra Tutto' },
                { type: 'separator' },
                { role: 'quit', label: `Esci da ${APP_CONFIG.name}` }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function sendToRenderer(channel, ...args) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, ...args);
    }
}

// ===== IPC HANDLERS =====

// Window Controls
ipcMain.handle('minimize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
    }
});

ipcMain.handle('maximize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
});

// Data Management
ipcMain.handle('load-quotes', async () => {
    await FileManager.ensureDirectories();
    return await FileManager.safeRead(DATA_FILES.quotes, []);
});

ipcMain.handle('save-quotes', async (event, quotes) => {
    if (!SecurityManager.validateInput(quotes)) {
        throw new Error('Invalid quotes data');
    }
    
    await FileManager.ensureDirectories();
    return await FileManager.safeWrite(DATA_FILES.quotes, quotes);
});

ipcMain.handle('load-products', async () => {
    await FileManager.ensureDirectories();
    return await FileManager.safeRead(DATA_FILES.products, []);
});

ipcMain.handle('save-products', async (event, products) => {
    if (!SecurityManager.validateInput(products)) {
        throw new Error('Invalid products data');
    }
    
    await FileManager.ensureDirectories();
    return await FileManager.safeWrite(DATA_FILES.products, products);
});

ipcMain.handle('load-clients', async () => {
    await FileManager.ensureDirectories();
    return await FileManager.safeRead(DATA_FILES.clients, []);
});

ipcMain.handle('save-clients', async (event, clients) => {
    if (!SecurityManager.validateInput(clients)) {
        throw new Error('Invalid clients data');
    }
    
    await FileManager.ensureDirectories();
    return await FileManager.safeWrite(DATA_FILES.clients, clients);
});

ipcMain.handle('load-settings', async () => {
    await FileManager.ensureDirectories();
    const defaultSettings = {
        defaultCurrency: 'EUR',
        language: 'it',
        theme: 'light',
        company: {
            name: '',
            address: '',
            vat: '',
            phone: '',
            email: ''
        },
        notifications: {
            enabled: true,
            sound: true
        },
        backup: {
            autoBackup: true,
            interval: 24
        }
    };
    
    return await FileManager.safeRead(DATA_FILES.settings, defaultSettings);
});

ipcMain.handle('save-settings', async (event, settings) => {
    if (!SecurityManager.validateInput(settings)) {
        throw new Error('Invalid settings data');
    }
    
    await FileManager.ensureDirectories();
    return await FileManager.safeWrite(DATA_FILES.settings, settings);
});

// PDF Management
ipcMain.handle('save-pdf', async (event, pdfData, fileName, options = {}) => {
    try {
        const sanitizedFileName = SecurityManager.sanitizeFilename(fileName);
        const defaultPath = path.join(os.homedir(), 'Desktop', `${sanitizedFileName}.pdf`);
        
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Salva PDF',
            defaultPath,
            filters: [
                { name: 'PDF Files', extensions: ['pdf'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['createDirectory']
        });

        if (!result.canceled && SecurityManager.isValidPath(result.filePath)) {
            const buffer = Buffer.from(pdfData, 'base64');
            await fs.writeFile(result.filePath, buffer);
            
            if (options.openAfterSave) {
                shell.openPath(result.filePath);
            }
            
            return { success: true, path: result.filePath };
        }

        return { success: false, canceled: true };
        
    } catch (error) {
        console.error('PDF save error:', error);
        return { success: false, error: error.message };
    }
});

// Backup Management
ipcMain.handle('create-backup', async () => {
    const backupPath = await FileManager.createBackup();
    return { success: !!backupPath, path: backupPath };
});

ipcMain.handle('list-backups', async () => {
    try {
        const backupsDir = path.join(APP_CONFIG.dataPath, 'backups');
        
        try {
            const backups = await fs.readdir(backupsDir);
            const backupInfo = await Promise.all(
                backups.map(async (backup) => {
                    const backupPath = path.join(backupsDir, backup);
                    const stat = await fs.stat(backupPath);
                    return {
                        name: backup,
                        path: backupPath,
                        date: stat.mtime,
                        size: stat.size
                    };
                })
            );
            
            return { 
                success: true, 
                backups: backupInfo.sort((a, b) => b.date - a.date) 
            };
        } catch {
            return { success: true, backups: [] };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Dialog Utilities
ipcMain.handle('show-error', async (event, title, message) => {
    return dialog.showErrorBox(title, message);
});

ipcMain.handle('show-info', async (event, title, message, detail = '') => {
    return dialog.showMessageBox(mainWindow, {
        type: 'info',
        title,
        message,
        detail,
        buttons: ['OK']
    });
});

ipcMain.handle('show-question', async (event, title, message, buttons = ['Sì', 'No']) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title,
        message,
        buttons,
        defaultId: 0,
        cancelId: 1
    });
    
    return result.response;
});

// System Utilities
ipcMain.handle('get-app-version', () => {
    return APP_CONFIG.version;
});

ipcMain.handle('get-system-info', () => {
    return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        appVersion: APP_CONFIG.version,
        dataPath: APP_CONFIG.dataPath,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
    };
});

ipcMain.handle('open-external', (event, url) => {
    // Validate URL for security
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') {
            return shell.openExternal(url);
        }
    } catch {
        return false;
    }
});

ipcMain.handle('show-item-in-folder', (event, filePath) => {
    if (SecurityManager.isValidPath(filePath)) {
        return shell.showItemInFolder(filePath);
    }
    return false;
});

// ===== HELPER FUNCTIONS =====
async function performBackup() {
    try {
        const backupPath = await FileManager.createBackup();
        if (backupPath) {
            const choice = await dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Backup Completato',
                message: 'Backup creato con successo!',
                detail: `Backup salvato in: ${backupPath}`,
                buttons: ['Apri Cartella', 'OK']
            });
            
            if (choice.response === 0) {
                shell.showItemInFolder(backupPath);
            }
        }
    } catch (error) {
        dialog.showErrorBox('Errore', `Impossibile creare il backup: ${error.message}`);
    }
}

function showAboutDialog() {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Informazioni',
        message: `${APP_CONFIG.name} v${APP_CONFIG.version}`,
        detail: `
Sistema di gestione offerte commerciali professionale

Caratteristiche:
• Gestione clienti completa
• Analytics e reporting avanzati
• Database prodotti intelligente
• Esportazione PDF professionale
• Backup automatico sicuro

Sviluppato con Electron
© 2025 - Tutti i diritti riservati
        `.trim(),
        buttons: ['OK']
    });
}

// ===== APP EVENT HANDLERS =====
app.whenReady().then(async () => {
    await FileManager.ensureDirectories();
    createMainWindow();
    
    // Setup auto-backup (every 24 hours)
    setInterval(() => {
        if (isAppReady) {
            FileManager.createBackup();
        }
    }, 24 * 60 * 60 * 1000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (navigationEvent, navigationURL) => {
        navigationEvent.preventDefault();
        
        // Only allow HTTPS URLs
        try {
            const urlObj = new URL(navigationURL);
            if (urlObj.protocol === 'https:') {
                shell.openExternal(navigationURL);
            }
        } catch {
            console.warn('Blocked navigation to invalid URL:', navigationURL);
        }
    });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // In production, you should validate certificates properly
    event.preventDefault();
    callback(false);
});

// ===== ERROR HANDLING =====
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
        dialog.showErrorBox(
            'Errore Critico',
            `Si è verificato un errore critico:\n\n${error.message}\n\nL'applicazione potrebbe essere instabile.`
        );
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
});

// Squirrel startup (Windows installer)
if (require('electron-squirrel-startup')) {
    app.quit();
}

console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version} - Main process started`);