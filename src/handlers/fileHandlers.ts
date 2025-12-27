import { toast } from 'sonner';

type SaveFunction = () => Promise<void>;
type ExportFunction = () => Promise<void>;
type LoadStateFunction = (data: any) => void;
type UpdateFlowNameFunction = (id: string, name: string) => void;
type Flow = { id: string; name: string };

/**
 * Handle saving the current flow
 * Shows rename modal if flow has default name, otherwise saves directly
 */
export async function handleSave(
    activeFlowId: string | null,
    flows: Flow[],
    saveCurrentFlow: SaveFunction,
    setShowRenameModal: (show: boolean) => void
): Promise<void> {
    if (!activeFlowId) {
        toast.error("No active flow to save. Please create a flow first.");
        return;
    }

    // Check if it's the first save (default name)
    const currentFlow = flows.find(f => f.id === activeFlowId);

    if (currentFlow && currentFlow.name === 'New Flow') {
        setShowRenameModal(true);
        return; // Stop here and wait for modal
    }

    await performSave(saveCurrentFlow);
}

/**
 * Perform the actual save operation
 */
export async function performSave(saveCurrentFlow: SaveFunction): Promise<void> {
    try {
        await saveCurrentFlow();
        toast.success("Flow saved successfully!");
    } catch (error: any) {
        console.error(error);
        toast.error("Failed to save flow.");
    }
}

/**
 * Handle renaming and saving the flow
 */
export function handleRenameAndSave(
    activeFlowId: string | null,
    newName: string,
    updateFlowName: UpdateFlowNameFunction,
    setShowRenameModal: (show: boolean) => void,
    saveCurrentFlow: SaveFunction
): void {
    if (activeFlowId) {
        updateFlowName(activeFlowId, newName);
        setShowRenameModal(false);
        performSave(saveCurrentFlow);
    }
}

/**
 * Handle exporting the current flow
 */
export async function handleExport(
    activeFlowId: string | null,
    exportCurrentFlow: ExportFunction
): Promise<void> {
    if (!activeFlowId) {
        toast.error("No active flow to export.");
        return;
    }
    try {
        await exportCurrentFlow();
        toast.success("Flow exported successfully!");
    } catch (error: any) {
        if (!error.message?.includes('cancel')) {
            console.error(error);
            toast.error("Failed to export flow.");
        }
    }
}

/**
 * Handle loading a flow from a JSON file
 */
export async function handleLoad(loadState: LoadStateFunction): Promise<void> {
    try {
        if ('showOpenFilePicker' in window) {
            const [handle] = await (window as any).showOpenFilePicker({
                types: [{ description: 'JSON Flow File', accept: { 'application/json': ['.json'] } }],
                multiple: false,
            });
            const file = await handle.getFile();
            const content = await file.text();
            const flowData = JSON.parse(content);
            loadState(flowData);
            toast.success(`Flow loaded from ${file.name}`);
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const content = await file.text();
                    try {
                        const flowData = JSON.parse(content);
                        loadState(flowData);
                        toast.success(`Flow loaded from ${file.name}`);
                    } catch (err) {
                        toast.error("Invalid JSON file.");
                    }
                }
            };
            input.click();
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error(error);
            toast.error("Failed to load flow.");
        }
    }
}
