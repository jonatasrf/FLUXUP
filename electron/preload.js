const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getFlows: () => ipcRenderer.invoke('get-flows'),
    createFlowFolder: (flowId) => ipcRenderer.invoke('create-flow-folder', flowId),
    uploadAttachment: (flowId, taskId, sourcePath) => ipcRenderer.invoke('upload-attachment', flowId, taskId, sourcePath),
    deleteAttachment: (flowId, relativePath) => ipcRenderer.invoke('delete-attachment', flowId, relativePath),
    deleteFlow: (flowId) => ipcRenderer.invoke('delete-flow', flowId),
    openAttachment: (flowId, relativePath) => ipcRenderer.invoke('open-attachment', flowId, relativePath),
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    saveFlow: (flowId, flowData) => ipcRenderer.invoke('save-flow', flowId, flowData),
    showSaveDialog: (defaultName) => ipcRenderer.invoke('show-save-dialog', defaultName),
    exportFlow: (filePath, flowData) => ipcRenderer.invoke('export-flow', filePath, flowData),


    // App Close Handling
    onCloseRequested: (callback) => ipcRenderer.on('close-requested', callback),
    confirmClose: (shouldSave) => ipcRenderer.invoke('confirm-close', shouldSave),
});
