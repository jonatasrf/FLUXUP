import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // In development, load from Vite dev server
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load from dist folder
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Handle window close
    let isForceClose = false;

    mainWindow.on('close', async (event) => {
        if (isForceClose) return;

        event.preventDefault();
        mainWindow.webContents.send('close-requested');
    });

    // Handle close confirmation from renderer
    ipcMain.handle('confirm-close', async (event, shouldSave) => {
        isForceClose = true;
        mainWindow.close();
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Show file dialog
ipcMain.handle('show-open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
});

// IPC Handlers for File System
ipcMain.handle('get-flows', async () => {
    const isDev = process.env.NODE_ENV === 'development';
    const flowsPath = isDev
        ? path.join(__dirname, '../flows')
        : path.join(process.resourcesPath, 'flows');

    console.log('Loading flows from:', flowsPath);

    if (!fs.existsSync(flowsPath)) {
        try {
            fs.mkdirSync(flowsPath, { recursive: true });
        } catch (err) {
            console.error('Failed to create flows dir:', err);
            return [];
        }
    }

    try {
        const files = fs.readdirSync(flowsPath).filter(file => file.endsWith('.json'));
        const flows = files.map(file => {
            try {
                const content = fs.readFileSync(path.join(flowsPath, file), 'utf-8');
                return JSON.parse(content);
            } catch (e) {
                console.error(`Error parsing ${file}:`, e);
                return null;
            }
        }).filter(Boolean);
        return flows;
    } catch (error) {
        console.error('Error reading flows:', error);
        return [];
    }
});

// Create flow folder
ipcMain.handle('create-flow-folder', async (event, flowId) => {
    try {
        const isDev = process.env.NODE_ENV === 'development';
        const flowsPath = isDev
            ? path.join(__dirname, '../flows')
            : path.join(process.resourcesPath, 'flows');

        const flowFolder = path.join(flowsPath, flowId);
        const attachmentsFolder = path.join(flowFolder, 'attachments');

        if (!fs.existsSync(attachmentsFolder)) {
            fs.mkdirSync(attachmentsFolder, { recursive: true });
        }

        return flowFolder;
    } catch (error) {
        console.error('Error creating flow folder:', error);
        throw error;
    }
});

// Upload attachment
ipcMain.handle('upload-attachment', async (event, flowId, taskId, sourcePath) => {
    try {
        const isDev = process.env.NODE_ENV === 'development';
        const flowsPath = isDev
            ? path.join(__dirname, '../flows')
            : path.join(process.resourcesPath, 'flows');

        const taskFolder = path.join(flowsPath, flowId, 'attachments', taskId);

        if (!fs.existsSync(taskFolder)) {
            fs.mkdirSync(taskFolder, { recursive: true });
        }

        const fileName = path.basename(sourcePath);
        const destPath = path.join(taskFolder, fileName);

        // Copy file
        fs.copyFileSync(sourcePath, destPath);

        // Get file stats
        const stats = fs.statSync(destPath);

        // Return relative path from flow folder
        const relativePath = path.join('attachments', taskId, fileName);

        return {
            path: relativePath,
            size: stats.size
        };
    } catch (error) {
        console.error('Error uploading attachment:', error);
        throw error;
    }
});

// Delete attachment
ipcMain.handle('delete-attachment', async (event, flowId, relativePath) => {
    try {
        const isDev = process.env.NODE_ENV === 'development';
        const flowsPath = isDev
            ? path.join(__dirname, '../flows')
            : path.join(process.resourcesPath, 'flows');

        const filePath = path.join(flowsPath, flowId, relativePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error deleting attachment:', error);
        throw error;
    }
});

// Delete flow folder
// Delete flow (file and folder)
ipcMain.handle('delete-flow', async (event, flowId) => {
    try {
        const isDev = process.env.NODE_ENV === 'development';
        const flowsPath = isDev
            ? path.join(__dirname, '../flows')
            : path.join(process.resourcesPath, 'flows');

        const flowFolder = path.join(flowsPath, flowId);
        const flowFile = path.join(flowsPath, `${flowId}.json`);

        // Delete folder (attachments)
        if (fs.existsSync(flowFolder)) {
            fs.rmSync(flowFolder, { recursive: true, force: true });
        }

        // Delete JSON file
        if (fs.existsSync(flowFile)) {
            fs.unlinkSync(flowFile);
        }
    } catch (error) {
        console.error('Error deleting flow:', error);
        throw error;
    }
});

// Open attachment
ipcMain.handle('open-attachment', async (event, flowId, relativePath) => {
    try {
        const { shell } = await import('electron');
        const isDev = process.env.NODE_ENV === 'development';
        const flowsPath = isDev
            ? path.join(__dirname, '../flows')
            : path.join(process.resourcesPath, 'flows');

        const filePath = path.join(flowsPath, flowId, relativePath);

        if (fs.existsSync(filePath)) {
            await shell.openPath(filePath);
        } else {
            throw new Error('File not found');
        }
    } catch (error) {
        console.error('Error opening attachment:', error);
        throw error;
    }
});

// Save flow to flows folder
ipcMain.handle('save-flow', async (event, flowId, flowData) => {
    try {
        const isDev = process.env.NODE_ENV === 'development';
        const flowsPath = isDev
            ? path.join(__dirname, '../flows')
            : path.join(process.resourcesPath, 'flows');

        if (!fs.existsSync(flowsPath)) {
            fs.mkdirSync(flowsPath, { recursive: true });
        }

        const filePath = path.join(flowsPath, `${flowId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');

        return { success: true, path: filePath };
    } catch (error) {
        console.error('Error saving flow:', error);
        throw error;
    }
});

// Show save dialog for export
ipcMain.handle('show-save-dialog', async (event, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Flow',
        defaultPath: defaultName || 'flow.json',
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || !result.filePath) {
        return null;
    }

    return result.filePath;
});

// Export flow to user-chosen location
ipcMain.handle('export-flow', async (event, filePath, flowData) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(flowData, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('Error exporting flow:', error);
        throw error;
    }
});



