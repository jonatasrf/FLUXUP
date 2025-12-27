import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal, type TemporalState } from 'zundo';

import type { TaskNodeData } from '../types';

export interface Node {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: TaskNodeData;
    width?: number;
    height?: number;
}

export interface Edge {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
    label?: string;
    color?: string;
    style?: 'solid' | 'dashed' | 'dotted';
    markerEnd?: boolean;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface Flow {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    transform: { x: number; y: number; k: number };
    updatedAt: number;
    folderPath?: string; // Absolute path to flow's folder
}

interface FlowState {
    // Active Flow State (Working Copy)
    nodes: Node[];
    edges: Edge[];
    selectedNodeIds: string[];
    selectedEdgeId: string | null;
    transform: { x: number; y: number; k: number };

    // Multi-Flow State
    flows: Flow[];
    activeFlowId: string | null;

    // Actions
    addNode: (node: Node) => void;
    addNodes: (nodes: Node[]) => void;
    updateNodeData: (id: string, data: Partial<TaskNodeData>) => void;
    updateNodePosition: (id: string, position: { x: number; y: number }) => void;
    updateNodesPositions: (updates: { id: string; position: { x: number; y: number } }[]) => void;
    updateNodeDimensions: (id: string, dimensions: { width: number; height: number }) => void;
    deleteNode: (id: string) => void;

    addEdge: (edge: Edge) => void;
    deleteEdge: (id: string) => void;
    updateEdgeData: (id: string, data: Partial<Edge>) => void;
    updateEdge: (id: string, data: Partial<Edge>) => void;
    setSelectedNodes: (ids: string[]) => void;
    addSelectedNode: (id: string) => void;
    toggleSelectedNode: (id: string) => void;
    setSelectedEdge: (id: string | null) => void;

    setTransform: (transform: { x: number; y: number; k: number }) => void;
    loadState: (state: { nodes: Node[]; edges: Edge[] }) => void;

    // Flow Management Actions
    createFlow: () => void;
    switchFlow: (id: string) => void;
    deleteFlow: (id: string) => void;
    updateFlowName: (id: string, name: string) => void;
    syncCurrentFlow: () => void;
    setFlows: (flows: Flow[]) => void;

    // Attachment Actions
    addAttachment: (nodeId: string, attachment: { id: string; name: string; type: 'file' | 'link'; path?: string; url?: string; size?: number; uploadedAt: string }) => void;
    removeAttachment: (nodeId: string, attachmentId: string) => Promise<void>;

    // Settings
    isMagnetismEnabled: boolean;
    setMagnetismEnabled: (enabled: boolean) => void;
    magnetismStrength: number;
    setMagnetismStrength: (strength: number) => void;

    // Save System
    hasUnsavedChanges: boolean;
    lastSavedAt: number | null;
    saveReminderEnabled: boolean;
    saveReminderInterval: number; // minutes
    markAsSaved: () => void;
    markAsModified: () => void;
    setSaveReminderEnabled: (enabled: boolean) => void;
    setSaveReminderInterval: (minutes: number) => void;
    saveCurrentFlow: () => Promise<void>;
    exportCurrentFlow: () => Promise<void>;

    // Async Actions
    loadFlowsFromDisk: () => Promise<void>;

    // AI
    apiKey: string | null;
    setApiKey: (key: string) => void;

    // Theme
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    canvasColor: string | null;
    setCanvasColor: (color: string | null) => void;

