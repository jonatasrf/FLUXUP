import { useState, useCallback, useRef, useEffect, useMemo } from 'react';


import { FileText, CheckSquare, StickyNote, Target, BarChart3, Users, Calendar, GitMerge, Layout, Plus, X, Activity, Save, Search, ChevronDown, ChevronUp, Sparkles, Upload, Share2, ChevronLeft, ChevronRight, ClipboardList, ShieldAlert, Fish, RotateCw, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import * as d3 from 'd3';
import { TaskSidebar } from './TaskSidebar';
import { useStore, type Node } from '../store/store';
import { generateProjectReport } from '../utils/pdfGenerator';
import { Timeline } from './Timeline';
import { toast } from 'sonner';
import { EmptyState } from './EmptyState';
import { calculateReachability, inferOverdueStatus } from '../utils/flowUtils';
import { AIAssistantModal } from './AIAssistantModal';
import { RenameFlowModal } from './RenameFlowModal';
import { KanbanBoard } from './KanbanBoard';
import { TableView } from './TableView';
import { getHandlePosition, getOrthogonalPath, getNodeDimensions } from '../utils/flowGeometry';
import { calculateAutoLayout } from '../utils/autoLayout';
import { DraggableNode } from './DraggableNode';



const FlowEditorContent = () => {
    // Main Flow Editor Component
    const {
        nodes,
        edges,
        transform,
        setTransform,
        setSelectedNodes,
        setSelectedEdge,
        loadState,
        deleteEdge,
        deleteNode,
        setFlows,
        addEdge,
        addNode,

        selectedNodeIds,
        selectedEdgeId,
        updateNodePosition,
        updateNodesPositions,
        isMagnetismEnabled,
        saveReminderEnabled,
        saveReminderInterval,
        lastSavedAt,
        hasUnsavedChanges,
        activeFlowId,
        flows,
        saveCurrentFlow,
        updateFlowName,
        exportCurrentFlow,
        copyNodes,
        pasteNodes,
        updateEdge,
        canvasColor

    } = useStore();

    // Keyboard Delete Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Delete selected nodes
                if (selectedNodeIds.length > 0) {
                    selectedNodeIds.forEach(id => deleteNode(id));
                    setSelectedNodes([]); // Clear selection
                }

                // Delete selected edge
                if (selectedEdgeId) {
                    deleteEdge(selectedEdgeId);
                    setSelectedEdge(null); // Clear selection
                }
            }

            // Copy (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (selectedNodeIds.length > 0) {
                    copyNodes(selectedNodeIds);
                    toast.success('Copied to clipboard');
                }
            }

            // Paste (Ctrl+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                pasteNodes();
            }

            // Undo (Ctrl+Z)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                useStore.temporal.getState().undo();
            }

            // Redo (Ctrl+Y)
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                useStore.temporal.getState().redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeIds, selectedEdgeId, deleteNode, deleteEdge, setSelectedNodes, setSelectedEdge, copyNodes, pasteNodes]);

    useEffect(() => {
        if (window.electron) {
            window.electron.getFlows().then((flows) => {
                if (flows && flows.length > 0) {
                    setFlows(flows);
                    toast.success(`Loaded ${flows.length} flows from local folder`);
                }
            });
        }
    }, [setFlows]);

    // Search & View State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState<'all' | 'assignee'>('all');
    const [currentResultIndex, setCurrentResultIndex] = useState(0);
    // Path Dimming Logic (Reachability from Roots)
    const dimmedElements = useMemo(() => {
        return calculateReachability(nodes, edges);
    }, [nodes, edges]);

    // Inferred Overdue Status (nodes without dates that have overdue predecessors)
    const inferredOverdueNodes = useMemo(() => {
        return inferOverdueStatus(nodes, edges);
    }, [nodes, edges]);

    // Node Type Menu State
    const [nodeMenu, setNodeMenu] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        sourceNodeId?: string;
        edgeId?: string; // For splitting edges
    }>({ isOpen: false, x: 0, y: 0 });

    const [conflictFocus, setConflictFocus] = useState<Set<string> | null>(null);
    const [showAIAssistant, setShowAIAssistant] = useState(false);
    const [aiAssistantTab, setAIAssistantTab] = useState<'generate' | 'edit' | 'analyze'>('generate');
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [view, setView] = useState<'flow' | 'kanban' | 'table'>('flow');
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [timelineHeight, setTimelineHeight] = useState(300);
    const [isResizingTimeline, setIsResizingTimeline] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingTimeline) return;
            const newHeight = window.innerHeight - e.clientY;
            setTimelineHeight(Math.max(100, Math.min(window.innerHeight - 100, newHeight)));
        };

        const handleMouseUp = () => {
            setIsResizingTimeline(false);
            document.body.style.cursor = 'default';
        };

        if (isResizingTimeline) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        };
    }, [isResizingTimeline]);

    const overdueTasks = useMemo(() => {
        const now = new Date();
        return nodes.filter(n => {
            if (n.type === 'note' || n.type !== 'task' || n.data.status === 'completed' || n.data.status === 'done') return false;
            if (!n.data.dueDate) return false;

            const dueDate = new Date(n.data.dueDate);
            return dueDate < now;
        });
    }, [nodes]);

    // Zundo temporal store access
    // Zundo temporal store access removed
    // const { undo, redo } = useStore.temporal.getState();

    const svgRef = useRef<SVGSVGElement>(null);
    const gRef = useRef<SVGGElement>(null);
    const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

    // Connection Drag State (New connection)
    const [connectionDrag, setConnectionDrag] = useState<{
        active: boolean;
        sourceId: string | null;
        sourceHandleId?: string;
        startPos: { x: number; y: number } | null;
        currentPos: { x: number; y: number } | null;
    }>({ active: false, sourceId: null, startPos: null, currentPos: null });

    // Edge Reconnection/Rerouting State
    const [edgeDrag, setEdgeDrag] = useState<{
        active: boolean;
        edgeId: string | null;
        type: 'source' | 'target' | 'segment' | null;
        segmentIndex?: number;
        startPos: { x: number; y: number } | null;
        currentPos: { x: number; y: number } | null;
    }>({ active: false, edgeId: null, type: null, startPos: null, currentPos: null });


    // Setup Zoom and Pan
    useEffect(() => {
        if (!svgRef.current || !gRef.current) return;

        const svg = d3.select(svgRef.current);
        const g = d3.select(gRef.current);

        zoomBehavior.current = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .filter((event) => {
                // Prevent zoom/pan start if clicking on connection handles or interactive elements
                const target = event.target as HTMLElement;
                const isConnectionHandle = target.closest('.connection-handle');
                const isEdgeInteraction = target.closest('.edge-interaction');
                const isButton = target.closest('button');
                const isInput = target.closest('input');

                const isTextarea = target.closest('textarea');
                const isResizeHandle = target.closest('.resize-handle');

                // Standard D3 filter: !event.ctrlKey && !event.button (left click only)
                // Also filter out Shift key for selection box
                return !event.ctrlKey && !event.button && !event.shiftKey && !isConnectionHandle && !isButton && !isInput && !isTextarea && !isResizeHandle && !isEdgeInteraction;
            })

            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                setTransform({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
            });

        svg.call(zoomBehavior.current);

        // Restore transform if exists
        if (transform) {
            svg.call(zoomBehavior.current.transform, d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.k));
        }
    }, []);

    // Connection Drag Logic
    const handleConnectionStart = useCallback((nodeId: string, _handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => {
        // Calculate start position in SVG coordinates
        const svg = svgRef.current;
        if (!svg) return;

        const point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;
        const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

        // Adjust for zoom/pan transform to get world coordinates
        const worldX = (svgPoint.x - transform.x) / transform.k;
        const worldY = (svgPoint.y - transform.y) / transform.k;

        setConnectionDrag({
            active: true,
            sourceId: nodeId,
            sourceHandleId: handleId,
            startPos: { x: worldX, y: worldY },
            currentPos: { x: worldX, y: worldY }
        });
    }, [transform]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!connectionDrag.active && !edgeDrag.active) return;

            const svg = svgRef.current;
            if (!svg) return;

            const point = svg.createSVGPoint();
            point.x = e.clientX;
            point.y = e.clientY;
            const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

            const worldX = (svgPoint.x - transform.x) / transform.k;
            const worldY = (svgPoint.y - transform.y) / transform.k;

            if (connectionDrag.active) {
                setConnectionDrag(prev => ({ ...prev, currentPos: { x: worldX, y: worldY } }));
            } else if (edgeDrag.active) {
                setEdgeDrag(prev => ({ ...prev, currentPos: { x: worldX, y: worldY } }));
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (!connectionDrag.active && !edgeDrag.active) return;

            const target = e.target as HTMLElement;
            const isHandle = target.classList.contains('connection-handle');

            if (connectionDrag.active) {
                if (isHandle) {
                    const targetId = target.dataset.nodeId;
                    const targetHandleId = target.dataset.handleId;

                    if (targetId) {
                        const sourceNode = nodes.find(n => n.id === connectionDrag.sourceId);
                        const isNote = sourceNode?.type === 'note';

                        const newEdge = {
                            id: `e${connectionDrag.sourceId}-${targetId}-${Date.now()}`,
                            source: connectionDrag.sourceId!,
                            target: targetId,
                            sourceHandle: connectionDrag.sourceHandleId,
                            targetHandle: targetHandleId,
                            animated: !isNote,
                            style: isNote ? 'dashed' as const : 'solid' as const,
                            markerEnd: !isNote,
                            color: isNote ? '#facc15' : undefined
                        };
                        addEdge(newEdge);
                        toast.success("Connected!");
                    }
                }
                setConnectionDrag({ active: false, sourceId: null, startPos: null, currentPos: null });

            } else if (edgeDrag.active) {
                if (edgeDrag.type === 'source' || edgeDrag.type === 'target') {

                    if (isHandle) {
                        const nodeId = target.dataset.nodeId;
                        const handleId = target.dataset.handleId;
                        if (nodeId && handleId && edgeDrag.edgeId) {
                            updateEdge(edgeDrag.edgeId, {
                                [edgeDrag.type]: nodeId,
                                [`${edgeDrag.type}Handle`]: handleId,
                                pathPoints: [] // Reset manual path when reconnected
                            });
                            toast.success("Edge reconnected!");
                        }
                    }
                }
                setEdgeDrag({ active: false, edgeId: null, type: null, startPos: null, currentPos: null });
            }
        };


        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [connectionDrag.active, connectionDrag.sourceId, connectionDrag.sourceHandleId, edgeDrag.active, edgeDrag.edgeId, edgeDrag.type, transform, addEdge, updateEdge, nodes]);


    const zoomToNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !svgRef.current || !zoomBehavior.current) return;

        const scale = 1.2;
        const x = -node.position.x * scale + window.innerWidth / 2 - (node.width || 256) * scale / 2;
        const y = -node.position.y * scale + window.innerHeight / 2 - (node.height || 100) * scale / 2;

        const t = d3.zoomIdentity.translate(x, y).scale(scale);
        d3.select(svgRef.current).transition().duration(750).call(zoomBehavior.current.transform, t);
    }, [nodes]);

    const centerFlow = useCallback(() => {
        if (!svgRef.current || !zoomBehavior.current || nodes.length === 0) return;

        // Calculate bounding box of all nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            if (!node.position) return;
            const w = node.width || 256;
            const h = node.height || 100;

            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + w);
            maxY = Math.max(maxY, node.position.y + h);
        });

        // Calculate center point and dimensions
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const centerX = minX + contentWidth / 2;
        const centerY = minY + contentHeight / 2;

        // Calculate scale to fit content with padding
        const padding = 100; // pixels
        const scaleX = (window.innerWidth - padding * 2) / contentWidth;
        const scaleY = (window.innerHeight - padding * 2) / contentHeight;
        const scale = Math.min(scaleX, scaleY, 1.5); // Max zoom 1.5x

        // Calculate transform to center the content
        const x = -centerX * scale + window.innerWidth / 2;
        const y = -centerY * scale + window.innerHeight / 2;

        const t = d3.zoomIdentity.translate(x, y).scale(scale);
        d3.select(svgRef.current).transition().duration(750).call(zoomBehavior.current.transform, t);
    }, [nodes]);

    // Listen for centerFlow event from EmptyState
    useEffect(() => {
        const handleCenterFlow = () => {
            centerFlow();
        };

        window.addEventListener('centerFlow', handleCenterFlow);
        return () => window.removeEventListener('centerFlow', handleCenterFlow);
    }, [centerFlow]);

    // Selection Box State
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

    // Selection Box Logic
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleMouseDown = (e: MouseEvent) => {
            // Only start selection if Shift is pressed and left click
            if (e.shiftKey && e.button === 0) {
                e.preventDefault();
                e.stopPropagation();

                const point = svg.createSVGPoint();
                point.x = e.clientX;
                point.y = e.clientY;
                const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

                // Adjust for zoom/pan transform to get world coordinates
                const worldX = (svgPoint.x - transform.x) / transform.k;
                const worldY = (svgPoint.y - transform.y) / transform.k;

                setSelectionBox({ startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!selectionBox) return;

            const point = svg.createSVGPoint();
            point.x = e.clientX;
            point.y = e.clientY;
            const svgPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());

            const worldX = (svgPoint.x - transform.x) / transform.k;
            const worldY = (svgPoint.y - transform.y) / transform.k;

            setSelectionBox(prev => prev ? { ...prev, currentX: worldX, currentY: worldY } : null);
        };

        const handleMouseUp = () => {
            if (!selectionBox) return;

            // Calculate intersection
            const x = Math.min(selectionBox.startX, selectionBox.currentX);
            const y = Math.min(selectionBox.startY, selectionBox.currentY);
            const width = Math.abs(selectionBox.currentX - selectionBox.startX);
            const height = Math.abs(selectionBox.currentY - selectionBox.startY);

            const selectedIds: string[] = [];

            nodes.forEach(node => {
                const nodeX = node.position.x;
                const nodeY = node.position.y;
                const nodeWidth = node.width || 256;
                const nodeHeight = node.height || 100;

                // Check intersection
                if (
                    nodeX < x + width &&
                    nodeX + nodeWidth > x &&
                    nodeY < y + height &&
                    nodeY + nodeHeight > y
                ) {
                    selectedIds.push(node.id);
                }
            });

            if (selectedIds.length > 0) {
                setSelectedNodes(selectedIds);
            }

            setSelectionBox(null);
        };

        svg.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            svg.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [selectionBox, transform, nodes, setSelectedNodes]);

    // Magnetism Logic
    const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
    const magnetismStrength = useStore((state) => state.magnetismStrength) || 5;

    useEffect(() => {
        if (!isMagnetismEnabled) {
            if (simulationRef.current) {
                simulationRef.current.stop();
                simulationRef.current = null;
            }
            return;
        }

        // Map 1-10 scale to D3 strength (approx -100 to -1000)
        // 1 -> -100 (Weak)
        // 5 -> -500 (Medium)
        // 10 -> -1000 (Strong)
        const forceStrength = -(magnetismStrength * 100);

        // Initial nodes (All nodes are magnetic now)
        // Initial nodes (All nodes are magnetic now)
        const simNodes = nodes
            .filter(n => n && n.position)
            .map(n => ({
                id: n.id,
                x: n.position.x,
                y: n.position.y,
                width: n.width || 256,
                height: n.height || 100,
            }));

        const simulation = d3.forceSimulation(simNodes as any)
            .alphaDecay(0.1)
            .force("charge", d3.forceManyBody().strength(forceStrength).distanceMax(500)) // Dynamic repulsion
            .force("collide", d3.forceCollide().radius((d: any) => Math.max(d.width, d.height) / 1.2).strength(1))
            .on("tick", () => {
                simulation.nodes().forEach((simNode: any) => {
                    const currentSelectedIds = useStore.getState().selectedNodeIds;

                    // Don't update the node being dragged by user
                    if (currentSelectedIds.includes(simNode.id)) return;

                    const originalNode = useStore.getState().nodes.find(n => n.id === simNode.id);
                    if (originalNode) {
                        if (Math.abs(originalNode.position.x - simNode.x) > 1 || Math.abs(originalNode.position.y - simNode.y) > 1) {
                            updateNodePosition(simNode.id, { x: simNode.x, y: simNode.y });
                        }
                    }
                });
            });

        simulationRef.current = simulation;

        return () => {
            simulation.stop();
        };
    }, [isMagnetismEnabled, magnetismStrength]); // Re-init on toggle or strength change

    // 2. Sync Store -> Simulation (Handle Drag & Add/Remove)
    useEffect(() => {
        if (!isMagnetismEnabled || !simulationRef.current) return;

        const simulation = simulationRef.current;
        const simNodes = simulation.nodes() as any[];

        // Filter out 'note' nodes unless they are magnetic (Now ALL are magnetic by default, but keeping check just in case)
        // User requested: "As notas tambem devem ser magneticas" -> So we remove the filter or ensure isMagnetic is true.
        // We'll just include everything.
        const magneticNodes = nodes;

        // Handle Node Count Change (Add/Remove)
        if (magneticNodes.length !== simNodes.length) {
            const newSimNodes = magneticNodes
                .filter(n => n && n.position)
                .map(n => ({
                    id: n.id,
                    x: n.position.x,
                    y: n.position.y,
                    width: n.width || 256,
                    height: n.height || 100,
                }));
            simulation.nodes(newSimNodes);
            simulation.alpha(1).restart();
            return;
        }

        // Handle Position Change (User Drag)
        let woke = false;
        nodes.forEach(node => {
            if (!node.position) return;
            const simNode = simNodes.find(n => n.id === node.id);
            if (simNode) {
                const dx = node.position.x - simNode.x;
                const dy = node.position.y - simNode.y;

                // If node is selected (being dragged), fix its position
                if (selectedNodeIds.includes(node.id)) {
                    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                        simNode.x = node.position.x;
                        simNode.y = node.position.y;
                        simNode.fx = node.position.x; // Fix position temporarily
                        simNode.fy = node.position.y;
                        woke = true;
                    }
                } else {
                    // Node is not selected
                    // Update simulation position if there's a significant change (e.g., from auto-layout)
                    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                        simNode.x = node.position.x;
                        simNode.y = node.position.y;
                        woke = true;
                    }
                    // Release fixed positions so magnetism can work
                    if (simNode.fx !== null || simNode.fy !== null) {
                        simNode.fx = null;
                        simNode.fy = null;
                        woke = true;
                    }
                }
            }
        });

        if (woke) {
            simulation.alphaTarget(0.3).restart();
        } else {
            simulation.alphaTarget(0);
        }

    }, [nodes, isMagnetismEnabled, selectedNodeIds]);

    // Critical Path Logic
    const [showCriticalPath, setShowCriticalPath] = useState(false);

    const criticalPathData = useMemo(() => {
        if (!showCriticalPath) return { nodes: new Set<string>(), edges: new Set<string>() };

        // Get dimmed elements (deactivated paths)
        // For now, we assume all nodes are active for critical path unless explicitly disabled (which we don't have yet)
        // But we can reuse the logic if we had it.
        // Let's just use all nodes/edges for now.
        const activeNodes = nodes;
        const activeEdges = edges;

        // 1. Build Graph
        const adj = new Map<string, string[]>();
        const nodeMap = new Map<string, Node>();
        activeNodes.forEach(n => {
            adj.set(n.id, []);
            nodeMap.set(n.id, n);
        });
        activeEdges.forEach(e => {
            if (adj.has(e.source)) adj.get(e.source)?.push(e.target);
        });

        // 2. Calculate Longest Path
        const getDuration = (n: Node) => {
            if (n.data.startDate && n.data.dueDate) {
                const start = new Date(n.data.startDate).getTime();
                const end = new Date(n.data.dueDate).getTime();
                return Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
            }
            return 1; // Default weight
        };

        const memo = new Map<string, { dist: number, path: string[] }>();
        const visiting = new Set<string>();

        const getLongestPath = (u: string): { dist: number, path: string[] } => {
            if (memo.has(u)) return memo.get(u)!;
            if (visiting.has(u)) return { dist: 0, path: [] }; // Cycle detected

            visiting.add(u);

            let maxDist = 0;
            let bestPath: string[] = [];

            const neighbors = adj.get(u) || [];
            for (const v of neighbors) {
                const res = getLongestPath(v);
                if (res.dist > maxDist) {
                    maxDist = res.dist;
                    bestPath = res.path;
                }
            }

            visiting.delete(u);

            const myDuration = nodeMap.get(u) ? getDuration(nodeMap.get(u)!) : 0;
            const result = {
                dist: myDuration + maxDist,
                path: [u, ...bestPath]
            };
            memo.set(u, result);
            return result;
        };

        // Find the absolute longest path in the entire graph
        let globalMax = -1;
        let criticalNodes = new Set<string>();

        activeNodes.forEach(n => {
            const res = getLongestPath(n.id);
            if (res.dist > globalMax) {
                globalMax = res.dist;
                criticalNodes = new Set(res.path);
            } else if (res.dist === globalMax) {
                // If multiple paths have same max length, include them too
                res.path.forEach(id => criticalNodes.add(id));
            }
        });

        const criticalEdges = new Set<string>();
        activeEdges.forEach(e => {
            if (criticalNodes.has(e.source) && criticalNodes.has(e.target)) {
                criticalEdges.add(e.id);
            }
        });

        return { nodes: criticalNodes, edges: criticalEdges };
    }, [nodes, edges, showCriticalPath]);





    // Recursive helper to check if a node is "effectively completed"
    // A non-task node is effectively completed if ALL its downstream paths lead to completed tasks.
    // For simplicity/performance, we check if ANY immediate downstream task is completed or if it leads to another effectively completed node.
    // Actually, user said: "subentende que se as tasks seguintes estão concluidas os cocumentos ou sap ou notas também já estão."
    // So if the target of this node is completed, then this node is completed.
    const isNodeEffectivelyCompleted = (nodeId: string, visited = new Set<string>()): boolean => {
        if (visited.has(nodeId)) return false; // Cycle detection
        visited.add(nodeId);

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return false;

        if (node.type === 'task') {
            // If task is completed/done, it's effective.
            if (node.data.status === 'completed' || node.data.status === 'done') return true;

            // Refinement: "tasks sem data que estão entre tasks concluidas tambem deve ter linhas verdes"
            // If a task has NO date (startDate/dueDate) AND its target is completed, treat it as completed?
            // Or if it's just "in the middle".
            // Let's check if it has NO dates.
            if (!node.data.startDate && !node.data.dueDate) {
                // Check if it leads to a completed node
                const outgoing = edges.filter(e => e.source === nodeId);
                if (outgoing.length > 0 && outgoing.some(e => isNodeEffectivelyCompleted(e.target, new Set(visited)))) {
                    return true;
                }
            }
            return false;
        }

        // For non-task nodes (note, document), check outgoing edges
        const outgoingEdges = edges.filter(e => e.source === nodeId);
        if (outgoingEdges.length === 0) return false;

        // If ALL outgoing paths lead to completed/effective-completed nodes, then this is completed.
        // Or should it be ANY? "se as tasks seguintes estão concluidas". Usually implies the flow has passed through.
        // Let's go with: if at least one outgoing path is completed (since branches might be parallel).
        // Actually, for a linear flow, it's simple. For branches, if one branch is done, is the note done?
        // Let's assume YES for now, as it's "passed".
        return outgoingEdges.some(e => isNodeEffectivelyCompleted(e.target, new Set(visited)));
    };

    // Render Edges
    // Render Edges - Memoized
    const renderedEdges = useMemo(() => {
        // Pre-calculate incoming edges per node+handle to stack them
        const incomingEdgesMap = new Map<string, { edgeId: string; sortPos: number }[]>();
        // Pre-calculate outgoing edges per node+handle to stack them
        const outgoingEdgesMap = new Map<string, { edgeId: string; sortPos: number }[]>();

        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (!sourceNode || !targetNode) return;

            // Incoming Logic (Target)
            const tHandle = edge.targetHandle || 'left';
            const tKey = `${edge.target}_${tHandle}`;
            if (!incomingEdgesMap.has(tKey)) incomingEdgesMap.set(tKey, []);

            // Sort by source X if entering Top/Bottom, else source Y
            const tSortPos = (tHandle.includes('top') || tHandle.includes('bottom'))
                ? sourceNode.position.x
                : sourceNode.position.y;

            incomingEdgesMap.get(tKey)!.push({
                edgeId: edge.id,
                sortPos: tSortPos
            });

            // Outgoing Logic (Source)
            const sHandle = edge.sourceHandle || 'right';
            const sKey = `${edge.source}_${sHandle}`;
            if (!outgoingEdgesMap.has(sKey)) outgoingEdgesMap.set(sKey, []);

            // Sort by target X if exiting Top/Bottom, else target Y
            const sSortPos = (sHandle.includes('top') || sHandle.includes('bottom'))
                ? targetNode.position.x
                : targetNode.position.y;

            outgoingEdgesMap.get(sKey)!.push({
                edgeId: edge.id,
                sortPos: sSortPos
            });
        });

        // Sort both maps to avoid crossing lines
        incomingEdgesMap.forEach(list => list.sort((a, b) => a.sortPos - b.sortPos));
        outgoingEdgesMap.forEach(list => list.sort((a, b) => a.sortPos - b.sortPos));

        // Calculate global floor (lowest Y position) for safe routing
        const globalMaxY = nodes.reduce((max, node) => Math.max(max, node.position.y + (node.height || 100)), 0);
        const routeFloorY = globalMaxY + 50; // Buffer space below the lowest node

        return edges.map((edge, idx) => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);

            if (!source || !target) return null;

            const sourcePos = getHandlePosition(source, edge.sourceHandle, 'right');
            const targetPos = getHandlePosition(target, edge.targetHandle, 'left');

            let finalSourceX = sourcePos.x;
            let finalSourceY = sourcePos.y;
            let finalTargetX = targetPos.x;
            let finalTargetY = targetPos.y;

            const spacing = 18;

            // 1. Apply Target Offset (Incoming)
            let tHandle = edge.targetHandle || 'left';
            if (tHandle === 'target') tHandle = 'left';
            const tSiblings = incomingEdgesMap.get(`${edge.target}_${tHandle}`);
            if (tSiblings && tSiblings.length > 1) {
                const index = tSiblings.findIndex(s => s.edgeId === edge.id);
                if (index !== -1) {
                    const totalOffset = (tSiblings.length - 1) * spacing;
                    const offset = -totalOffset / 2 + index * spacing;

                    if (tHandle.includes('top') || tHandle.includes('bottom')) {
                        finalTargetX += offset;
                    } else {
                        finalTargetY += offset;
                    }
                }
            }

            // 2. Apply Source Offset (Outgoing)
            let sHandle = edge.sourceHandle || 'right';
            if (sHandle === 'source') sHandle = 'right';
            const sSiblings = outgoingEdgesMap.get(`${edge.source}_${sHandle}`);
            if (sSiblings && sSiblings.length > 1) {
                const index = sSiblings.findIndex(s => s.edgeId === edge.id);
                if (index !== -1) {
                    const totalOffset = (sSiblings.length - 1) * spacing;
                    const offset = -totalOffset / 2 + index * spacing;

                    if (sHandle.includes('top') || sHandle.includes('bottom')) {
                        finalSourceX += offset;
                    } else {
                        finalSourceY += offset;
                    }
                }
            }


            const isPointConnection = source.type === 'point' || target.type === 'point';
            let pathData = '';
            let labelCenter = { x: 0, y: 0 };

            if (isPointConnection) {

                pathData = `M${finalSourceX},${finalSourceY} L${finalTargetX},${finalTargetY}`;
                labelCenter = { x: (finalSourceX + finalTargetX) / 2, y: (finalSourceY + finalTargetY) / 2 };
            } else {

                const orthogonal = getOrthogonalPath(

                    { x: finalSourceX, y: finalSourceY },
                    { x: finalTargetX, y: finalTargetY },
                    edge.sourceHandle,
                    edge.targetHandle,
                    routeFloorY,
                    edge.pathPoints
                );

                pathData = orthogonal.pathData;


                labelCenter = orthogonal.center;



            }


            const midX = labelCenter.x;
            const midY = labelCenter.y;

            const isSelected = selectedEdgeId === edge.id;
            const isCritical = criticalPathData.edges.has(edge.id);
            const isSourceCompleted = isNodeEffectivelyCompleted(source.id);
            const isTargetCompleted = isNodeEffectivelyCompleted(target.id);

            const isTargetActive = target.type === 'task' && (target.data.status === 'in-progress' || target.data.status === 'in_progress');
            const isTargetOverdue = target.type === 'task' && target.data.dueDate && new Date(target.data.dueDate) < new Date() && target.data.status !== 'completed';
            const isTargetInferredOverdue = inferredOverdueNodes.has(target.id);
            const isPastFlow = isSourceCompleted && isTargetCompleted;
            const shouldAnimate = isPastFlow || (isSourceCompleted && isTargetActive) || edge.animated;

            let strokeColor = edge.color || "#555";
            let shadowClass = "";
            if (isCritical) { strokeColor = "#ef4444"; shadowClass = "drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"; }
            else if (isTargetOverdue) { strokeColor = "#ff0000"; shadowClass = "drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"; }
            else if (isTargetInferredOverdue) { strokeColor = "#eab308"; shadowClass = "drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]"; }
            else if (isPastFlow) { strokeColor = "#00ff00"; shadowClass = "drop-shadow-[0_0_8px_rgba(0,255,0,0.6)]"; }

            if (isSelected) strokeColor = "#f97316";

            return (
                <g key={edge.id || `edge-${idx}`} className="group/edge">
                    {/* Interaction Path (Thicker for easier clicking) */}
                    <path d={pathData} fill="none" stroke="transparent" strokeWidth={15}
                        onClick={(e) => { e.stopPropagation(); setSelectedEdge(edge.id); }} className="cursor-pointer" />

                    {/* Visible Path */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 3 : (isCritical ? 3 : 2)}
                        strokeDasharray={edge.style === 'dashed' ? "5,5" : edge.style === 'dotted' ? "2,2" : "0"}
                        markerEnd={edge.markerEnd !== false ? (isCritical ? "url(#arrowhead-critical)" : (isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)")) : undefined}
                        onClick={(e) => { e.stopPropagation(); setSelectedEdge(edge.id); }}
                        className={clsx("cursor-pointer transition-colors", shadowClass, shouldAnimate && "animate-flow")}
                    />

                    {/* Reconnection Handles */}
                    {isSelected && (
                        <>
                            {/* Source Handle */}
                            <circle
                                cx={finalSourceX}
                                cy={finalSourceY}
                                r={5}
                                fill="#f97316"
                                className="cursor-move hover:scale-125 transition-transform edge-interaction"
                                onMouseDown={(e) => {

                                    e.stopPropagation();
                                    setEdgeDrag({
                                        active: true,
                                        edgeId: edge.id,
                                        type: 'source',
                                        startPos: { x: finalSourceX, y: finalSourceY },
                                        currentPos: { x: finalSourceX, y: finalSourceY }
                                    });
                                }}
                            />
                            {/* Target Handle */}
                            <circle
                                cx={finalTargetX}
                                cy={finalTargetY}
                                r={5}
                                fill="#f97316"
                                className="cursor-move hover:scale-125 transition-transform edge-interaction"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setEdgeDrag({
                                        active: true,
                                        edgeId: edge.id,
                                        type: 'target',
                                        startPos: { x: finalTargetX, y: finalTargetY },
                                        currentPos: { x: finalTargetX, y: finalTargetY }
                                    });
                                }}
                            />
                        </>
                    )}


                    {/* Mask for Line Jumps (Lombada) */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="var(--bg-main)"
                        strokeWidth={4}
                        strokeLinecap="round"
                    />

                    {/* Main Visible Path */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke={isCritical ? '#ef4444' : (edge.style === 'dashed' || edge.animated ? 'var(--text-muted)' : 'var(--text-main)')}
                        strokeWidth={isCritical ? 3 : 2}
                        className={clsx(
                            "pointer-events-none",
                            edge.animated && "animate-flow",
                            isSelected && "stroke-orange-500",
                            dimmedElements.has(edge.id) && "opacity-30"
                        )}

                        strokeDasharray={edge.style === 'dashed' ? '5,5' : 'none'}
                        markerEnd={isCritical ? 'url(#arrowhead-critical)' : isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
                    />



                    {edge.label && (
                        <foreignObject x={midX - 50} y={midY - 45} width={100} height={24} className="overflow-visible pointer-events-none">

                            <div className="flex justify-center items-center">
                                <span className={clsx("text-xs px-2 py-0.5 rounded border shadow-sm whitespace-nowrap", isCritical ? "bg-red-900/80 text-red-200 border-red-700" : "bg-[var(--bg-main)] text-[var(--text-main)] border-[var(--border-color)]")}>{edge.label}</span>
                            </div>
                        </foreignObject>
                    )}

                    <foreignObject x={midX - 16} y={midY - 16} width={32} height={32} className="overflow-visible pointer-events-none">
                        <div className="flex justify-center items-center h-full pointer-events-auto">
                            <button
                                className="w-8 h-8 bg-[var(--input-bg)] rounded-full border border-orange-500/50 flex items-center justify-center text-[var(--text-main)] hover:bg-orange-500/20 transition-all opacity-0 group-hover/edge:opacity-100 shadow-lg"

                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNodeMenu({
                                        isOpen: true,
                                        x: midX,
                                        y: midY,
                                        edgeId: edge.id
                                    });

                                }}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </foreignObject>
                </g>
            );
        });
    }, [nodes, edges, selectedEdgeId, showCriticalPath]);


    const handleSave = async () => {
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

        await performSave();
    };

    const performSave = async () => {
        try {
            await saveCurrentFlow();
            toast.success("Flow saved successfully!");
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to save flow.");
        }
    };

    const handleRenameAndSave = (newName: string) => {
        if (activeFlowId) {
            updateFlowName(activeFlowId, newName);
            setShowRenameModal(false);
            performSave();
        }
    };

    const handleExport = async () => {
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
    };

    const handleLoad = async () => {
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
                input.type = 'file'; input.accept = '.json';
                input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                        const content = await file.text();
                        try {
                            const flowData = JSON.parse(content);
                            loadState(flowData);
                            toast.success(`Flow loaded from ${file.name}`);
                        } catch (err) { toast.error("Invalid JSON file."); }
                    }
                };
                input.click();
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') { console.error(error); toast.error("Failed to load flow."); }
        }
    };

    const handleAddTask = () => {
        const centerX = (window.innerWidth / 2 - transform.x) / transform.k;
        const centerY = (window.innerHeight / 2 - transform.y) / transform.k;

        // Open the node menu at the center of the screen
        setNodeMenu({
            isOpen: true,
            x: centerX - 100, // Offset to center the menu visually 
            y: centerY - 150
        });
    };

    const handleAddNote = () => {
        const id = crypto.randomUUID();
        const startX = (50 - transform.x) / transform.k;
        const startY = (window.innerHeight / 2 - transform.y) / transform.k - 200;
        addNode({
            id, type: 'note', position: { x: startX, y: startY },
            data: { label: '', status: 'pending' }, width: 200, height: 200
        });
        toast.success("Note added!");
    };

    const handleAddBranch = useCallback((sourceNodeId: string, sourceHandleId: string = 'right') => {
        const sourceNode = useStore.getState().nodes.find(n => n.id === sourceNodeId);
        if (!sourceNode) return;

        const newNodeId = crypto.randomUUID();

        // Calculate position based on handle
        let yOffset = 0;
        if (sourceHandleId === 'yes') yOffset = -80;
        if (sourceHandleId === 'no') yOffset = 80;

        const newNode = {
            id: newNodeId, type: 'task',
            position: {
                x: sourceNode.position.x + (sourceNode.width || 256) + 100,
                y: sourceNode.position.y + yOffset
            },
            data: { label: 'New Branch', status: 'pending' as const }, width: 256, height: 100
        };
        addNode(newNode);
        const newEdge = {
            id: `e${sourceNodeId}-${newNodeId}-${Date.now()}`, source: sourceNodeId, target: newNodeId,
            sourceHandle: sourceHandleId, targetHandle: 'left', animated: true
        };
        addEdge(newEdge);
        toast.success("Branch added!");
    }, [addNode, addEdge]);

    const handleAutoLayout = () => {
        const positionUpdates = calculateAutoLayout(nodes, edges);
        updateNodesPositions(positionUpdates);
        toast.success("Auto Layout Applied!");
    };

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return nodes.filter(node => {
            if (node.type !== 'task' && node.type !== 'note' && node.type !== 'document') return false;
            if (searchMode === 'assignee') return node.data.assignee?.toLowerCase() === query;
            const label = node.data.label?.toLowerCase() || '';
            const description = node.data.description?.toLowerCase() || '';
            const assignee = node.data.assignee?.toLowerCase() || '';
            const tags = node.data.tags?.map(t => t.toLowerCase()).join(' ') || '';
            const checklist = node.data.checklist?.map(i => i.text.toLowerCase()).join(' ') || '';
            return label.includes(query) || description.includes(query) || assignee.includes(query) || tags.includes(query) || checklist.includes(query);
        }).map(n => n.id);
    }, [nodes, searchQuery, searchMode]);

    useEffect(() => {
        setCurrentResultIndex(0);
        if (searchResults.length > 0) zoomToNode(searchResults[0]);
    }, [searchResults]);

    // Save Reminder Timer  
    useEffect(() => {
        if (!saveReminderEnabled || !hasUnsavedChanges || !lastSavedAt) return;

        const intervalMs = saveReminderInterval * 60 * 1000; // Convert minutes to ms
        const timeSinceLastSave = Date.now() - lastSavedAt;

        // If enough time has passed since last save, show reminder
        if (timeSinceLastSave >= intervalMs) {
            toast.warning("Don't forget to save your changes!", {
                action: {
                    label: "Save Now",
                    onClick: handleSave
                },
                duration: 10000
            });
        }

        // Set up timer for next reminder
        const timer = setTimeout(() => {
            if (hasUnsavedChanges) {
                toast.warning("Don't forget to save your changes!", {
                    action: {
                        label: "Save Now",
                        onClick: handleSave
                    },
                    duration: 10000
                });
            }
        }, intervalMs - timeSinceLastSave);

        return () => clearTimeout(timer);
    }, [saveReminderEnabled, hasUnsavedChanges, lastSavedAt, saveReminderInterval, handleSave]);

    const handleNextResult = () => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentResultIndex + 1) % searchResults.length;
        setCurrentResultIndex(nextIndex);
        zoomToNode(searchResults[nextIndex]);
    };

    const handlePrevResult = () => {
        if (searchResults.length === 0) return;
        const prevIndex = (currentResultIndex - 1 + searchResults.length) % searchResults.length;
        setCurrentResultIndex(prevIndex);
        zoomToNode(searchResults[prevIndex]);
    };

    const handleConflictClick = useCallback((assignee: string) => {
        const assigneeTasks = nodes.filter(n => n.type === 'task' && n.data.assignee === assignee);
        const focusSet = new Set<string>();
        assigneeTasks.forEach(task => {
            if (!task.data.startDate || !task.data.dueDate) return;
            const start = new Date(task.data.startDate).getTime();
            const end = new Date(task.data.dueDate).getTime();
            const hasSelfOverlap = assigneeTasks.some(other => {
                if (other.id === task.id || !other.data.startDate || !other.data.dueDate) return false;
                const otherStart = new Date(other.data.startDate).getTime();
                const otherEnd = new Date(other.data.dueDate).getTime();
                return (start < otherEnd && end > otherStart);
            });
            if (hasSelfOverlap) focusSet.add(task.id);
        });

        if (focusSet.size > 0) {
            setConflictFocus(focusSet);
            setSearchQuery('');
            toast.info(`Focused on ${assignee}'s conflicting tasks`);
        } else {
            const allAssigneeIds = new Set(assigneeTasks.map(n => n.id));
            setConflictFocus(allAssigneeIds);
            toast.info(`Focused on ${assignee}'s tasks (No conflicts found)`);
        }
    }, [nodes]);

    return (
        <>
            <div
                className="w-full h-full flex flex-col transition-colors duration-300 flow-canvas-container"
                style={{ backgroundColor: canvasColor || 'var(--bg-main)' }}
            >
                {/* Toolbar */}
                <div className="h-12 bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] flex items-center px-4 gap-4">
                    <h1 className="text-[var(--text-main)] font-semibold text-sm">FluxUp Editor (D3)</h1>

                    <div className="flex-1" />

                    {/* Search Bar */}
                    <div className="relative flex items-center bg-[var(--input-bg)] rounded-md border border-[var(--input-border)] h-8 px-2 w-64 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all mr-2">
                        <Search size={14} className="text-gray-500 mr-2 flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchMode('all');
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (e.shiftKey) handlePrevResult();
                                    else handleNextResult();
                                }
                            }}
                            placeholder={searchMode === 'assignee' ? `Filtering by assignee: ${searchQuery}` : "Search..."}
                            className="bg-transparent border-none outline-none text-xs text-[var(--text-main)] w-full placeholder-gray-500"
                        />
                        {searchQuery && (
                            <div className="flex items-center gap-1 ml-2">
                                {searchResults.length > 0 && (
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                        {currentResultIndex + 1}/{searchResults.length}
                                    </span>
                                )}
                                <div className="flex items-center gap-0.5 border-l border-gray-700 pl-1 ml-1">
                                    <button onClick={handlePrevResult} className="p-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                                        <ChevronUp size={12} />
                                    </button>
                                    <button onClick={handleNextResult} className="p-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                                        <ChevronDown size={12} />
                                    </button>
                                </div>
                                <button onClick={() => setSearchQuery('')} className="ml-1 p-0.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
                                    <X size={12} />
                                </button>
                            </div >
                        )}
                    </div >

                    {/* Center Flow Button */}
                    <button
                        onClick={centerFlow}
                        className="p-1.5 text-gray-500 hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] rounded transition-colors"
                        title="Center Flow"
                    >
                        <Target size={16} />
                    </button>

                    <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

                    <button
                        onClick={() => {
                            setAIAssistantTab(nodes.length > 0 ? 'edit' : 'generate');
                            setShowAIAssistant(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-900/50 to-purple-900/50 hover:from-orange-900/80 hover:to-purple-900/80 text-white rounded text-xs transition-all border border-orange-900/50 shadow-sm"
                        title="AI Assistant (Generate, Edit, Analyze)"
                    >
                        <Sparkles size={14} />
                        AI Assistant
                    </button>

                    <button
                        onClick={handleAutoLayout}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] opacity-80 hover:opacity-100 rounded text-xs transition-colors border border-[var(--input-border)]"
                        title="Auto Align Nodes"
                    >
                        <Layout size={14} />
                        Auto Layout
                    </button>



                    <button
                        onClick={() => setShowCriticalPath(!showCriticalPath)}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors border",
                            showCriticalPath
                                ? "bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30"
                                : "bg-[#242424] text-gray-400 border-gray-700 hover:text-gray-200"
                        )}
                        title="Toggle Critical Path"
                    >
                        <Activity size={14} />
                        Critical Path
                    </button>

                    <button
                        onClick={handleLoad}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] opacity-80 hover:opacity-100 rounded text-xs transition-colors border border-[var(--input-border)]"
                    >
                        <Upload size={14} />
                        Load Flow
                    </button>
                    <button
                        onClick={() => {
                            generateProjectReport(nodes, edges);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] opacity-80 hover:opacity-100 rounded text-xs transition-colors border border-[var(--input-border)]"
                    >
                        <FileText size={14} />
                        Report
                    </button>
                    <button
                        onClick={handleSave}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors",
                            hasUnsavedChanges
                                ? "bg-orange-600 hover:bg-orange-500 text-white"
                                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                        )}
                        title={hasUnsavedChanges ? "Save changes" : "No unsaved changes"}
                    >
                        <Save size={14} />
                        Save
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] opacity-80 hover:opacity-100 rounded text-xs transition-colors border border-[var(--input-border)]"
                        title="Export flow to custom location"
                    >
                        <Share2 size={14} />
                        Export/Share
                    </button>
                </div >

                {/* Overdue Warning Banner */}
                {
                    overdueTasks.length > 0 && (
                        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-4 overflow-hidden">
                            <div className="flex items-center gap-2 text-red-400 text-sm flex-shrink-0 whitespace-nowrap">
                                <span className="font-semibold">Attention:</span>
                                <span>You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}!</span>
                            </div>

                            <div
                                ref={(el) => {
                                    // Simple ref callback to store the element for scrolling
                                    if (el) (window as any).overdueScrollContainer = el;
                                }}
                                className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar mask-linear-fade scroll-smooth"
                            >
                                {overdueTasks.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => {
                                            setSelectedNodes([task.id]);
                                            zoomToNode(task.id);
                                        }}
                                        className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-2 py-1 rounded transition-colors whitespace-nowrap flex-shrink-0 max-w-[200px] truncate"
                                        title={task.data.label}
                                    >
                                        {task.data.label}
                                    </button>
                                ))}
                            </div>

                            {/* Scroll Controls */}
                            <div className="flex items-center gap-1 flex-shrink-0 border-l border-red-500/20 pl-2">
                                <button
                                    onClick={() => {
                                        const container = (window as any).overdueScrollContainer as HTMLDivElement;
                                        if (container) container.scrollLeft -= 200;
                                    }}
                                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <button
                                    onClick={() => {
                                        const container = (window as any).overdueScrollContainer as HTMLDivElement;
                                        if (container) container.scrollLeft += 200;
                                    }}
                                    className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )
                }

                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="flex-1 flex relative overflow-hidden">
                        <div className="flex-1 flex flex-col relative min-w-0">
                            <div className="flex-1 relative">
                                {!activeFlowId && <EmptyState />}

                                {/* Rename Flow Modal */}
                                {showRenameModal && (
                                    <RenameFlowModal
                                        currentName="New Flow"
                                        onSave={handleRenameAndSave}
                                        onCancel={() => setShowRenameModal(false)}
                                    />
                                )}

                                {/* AI Assistant Modal */}
                                {showAIAssistant && (
                                    <AIAssistantModal
                                        onClose={() => setShowAIAssistant(false)}
                                        initialTab={aiAssistantTab}
                                    />
                                )}

                                <svg
                                    ref={svgRef}
                                    className="w-full h-full flow-canvas-container relative"
                                    style={{ backgroundColor: 'transparent' }}


                                    onClick={() => {
                                        if (nodeMenu.isOpen) {
                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                            return;
                                        }
                                        if (searchQuery) {
                                            setSearchQuery('');
                                        } else if (conflictFocus) {
                                            setConflictFocus(null);
                                        } else {
                                            setSelectedNodes([]);
                                            setSelectedEdge(null);
                                        }
                                    }}
                                >
                                    <defs>
                                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-main)" opacity="0.3" />
                                        </marker>
                                        <marker id="arrowhead-critical" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                                        </marker>
                                        <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                            <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
                                        </marker>

                                    </defs>
                                    <g ref={gRef}>
                                        {renderedEdges.map((edgeElement: any) => {
                                            if (!edgeElement) return null;
                                            // Apply dimming to edges
                                            const edgeId = edgeElement.key;
                                            if (dimmedElements.has(edgeId)) {
                                                return {
                                                    ...edgeElement,
                                                    props: {
                                                        ...edgeElement.props,
                                                        className: clsx(edgeElement.props.className, "opacity-30 grayscale")
                                                    }
                                                };
                                            }
                                            return edgeElement;
                                        })}

                                        {/* Temp Connection Line */}
                                        {connectionDrag.active && connectionDrag.startPos && connectionDrag.currentPos && (
                                            <path
                                                d={`M${connectionDrag.startPos.x},${connectionDrag.startPos.y} L${connectionDrag.currentPos.x},${connectionDrag.currentPos.y}`}
                                                stroke="var(--text-muted)"
                                                strokeWidth={2}
                                                fill="none"
                                                className="pointer-events-none"
                                            />
                                        )}









                                        {/* Node Type Menu */}
                                        {nodeMenu.isOpen && (
                                            <foreignObject
                                                x={nodeMenu.x}
                                                y={nodeMenu.y}
                                                width={200}
                                                height={300}
                                                className="overflow-visible z-[100]"
                                            >
                                                <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg shadow-xl p-2 flex flex-col gap-1 w-40">
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'task',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: { label: 'New Task', status: 'pending', priority: 'medium' },
                                                                width: 256,
                                                                height: 100
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                // Split Edge
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 128, y: nodeMenu.y - 50 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                // Branch from Node
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <CheckSquare size={14} className="text-blue-400" />
                                                        Task
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'projectCharter',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'Project Charter',
                                                                    projectCharter: {
                                                                        projectName: 'New Project',
                                                                        projectManager: '',
                                                                        budget: '',
                                                                        objectives: [],
                                                                        justification: '',
                                                                        successCriteria: [],
                                                                        assumptions: [],
                                                                        premise: [],
                                                                        constraints: [],
                                                                        milestones: []
                                                                    }
                                                                },
                                                                width: 500,
                                                                height: 600
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 250, y: nodeMenu.y - 300 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <ClipboardList size={14} className="text-indigo-400" />
                                                        Project Charter
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'stakeholderMatrix',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'Stakeholder Matrix',
                                                                    stakeholderMatrix: { stakeholders: [] }
                                                                },
                                                                width: 600,
                                                                height: 500
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 300, y: nodeMenu.y - 250 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Users size={14} className="text-pink-400" />
                                                        Stakeholder Matrix
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'decision',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: { label: 'Decision', decision: 'yes' },
                                                                width: 140,
                                                                height: 120
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                // Split Edge
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 70, y: nodeMenu.y - 60 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'target' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'yes', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                // Branch from Node
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'target',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Activity size={14} className="text-orange-400" />
                                                        Decision
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'note',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: { label: 'Note', content: '' },
                                                                width: 200,
                                                                height: 200
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                // Split Edge for Note (Attach to flow)
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 100, y: nodeMenu.y - 100 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: false,
                                                                    style: 'dashed',
                                                                    markerEnd: false
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <StickyNote size={14} className="text-yellow-400" />
                                                        Note
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'document',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: { label: 'Document', description: '', documentUrl: '' },
                                                                width: 200,
                                                                height: 80
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 100, y: nodeMenu.y - 40 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <FileText size={14} className="text-blue-400" />
                                                        Document
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'fmea',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: { label: 'FMEA', failureMode: '', severity: 1, occurrence: 1, detection: 1, rpn: 1, action: '' },
                                                                width: 320,
                                                                height: 400
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 160, y: nodeMenu.y - 200 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <ShieldAlert size={14} className="text-red-400" />
                                                        FMEA Analysis
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'ishikawa',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'Problem',
                                                                    causes: {
                                                                        method: [], machine: [], material: [],
                                                                        manpower: [], measurement: [], environment: []
                                                                    }
                                                                },
                                                                width: 600,
                                                                height: 400
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 300, y: nodeMenu.y - 200 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Fish size={14} className="text-teal-400" />
                                                        Ishikawa (Fishbone)
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'pdca',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'New Cycle',
                                                                    pdca: { plan: [], do: [], check: [], act: [] }
                                                                },
                                                                width: 500,
                                                                height: 400
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 250, y: nodeMenu.y - 200 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <RotateCw size={14} className="text-purple-400" />
                                                        PDCA Cycle
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'fiveWTwoH',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'New Action',
                                                                    fiveWTwoH: { what: '', why: '', where: '', when: '', who: '', how: '', howMuch: '' }
                                                                },
                                                                width: 400,
                                                                height: 350
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 200, y: nodeMenu.y - 175 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <HelpCircle size={14} className="text-blue-400" />
                                                        5W2H Action
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'swot',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'New SWOT Analysis',
                                                                    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
                                                                },
                                                                width: 600,
                                                                height: 450
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 300, y: nodeMenu.y - 225 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Target size={14} className="text-green-400" />
                                                        SWOT Analysis
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'prioritization',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'New Prioritization Matrix',
                                                                    prioritization: { method: 'RICE', items: [] }
                                                                },
                                                                width: 600,
                                                                height: 450
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 300, y: nodeMenu.y - 225 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <BarChart3 size={14} className="text-yellow-400" />
                                                        Prioritization Matrix
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'external',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: { label: 'External System', description: '', externalSystem: '' },
                                                                width: 200,
                                                                height: 80
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 100, y: nodeMenu.y - 40 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Activity size={14} className="text-purple-400" />
                                                        External System
                                                    </button>

                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'meeting',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: {
                                                                    label: 'New Meeting',
                                                                    meeting: {
                                                                        date: new Date().toISOString(),
                                                                        participants: [],
                                                                        minutes: ''
                                                                    }
                                                                },
                                                                width: 250,
                                                                height: 150
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 125, y: nodeMenu.y - 75 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <Calendar size={14} className="text-orange-400" />
                                                        Meeting
                                                    </button>
                                                    <button
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded text-left transition-colors"
                                                        onClick={() => {
                                                            const newNodeId = crypto.randomUUID();
                                                            const newNode: Node = {
                                                                id: newNodeId,
                                                                type: 'wbs',
                                                                position: { x: nodeMenu.x, y: nodeMenu.y },
                                                                data: { label: 'WBS / EAP', wbs: [] } as any,
                                                                width: 600,
                                                                height: 400
                                                            };

                                                            if (nodeMenu.edgeId) {
                                                                const edge = edges.find(e => e.id === nodeMenu.edgeId);
                                                                if (edge) {
                                                                    addNode({ ...newNode, position: { x: nodeMenu.x - 300, y: nodeMenu.y - 200 } });
                                                                    deleteEdge(edge.id);
                                                                    addEdge({ ...edge, id: `e-${edge.source}-${newNodeId}`, target: newNodeId, targetHandle: 'left' });
                                                                    addEdge({ ...edge, id: `e-${newNodeId}-${edge.target}`, source: newNodeId, sourceHandle: 'right', target: edge.target, targetHandle: edge.targetHandle });
                                                                }
                                                            } else if (nodeMenu.sourceNodeId) {
                                                                addNode({ ...newNode, position: { x: nodeMenu.x + 50, y: nodeMenu.y } });
                                                                addEdge({
                                                                    id: `e-${nodeMenu.sourceNodeId}-${newNodeId}`,
                                                                    source: nodeMenu.sourceNodeId,
                                                                    target: newNodeId,
                                                                    sourceHandle: 'right',
                                                                    targetHandle: 'left',
                                                                    animated: true,
                                                                    style: 'solid',
                                                                    markerEnd: true
                                                                });
                                                            } else {
                                                                addNode(newNode);
                                                            }
                                                            setNodeMenu({ isOpen: false, x: 0, y: 0 });
                                                        }}
                                                    >
                                                        <GitMerge size={14} className="text-emerald-400" />
                                                        WBS / EAP
                                                    </button>
                                                </div>
                                            </foreignObject>
                                        )}

                                        {nodes.filter(n => n && n.position && n.data).map(node => {
                                            if (node.type === 'decision') {
                                                return (
                                                    <foreignObject
                                                        key={node.id}
                                                        x={node.position.x}
                                                        y={node.position.y}
                                                        width={node.width || 220}
                                                        height={node.height || 100}
                                                        className="overflow-visible"
                                                    >
                                                        <DraggableNode
                                                            node={node}
                                                            onConnectionStart={handleConnectionStart}
                                                            onAddBranch={handleAddBranch}
                                                            onConflictClick={handleConflictClick}
                                                        />
                                                    </foreignObject>
                                                );
                                            }

                                            const isMatch = searchResults.includes(node.id);
                                            const isDimmed = (searchQuery.trim().length > 0 && !isMatch) ||
                                                (dimmedElements.has(node.id) && !searchQuery) ||
                                                (conflictFocus && !conflictFocus.has(node.id));

                                            const isCurrentResult = searchResults[currentResultIndex] === node.id;
                                            const isInferredOverdue = inferredOverdueNodes.has(node.id);

                                            // Only show overdue ring for Task nodes
                                            const showOverdueRing = isInferredOverdue && !isDimmed && node.type === 'task';

                                            const dims = getNodeDimensions(node.type || 'task');

                                            return (
                                                <foreignObject
                                                    key={node.id}
                                                    x={node.position.x}
                                                    y={node.position.y}
                                                    width={node.width || dims.width}
                                                    height={node.height || dims.height}
                                                    className={clsx(
                                                        "overflow-visible transition-opacity duration-300",
                                                        isDimmed ? "opacity-30 grayscale pointer-events-none" : "opacity-100",
                                                        isCurrentResult && "z-50"
                                                    )}
                                                >
                                                    <DraggableNode
                                                        node={node}
                                                        onConnectionStart={handleConnectionStart}
                                                        onAddBranch={handleAddBranch}
                                                        onConflictClick={handleConflictClick}
                                                        className={clsx(
                                                            isCurrentResult && "ring-2 ring-orange-500 ring-offset-4 ring-offset-[#121212] rounded-lg",
                                                            showOverdueRing && "ring-2 ring-yellow-500/70 ring-offset-2 ring-offset-[#121212] rounded-lg"
                                                        )}
                                                    />
                                                </foreignObject>
                                            );
                                        })}

                                        {/* Selection Box */}
                                        {selectionBox && (
                                            <rect
                                                x={Math.min(selectionBox.startX, selectionBox.currentX)}
                                                y={Math.min(selectionBox.startY, selectionBox.currentY)}
                                                width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                                                height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                                                fill="rgba(59, 130, 246, 0.1)"
                                                stroke="rgba(59, 130, 246, 0.5)"
                                                strokeWidth={1}
                                                strokeDasharray="4"
                                            />
                                        )}
                                    </g>
                                </svg>

                                {/* Floating Action Buttons */}
                                <div className="absolute bottom-6 left-6 flex flex-col gap-3">
                                    <button
                                        onClick={handleAddTask}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-lg hover:shadow-green-900/20 transition-all group"
                                    >
                                        <Plus size={16} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-medium">Add Task</span>
                                    </button>

                                    <button
                                        onClick={handleAddNote}
                                        className="flex items-center gap-2 px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--sidebar-active)] text-[var(--warning-text)] border border-[var(--warning-border)] rounded-full backdrop-blur-sm transition-all shadow-lg hover:shadow-yellow-900/20 hover:border-[var(--warning-border)] group"
                                    >
                                        <StickyNote size={16} className="group-hover:scale-110 transition-transform" />
                                        <span className="text-sm font-medium">Add Note</span>
                                    </button>
                                </div>

                            </div>

                            {/* Bottom Toolbar - Positioned dynamically */}
                            <div
                                className="fixed left-1/2 -translate-x-1/2 bg-[#1e1e1e] border border-gray-800 rounded-full shadow-2xl px-4 py-2 flex items-center gap-2 z-50 transition-all duration-300 ease-out"
                                style={{ bottom: isTimelineOpen ? timelineHeight + 24 : 24 }}
                            >
                                <div className="flex bg-black/20 rounded-lg p-1">
                                    <button
                                        onClick={() => setView('flow')}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                            view === 'flow' ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Layout size={14} />
                                        Flow
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!isTimelineOpen) setView('flow');
                                            setIsTimelineOpen(!isTimelineOpen);
                                        }}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                            isTimelineOpen ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Calendar size={14} />
                                        Timeline
                                    </button>
                                    <button
                                        onClick={() => {
                                            setView('kanban');
                                            setIsTimelineOpen(false);
                                        }}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                            view === 'kanban' ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Layout size={14} className="rotate-90" />
                                        Kanban
                                    </button>
                                    <button
                                        onClick={() => {
                                            setView('table');
                                            setIsTimelineOpen(false);
                                        }}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                            view === 'table' ? "bg-blue-500 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <FileText size={14} />
                                        Table
                                    </button>
                                </div>
                            </div>

                            {isTimelineOpen && (
                                <div
                                    className="bg-[#121212] border-t border-gray-800 z-10 flex-shrink-0 relative w-full max-w-full min-w-0 overflow-hidden"
                                    style={{ height: timelineHeight }}
                                >
                                    {/* Resize Handle */}
                                    <div
                                        className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-blue-500 transition-colors z-20"
                                        onMouseDown={() => setIsResizingTimeline(true)}
                                    />
                                    <Timeline
                                        onClose={() => setIsTimelineOpen(false)}
                                        onTaskClick={(taskId) => {
                                            zoomToNode(taskId);
                                            setSelectedNodes([taskId]);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <TaskSidebar />





                        {view === 'kanban' && (
                            <div className="absolute inset-0 z-20 bg-[#121212]">
                                <KanbanBoard onNodeClick={(node) => {
                                    setSelectedNodes([node.id]);
                                }} />
                                <button
                                    onClick={() => setView('flow')}
                                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full z-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {view === 'table' && (
                            <div className="absolute inset-0 z-20 bg-[#121212] flex flex-col">
                                <div className="absolute top-2 right-4 z-50">
                                    <button
                                        onClick={() => setView('flow')}
                                        className="p-2 bg-[#242424] hover:bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg border border-gray-700 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <TableView />
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </>
    );
};

export function FlowEditor() {
    return <FlowEditorContent />;
}
