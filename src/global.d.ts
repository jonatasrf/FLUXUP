declare global {
    interface Window {
        electron: {
            getFlows: () => Promise<any[]>;
            createFlowFolder: (flowId: string) => Promise<string>;
            uploadAttachment: (flowId: string, taskId: string, sourcePath: string) => Promise<{ path: string; size: number }>;
            deleteAttachment: (flowId: string, relativePath: string) => Promise<void>;
            deleteFlow: (flowId: string) => Promise<void>;
            openAttachment: (flowId: string, relativePath: string) => Promise<void>;
            showOpenDialog: () => Promise<string | null>;
            saveFlow: (flowId: string, flowData: any) => Promise<{ success: boolean; path: string }>;
            showSaveDialog: (defaultName?: string) => Promise<string | null>;
            exportFlow: (filePath: string, flowData: any) => Promise<{ success: boolean }>;

        };
    }
}

export { };