    // Clipboard
    clipboardNodes: Node[];
    copyNodes: (ids: string[]) => void;
    pasteNodes: () => void;
}

// Start with empty workspace
const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

export const useStore = create<FlowState>()(
    temporal(
        persist(
            (set, get) => ({
                nodes: initialNodes,
                edges: initialEdges,
                selectedNodeIds: [],
                selectedEdgeId: null,
                transform: { x: 0, y: 0, k: 1 },
                isMagnetismEnabled: false,
                magnetismStrength: 20,

                // Save System
                hasUnsavedChanges: false,
                lastSavedAt: null,
                saveReminderEnabled: false,
                saveReminderInterval: 5,

                // AI
                apiKey: null,

                // Theme
                theme: 'dark',
                canvasColor: null,

                // Clipboard
                clipboardNodes: [],

                flows: [],
                activeFlowId: null,

                addNode: (node) => {
                    set({ nodes: [...get().nodes, node] });
                    get().syncCurrentFlow();
                    get().markAsModified();
                },

                addNodes: (newNodes) => {
                    set({ nodes: [...get().nodes, ...newNodes] });
                    get().syncCurrentFlow();
                },

                updateNodeData: (id, data) => {
                    set({
                        nodes: get().nodes.map((node) => {
                            if (node.id === id) {
                                return { ...node, data: { ...node.data, ...data } };
                            }
                            return node;
                        }),
                    });
                    get().syncCurrentFlow();
                    get().markAsModified();
                },

                updateNodePosition: (id, position) => {
                    set({
                        nodes: get().nodes.map((node) => {
                            if (node.id === id) {
                                return { ...node, position };
                            }
                            return node;
                        }),
                    });
                    get().syncCurrentFlow();
                },

                updateNodesPositions: (updates) => {
                    const updateMap = new Map(updates.map(u => [u.id, u.position]));
                    set({
                        nodes: get().nodes.map((node) => {
                            const newPos = updateMap.get(node.id);
                            return newPos ? { ...node, position: newPos } : node;
                        }),
                    });
                    get().syncCurrentFlow();
                },

                updateNodeDimensions: (id, { width, height }) => {
                    set({
                        nodes: get().nodes.map((node) => {
                            if (node.id === id) {
                                return { ...node, width, height };
                            }
                            return node;
                        }),
                    });
                    get().syncCurrentFlow();
                },

                deleteNode: (id) => {
                    set({
                        nodes: get().nodes.filter((node) => node.id !== id),
                        edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
                        selectedNodeIds: get().selectedNodeIds.filter(nodeId => nodeId !== id),
                    });
                    get().syncCurrentFlow();
                    get().markAsModified();
                },

                addEdge: (edge) => {
                    set({ edges: [...get().edges, edge] });
                    get().syncCurrentFlow();
                    get().markAsModified();
                },

                deleteEdge: (id) => {
                    set({
                        edges: get().edges.filter((edge) => edge.id !== id),
                        selectedEdgeId: get().selectedEdgeId === id ? null : get().selectedEdgeId,
                    });
                    get().syncCurrentFlow();
                },

                updateEdgeData: (id, data) => {
                    set({
                        edges: get().edges.map((edge) => {
                            if (edge.id === id) {
                                return { ...edge, ...data };
                            }
                            return edge;
                        }),
                    });
                    get().syncCurrentFlow();
                },

                updateEdge: (id, data) => {
                    set({
                        edges: get().edges.map((edge) => {
                            if (edge.id === id) {
                                return { ...edge, ...data };
                            }
                            return edge;
                        }),
                    });
                    get().syncCurrentFlow();
                },

                setSelectedNodes: (ids) => {
                    set({ selectedNodeIds: ids, selectedEdgeId: null });
                },

                addSelectedNode: (id) => {
                    set((state) => ({
                        selectedNodeIds: [...state.selectedNodeIds, id],
                        selectedEdgeId: null
                    }));
                },

                toggleSelectedNode: (id) => {
                    set((state) => {
                        const isSelected = state.selectedNodeIds.includes(id);
                        return {
                            selectedNodeIds: isSelected
                                ? state.selectedNodeIds.filter(nodeId => nodeId !== id)
                                : [...state.selectedNodeIds, id],
                            selectedEdgeId: null
                        };
                    });
                },

                setSelectedEdge: (id) => {
                    set({ selectedEdgeId: id, selectedNodeIds: [] });
                },

                setTransform: (transform) => {
                    set({ transform });
                    const { activeFlowId, flows } = get();
                    if (activeFlowId) {
                        set({
                            flows: flows.map(f => f.id === activeFlowId ? { ...f, transform } : f)
                        });
                    }
                },

                loadState: (state) => {
                    set({
                        nodes: state.nodes || [],
                        edges: state.edges || [],
                        selectedNodeIds: [],
                        selectedEdgeId: null,
                        transform: { x: 0, y: 0, k: 1 },
                    });
                    get().syncCurrentFlow();
                },

                // Flow Management
                syncCurrentFlow: () => {
                    const { activeFlowId, nodes, edges, transform, flows } = get();
                    if (!activeFlowId) return;

                    set({
                        flows: flows.map(f =>
                            f.id === activeFlowId
                                ? { ...f, nodes, edges, transform, updatedAt: Date.now() }
                                : f
                        )
                    });
                },
                setFlows: (flows) => set({ flows }),

                createFlow: async () => {
                    const newFlow: Flow = {
                        id: crypto.randomUUID(),
                        name: 'New Flow',
                        nodes: [],
                        edges: [],
                        transform: { x: 0, y: 0, k: 1 },
                        updatedAt: Date.now(),
                    };

                    // Create folder for new flow
                    if (typeof window.electron?.createFlowFolder === 'function') {
                        try {
                            const folderPath = await window.electron.createFlowFolder(newFlow.id);
                            newFlow.folderPath = folderPath;
                        } catch (error) {
                            console.error('Failed to create flow folder:', error);
                        }
                    }

                    // Save current before switching
                    get().syncCurrentFlow();

                    set((state) => ({
                        flows: [...state.flows, newFlow],
                        activeFlowId: newFlow.id,
                        nodes: newFlow.nodes,
                        edges: newFlow.edges,
                        transform: newFlow.transform,
                        selectedNodeIds: [],
                        selectedEdgeId: null,
                    }));

                    // Persist new flow to disk immediately
                    if (typeof window.electron?.saveFlow === 'function') {
                        try {
                            get().saveCurrentFlow();
                        } catch (e) {
                            console.error("Failed to initial save new flow", e);
                        }
                    }
                },

                switchFlow: (id) => {
                    const { flows } = get();
                    const targetFlow = flows.find(f => f.id === id);
                    if (!targetFlow) return;

                    // Save current
                    get().syncCurrentFlow();

                    set({
                        activeFlowId: id,
                        nodes: targetFlow.nodes,
                        edges: targetFlow.edges,
                        transform: targetFlow.transform || { x: 0, y: 0, k: 1 },
                        selectedNodeIds: [],
                        selectedEdgeId: null,
                    });
                },

                deleteFlow: async (id) => {
                    if (!id) {
                        console.error('deleteFlow: id is required');
                        return;
                    }

                    const { flows, activeFlowId } = get();
                    // if (flows.length <= 1) return; // Allow deleting last flow

                    // Delete flow (file and folder)
                    if (typeof window.electron?.deleteFlow === 'function') {
                        try {
                            await window.electron.deleteFlow(id);
                        } catch (error) {
                            console.error('Failed to delete flow:', error);
                        }
                    }

                    const newFlows = flows.filter(f => f.id !== id);

                    if (newFlows.length === 0) {
                        // All flows deleted, reset to empty state
                        set({
                            flows: [],
                            activeFlowId: null,
                            nodes: [],
                            edges: [],
                            selectedNodeIds: [],
                            selectedEdgeId: null,
                        });
                        return;
                    }

                    // If deleting active flow, switch to first
                    if (id === activeFlowId) {
                        const firstFlow = newFlows[0];
                        set({
                            flows: newFlows,
                            activeFlowId: firstFlow.id,
                            nodes: firstFlow.nodes,
                            edges: firstFlow.edges,
                            transform: firstFlow.transform,
                            selectedNodeIds: [],
                            selectedEdgeId: null,
                        });
                    } else {
                        set({ flows: newFlows });
                    }
                },

                updateFlowName: (id, name) => {
                    set((state) => ({
                        flows: state.flows.map(f => f.id === id ? { ...f, name } : f)
                    }));
                    get().markAsModified();
                },
                setMagnetismEnabled: (enabled) => set({ isMagnetismEnabled: enabled }),
                setMagnetismStrength: (strength) => set({ magnetismStrength: strength }),
                setApiKey: (key) => set({ apiKey: key }),
                setTheme: (theme) => set({ theme }),
                setCanvasColor: (color) => set({ canvasColor: color }),

                loadFlowsFromDisk: async () => {
                    try {
                        const electron = (window as any).electron;
                        if (electron && electron.getFlows) {
                            const flows = await electron.getFlows();
                            if (flows && Array.isArray(flows)) {
                                const validFlows = flows.map((f: any) => ({
                                    ...f,
                                    transform: f.transform || { x: 0, y: 0, k: 1 },
                                    updatedAt: f.updatedAt || Date.now(),
                                    nodes: f.nodes || [],
                                    edges: f.edges || []
                                }))
                                    .filter((f: any) => f.id && f.name);

                                const { activeFlowId, flows: currentFlows } = get();

                                if (activeFlowId) {
                                    const activeFlowOnDisk = validFlows.find((f: any) => f.id === activeFlowId);
                                    if (!activeFlowOnDisk) {
                                        const activeFlowInMemory = currentFlows.find(f => f.id === activeFlowId);
                                        if (activeFlowInMemory) {
                                            validFlows.push(activeFlowInMemory);
                                        } else {
                                            if (validFlows.length > 0) {
                                                get().switchFlow(validFlows[0].id);
                                            }
                                        }
                                    }
                                }

                                set({ flows: validFlows });
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load flows from disk:', error);
                    }
                },

                // Attachment Actions
                addAttachment: (nodeId, attachment) => {
                    set({
                        nodes: get().nodes.map((node) => {
                            if (node.id === nodeId) {
                                const existingAttachments = node.data.attachments || [];
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        attachments: [...existingAttachments, attachment]
                                    }
                                };
                            }
                            return node;
                        })
                    });
                    get().syncCurrentFlow();
                },

                removeAttachment: async (nodeId, attachmentId) => {
                    const node = get().nodes.find(n => n.id === nodeId);
                    if (!node) return;

                    const attachment = node.data.attachments?.find(a => a.id === attachmentId);
                    if (!attachment) return;

                    // If it's a file, delete from disk
                    if (attachment.type === 'file' && attachment.path) {
                        const { activeFlowId } = get();
                        if (activeFlowId && typeof window.electron?.deleteAttachment === 'function') {
                            try {
                                await window.electron.deleteAttachment(activeFlowId, attachment.path);
                            } catch (error) {
                                console.error('Failed to delete attachment file:', error);
                            }
                        }
                    }

                    // Remove from state
                    set({
                        nodes: get().nodes.map((n) => {
                            if (n.id === nodeId) {
                                return {
                                    ...n,
                                    data: {
                                        ...n.data,
                                        attachments: (n.data.attachments || []).filter(a => a.id !== attachmentId)
                                    }
                                };
                            }
                            return n;
                        })
                    });
                    get().syncCurrentFlow();
                },

                // Save System Actions
                markAsSaved: () => set({ hasUnsavedChanges: false, lastSavedAt: Date.now() }),
                markAsModified: () => set({ hasUnsavedChanges: true }),
                setSaveReminderEnabled: (enabled) => set({ saveReminderEnabled: enabled }),
                setSaveReminderInterval: (minutes) => set({ saveReminderInterval: minutes }),

                saveCurrentFlow: async () => {
                    const { activeFlowId, nodes, edges, transform, flows } = get();
                    if (!activeFlowId || typeof window.electron?.saveFlow !== 'function') {
                        console.error('Cannot save: No active flow or save not available');
                        return;
                    }

                    try {
                        const currentFlow = flows.find(f => f.id === activeFlowId);
                        const flowData = {
                            id: activeFlowId,
                            name: currentFlow?.name || 'New Flow',
                            nodes,
                            edges,
                            transform,
                            updatedAt: Date.now()
                        };
                        await window.electron.saveFlow(activeFlowId, flowData);
                        get().markAsSaved();
                    } catch (error) {
                        console.error('Failed to save flow:', error);
                        throw error;
                    }
                },

                exportCurrentFlow: async () => {
                    const { activeFlowId, nodes, edges, flows } = get();
                    if (!activeFlowId || typeof window.electron?.showSaveDialog !== 'function' || typeof window.electron?.exportFlow !== 'function') {
                        console.error('Export not available');
                        return;
                    }

                    try {
                        const currentFlow = flows.find(f => f.id === activeFlowId);
                        const defaultName = `${currentFlow?.name || 'flow'}.json`;

                        const filePath = await window.electron.showSaveDialog(defaultName);
                        if (!filePath) return; // User canceled

                        const flowData = { nodes, edges };
                        await window.electron.exportFlow(filePath, flowData);
                    } catch (error) {
                        console.error('Failed to export flow:', error);
                        throw error;
                    }
                },

                // Clipboard Actions
                copyNodes: (ids) => {
                    const nodesToCopy = get().nodes.filter(n => ids.includes(n.id));
                    // Deep copy to prevent reference issues
                    set({ clipboardNodes: JSON.parse(JSON.stringify(nodesToCopy)) });
                },

                pasteNodes: () => {
                    const { clipboardNodes, nodes } = get();
                    if (clipboardNodes.length === 0) return;

                    const newNodes: Node[] = clipboardNodes.map(node => ({
                        ...node,
                        id: crypto.randomUUID(),
                        position: {
                            x: node.position.x + 50,
                            y: node.position.y + 50
                        },
                        // Reset selection-specific or instance-specific data if needed
                        data: {
                            ...node.data,
                            // Ensure unique IDs for things like checklists if they exist
                            checklist: node.data.checklist?.map(item => ({ ...item, id: crypto.randomUUID() })) || []
                        }
                    }));

                    set({
                        nodes: [...nodes, ...newNodes],
                        selectedNodeIds: newNodes.map(n => n.id), // Select the pasted nodes
                        selectedEdgeId: null
                    });
                    get().syncCurrentFlow();
                    get().markAsModified();
                },
            }),
            {
                name: 'flow-storage-v3', // Changed key to reset localStorage and remove old example flows
            }
        ),
        {
            // Temporal (undo/redo) options
            limit: 50, // Keep last 50 history states
            equality: (a, b) => a === b,
            // Exclude these properties from undo/redo tracking
            partialize: (state) => {
                const {
                    selectedNodeIds,
                    selectedEdgeId,
                    transform,
                    clipboardNodes,
                    hasUnsavedChanges,
                    lastSavedAt,
                    ...rest
                } = state;

                return rest as unknown as FlowState;
            },
        }
    )
) as unknown as UseBoundStore<StoreApi<FlowState>> & { temporal: StoreApi<TemporalState<FlowState>> };

// Expose store globally for Electron close handler
if (typeof window !== 'undefined') {
    (window as any).__store = useStore;

    // Auto-load last flow if exists but none selected
    // const state = useStore.getState();
    // if (state.flows.length > 0 && !state.activeFlowId) {
    //     const lastFlow = state.flows[state.flows.length - 1];
    //     state.switchFlow(lastFlow.id);
    // }
}
