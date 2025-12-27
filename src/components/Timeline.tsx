import { useStore } from '../store/store';
import { clsx } from 'clsx';
import { useMemo, useState, useEffect, useRef } from 'react';
import { calculateReachability } from '../utils/flowUtils';
import { X, Calendar as CalendarIcon, Layers, ShieldAlert, Fish, RotateCw, HelpCircle, Target, BarChart3, Users, FileText, Globe, GitBranch, Network } from 'lucide-react';

interface TimelineProps {
    onTaskClick?: (taskId: string) => void;
    onClose?: () => void;
}

type ViewMode = 'day' | 'week' | 'month';



function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function Timeline({ onTaskClick, onClose }: TimelineProps) {
    const nodes = useStore((state) => state.nodes);
    const edges = useStore((state) => state.edges);
    const selectedNodeIds = useStore((state) => state.selectedNodeIds);
    const [sidebarWidth, setSidebarWidth] = useState(200);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarContentRef = useRef<HTMLDivElement>(null);
    const [hoveredTask, setHoveredTask] = useState<{ id: string, label: string, x: number, y: number, start: Date, end: Date, type?: string } | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('day');



    // Drag to scroll state
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const initialScrollLeft = useRef(0);
    const initialScrollTop = useRef(0);

    // Helper to parse "YYYY-MM-DD" as local midnight
    const parseLocal = (dateStr: string) => {
        if (!dateStr) return new Date();
        const parts = dateStr.split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return new Date();

        // Sanity check for year to prevent massive ranges
        if (parts[0] < 1970 || parts[0] > 2100) return new Date();

        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    // Filter tasks
    const timelineTasks = useMemo(() => {
        const dimmedElements = calculateReachability(nodes, edges);
        const analysisTypes = ['swot', 'pdca', 'prioritization', 'fmea', 'ishikawa', 'fiveWTwoH', 'meeting', 'projectCharter', 'stakeholderMatrix', 'wbs', 'external', 'document', 'decision'];

        // 1. Process Standard Tasks (with explicit dates)
        const standardTasks = nodes
            .filter((n) => n.data && n.data.startDate && n.data.dueDate && !analysisTypes.includes(n.type || '') && n.type !== 'decision')
            .map((n) => ({
                id: n.id,
                label: n.data.label,
                start: parseLocal(n.data.startDate!),
                end: parseLocal(n.data.dueDate!),
                status: n.data.status,
                assignee: n.data.assignee,
                dimmed: dimmedElements.has(n.id),
                type: n.type,
                inferred: false
            }));

        // Map for quick lookup of standard task dates
        const taskMap = new Map(standardTasks.map(t => [t.id, t]));

        // Helper to find nearest dated neighbors (Standard Tasks)
        // direction: 'predecessors' (upstream) or 'successors' (downstream)
        const findNearestDatedNeighbors = (startNodeId: string, direction: 'predecessors' | 'successors') => {
            const results: any[] = [];
            const visited = new Set<string>();
            const queue = [startNodeId];

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                if (visited.has(currentId)) continue;
                visited.add(currentId);

                const connectedEdges = edges.filter(e =>
                    direction === 'predecessors' ? e.target === currentId : e.source === currentId
                );

                for (const edge of connectedEdges) {
                    const neighborId = direction === 'predecessors' ? edge.source : edge.target;
                    // Prevent infinite loops and self-references
                    if (visited.has(neighborId)) continue;
                    if (neighborId === startNodeId) continue;

                    const task = taskMap.get(neighborId);
                    if (task && !task.inferred) {
                        results.push(task);
                    } else {
                        // Not a standard task (Decision, Analysis, or Undated), traverse through
                        queue.push(neighborId);
                    }
                }
            }
            return results;
        };

        // 2. Process Tasks WITHOUT Dates (Infer from connections)
        const inferredTasks = nodes
            .filter((n) => (!n.data || !n.data.startDate || !n.data.dueDate) && !analysisTypes.includes(n.type || '') && n.type !== 'decision')
            .map((n) => {
                // Find Nearest Dated Predecessors
                const datedPredecessors = findNearestDatedNeighbors(n.id, 'predecessors');

                // Find Nearest Dated Successors
                const datedSuccessors = findNearestDatedNeighbors(n.id, 'successors');

                // Infer Start Date: Max(Predecessor Ends) or Today
                let start = new Date();
                if (datedPredecessors.length > 0) {
                    const maxEnd = new Date(Math.max(...datedPredecessors.map(p => p.end.getTime())));
                    start = maxEnd;
                }

                // Infer End Date: Min(Successor Starts) or Start + 1 Day
                let end = new Date(start);
                end.setDate(end.getDate() + 1); // Default duration 1 day

                if (datedSuccessors.length > 0) {
                    const minStart = new Date(Math.min(...datedSuccessors.map(s => s.start.getTime())));
                    if (minStart > start) {
                        end = minStart;
                    }
                }

                // Add to map so subsequent inferred tasks can use this (though simple single-pass won't handle chains of inferred tasks perfectly, it's a start)
                const task = {
                    id: n.id,
                    label: n.data?.label || 'Untitled Task',
                    start,
                    end,
                    status: n.data?.status,
                    assignee: n.data?.assignee,
                    dimmed: dimmedElements.has(n.id),
                    type: n.type,
                    inferred: true
                };
                taskMap.set(task.id, task);
                return task;
            });

        // 3. Process Analysis Nodes (infer dates from neighbors)
        const analysisNodes = nodes
            .filter((n) => analysisTypes.includes(n.type || ''))
            .map((n) => {
                // Find Nearest Dated Predecessors
                const datedPredecessors = findNearestDatedNeighbors(n.id, 'predecessors');

                // Find Nearest Dated Successors
                const datedSuccessors = findNearestDatedNeighbors(n.id, 'successors');

                // Infer Start Date: Max(Predecessor Ends) or Today
                let start = new Date();
                if (datedPredecessors.length > 0) {
                    const maxEnd = new Date(Math.max(...datedPredecessors.map(p => p.end.getTime())));
                    start = maxEnd;
                }

                // Infer End Date: Min(Successor Starts) or Start + 1 Day
                let end = new Date(start);
                end.setDate(end.getDate() + 1); // Default duration 1 day

                if (datedSuccessors.length > 0) {
                    const minStart = new Date(Math.min(...datedSuccessors.map(s => s.start.getTime())));
                    if (minStart > start) {
                        end = minStart;
                    }
                }

                return {
                    id: n.id,
                    label: n.data.label,
                    start,
                    end,
                    status: n.data.status,
                    assignee: n.data.assignee,
                    dimmed: dimmedElements.has(n.id),
                    type: n.type,
                    inferred: true // Analysis nodes are always inferred
                };
            });

        return [...standardTasks, ...inferredTasks, ...analysisNodes].sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [nodes, edges]);

    // Calculate Range
    const { minDate, maxDate, totalDays } = useMemo(() => {
        if (timelineTasks.length === 0) {
            const now = new Date();
            return { minDate: now, maxDate: now, totalDays: 1 };
        }

        const timestamps = [
            ...timelineTasks.map((t) => t.start.getTime()),
            ...timelineTasks.map((t) => t.end.getTime()),
            new Date().getTime()
        ];

        const min = new Date(Math.min(...timestamps));
        const max = new Date(Math.max(...timestamps));

        // Padding
        // min.setDate(min.getDate() - 30); // Removed left padding to align with start
        min.setDate(min.getDate() - 1); // Small padding for aesthetics
        max.setDate(max.getDate() + 30);

        return {
            minDate: min,
            maxDate: max,
            totalDays: (max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)
        };
    }, [timelineTasks]);

    // Column Width based on View Mode
    const columnWidth = useMemo(() => {
        switch (viewMode) {
            case 'day': return 40;
            case 'week': return 30; // per day, but visualized differently
            case 'month': return 10; // per day
        }
    }, [viewMode]);

    const totalWidth = Math.max(2000, totalDays * columnWidth); // Ensure minimum width for scrolling

    // Grid Generation
    const gridLines = useMemo(() => {
        const lines: { date: Date; label: string; isMajor: boolean }[] = [];
        const current = new Date(minDate);
        current.setHours(0, 0, 0, 0);

        // Safety break to prevent infinite loops if dates are corrupted
        let safetyCounter = 0;
        const MAX_ITERATIONS = 3650; // Max 10 years of daily grids

        while (current <= maxDate && safetyCounter < MAX_ITERATIONS) {
            const date = new Date(current);
            let label = '';
            let isMajor = false;

            if (viewMode === 'day') {
                label = `${date.getDate()}`;
                if (date.getDate() === 1) {
                    label = date.toLocaleString('default', { month: 'short' });
                    isMajor = true;
                }
            } else if (viewMode === 'week') {
                if (date.getDay() === 1) { // Monday
                    label = `W${getWeekNumber(date)}`;
                    isMajor = true;
                }
            } else if (viewMode === 'month') {
                if (date.getDate() === 1) {
                    label = date.toLocaleString('default', { month: 'short' });
                    isMajor = true;
                }
            }

            lines.push({ date, label, isMajor });
            current.setDate(current.getDate() + 1);
            safetyCounter++;
        }
        return lines;
    }, [minDate, maxDate, viewMode]);

    const getXPosition = useMemo(() => (date: Date) => {
        const diffDays = (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays * columnWidth;
    }, [minDate, columnWidth]);



    // Resizing Logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = Math.max(150, Math.min(500, e.clientX));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isResizing]);

    // Scroll to selected task
    useEffect(() => {
        if (selectedNodeIds.length > 0 && sidebarContentRef.current && scrollContainerRef.current) {
            const selectedId = selectedNodeIds[0];
            const taskIndex = timelineTasks.findIndex(t => t.id === selectedId);

            if (taskIndex !== -1) {
                // Scroll sidebar vertical
                const rowHeight = 40;
                const scrollTop = taskIndex * rowHeight;

                // Center vertically if possible
                const containerHeight = sidebarContentRef.current.clientHeight;
                const centeredScrollTop = Math.max(0, scrollTop - containerHeight / 2 + rowHeight / 2);

                sidebarContentRef.current.scrollTo({ top: centeredScrollTop, behavior: 'smooth' });
                scrollContainerRef.current.scrollTo({ top: centeredScrollTop, behavior: 'smooth' });

                // Scroll timeline horizontal
                const task = timelineTasks[taskIndex];
                const startX = getXPosition(task.start);
                const endX = getXPosition(task.end);
                const centerX = startX + (endX - startX) / 2;
                const containerWidth = scrollContainerRef.current.clientWidth;

                const centeredScrollLeft = Math.max(0, centerX - containerWidth / 2);

                scrollContainerRef.current.scrollTo({
                    top: centeredScrollTop,
                    left: centeredScrollLeft,
                    behavior: 'smooth'
                });

                setScrollLeft(centeredScrollLeft);
            }
        }
    }, [selectedNodeIds, timelineTasks, getXPosition]);

    if (timelineTasks.length === 0) {
        return (
            <div className="h-full bg-[var(--bg-main)] border-t border-[var(--border-color)] flex flex-col items-center justify-center text-gray-500 text-sm relative">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
                <CalendarIcon size={32} className="mb-2 opacity-50" />
                <p>No tasks with dates found.</p>
                <p className="text-xs mt-1 opacity-70">Add Start Date and Due Date to tasks to visualize them here.</p>
            </div>
        );
    }

    // Drag Scroll Logic (Window-based)
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!scrollContainerRef.current) return;

            const deltaX = e.pageX - startX;
            const deltaY = e.pageY - startY;

            scrollContainerRef.current.scrollLeft = initialScrollLeft.current - deltaX;
            scrollContainerRef.current.scrollTop = initialScrollTop.current - deltaY;
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = 'default';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isDragging, startX, startY]);

    return (
        <div className="h-full w-full overflow-hidden bg-[var(--bg-main)] border-t border-[var(--border-color)] flex flex-col relative select-none timeline-container">
            {/* Toolbar */}
            <div className="h-12 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-[var(--bg-sidebar)]">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                        <Layers size={16} className="text-orange-500" />
                        Gantt Chart
                    </h3>
                    <div className="h-4 w-px bg-gray-700" />
                    <div className="flex bg-[var(--input-bg)] rounded-lg p-0.5">
                        {(['day', 'week', 'month'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setViewMode(m)}
                                className={clsx(
                                    "px-3 py-1 text-xs font-medium rounded-md transition-all capitalize",
                                    viewMode === m ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 mr-2">
                        {minDate.toLocaleDateString()} - {maxDate.toLocaleDateString()}
                    </span>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Missing Dates Banner */}
            {timelineTasks.some(t => t.inferred && !['swot', 'pdca', 'prioritization', 'fmea', 'ishikawa', 'fiveWTwoH', 'meeting', 'projectCharter', 'stakeholderMatrix', 'wbs', 'external', 'document', 'decision'].includes(t.type || '')) && (
                <div className="bg-[var(--warning-bg)] border-b border-[var(--warning-border)] px-4 py-2 flex items-center gap-4 overflow-hidden">
                    <div className="flex items-center gap-2 text-[var(--warning-text)] text-xs flex-shrink-0 whitespace-nowrap">
                        <ShieldAlert size={14} className="text-orange-500" />
                        <span className="font-semibold">Attention:</span>
                        <span>{timelineTasks.filter(t => t.inferred && !['swot', 'pdca', 'prioritization', 'fmea', 'ishikawa', 'fiveWTwoH', 'meeting', 'projectCharter', 'stakeholderMatrix', 'wbs', 'external', 'document', 'decision'].includes(t.type || '')).length} tasks are missing dates (shown with inferred dates):</span>
                    </div>

                    <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar mask-linear-fade scroll-smooth">
                        {timelineTasks
                            .filter(t => t.inferred && !['swot', 'pdca', 'prioritization', 'fmea', 'ishikawa', 'fiveWTwoH', 'meeting', 'projectCharter', 'stakeholderMatrix', 'wbs', 'external', 'document', 'decision'].includes(t.type || ''))
                            .map(task => (
                                <button
                                    key={task.id}
                                    onClick={() => onTaskClick?.(task.id)}
                                    className="text-[10px] bg-[var(--warning-bg)] hover:bg-[var(--warning-border)] text-[var(--warning-text)] px-2 py-1 rounded transition-colors whitespace-nowrap flex-shrink-0 max-w-[150px] truncate border border-[var(--warning-border)]"
                                    title={task.label}
                                >
                                    {task.label}
                                </button>
                            ))}
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden relative min-w-0">
                {/* Sidebar */}
                <div
                    className="flex-shrink-0 flex flex-col border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] z-20 relative"
                    style={{ width: sidebarWidth }}
                >
                    <div className="h-10 border-b border-[var(--border-color)] flex items-center px-4 text-xs font-semibold text-gray-500 bg-[var(--bg-sidebar)]">
                        Task Name
                    </div>
                    <div
                        ref={sidebarContentRef}
                        className="flex-1 overflow-hidden"
                    >
                        {timelineTasks.map((task) => (
                            <div
                                key={task.id}
                                className={clsx(
                                    "h-10 flex items-center px-4 border-b border-[var(--border-color)] text-xs text-[var(--text-main)] opacity-80 hover:opacity-100 hover:bg-white/5 cursor-pointer transition-colors truncate",
                                    selectedNodeIds.includes(task.id) && "bg-blue-500/20 text-blue-300 border-l-2 border-l-blue-500"
                                )}
                                onClick={() => onTaskClick?.(task.id)}
                                title={task.label}
                            >
                                {task.label}
                            </div>
                        ))}
                    </div>
                    <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-30"
                        onMouseDown={() => setIsResizing(true)}
                    />
                </div>

                {/* Gantt Chart Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
                    {/* Header (Dates) */}
                    <div
                        className="h-10 border-b border-[var(--border-color)] flex-shrink-0 relative bg-[var(--bg-sidebar)] z-10 overflow-hidden"
                    >
                        <div
                            className="absolute top-0 left-0 h-full"
                            style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}
                        >
                            {gridLines.map((line, i) => {
                                const left = getXPosition(line.date);
                                return (
                                    <div
                                        key={i}
                                        className={clsx(
                                            "absolute top-0 bottom-0 flex items-center pl-2 text-[10px] border-l border-[var(--border-color)] truncate",
                                            line.isMajor ? "text-[var(--text-main)] font-medium border-gray-500" : "text-gray-500",
                                            viewMode === 'month' && !line.isMajor && "hidden" // Hide non-1st days in month view
                                        )}
                                        style={{
                                            left,
                                            width: viewMode === 'month' ? columnWidth * 30 : columnWidth * (viewMode === 'week' ? 7 : 1)
                                        }}
                                    >
                                        {line.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div
                        ref={scrollContainerRef}
                        className={clsx(
                            "flex-1 overflow-auto relative w-full no-scrollbar",
                            isDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                        onScroll={(e) => {
                            if (sidebarContentRef.current) {
                                sidebarContentRef.current.scrollTop = e.currentTarget.scrollTop;
                            }
                            // Sync header scroll
                            setScrollLeft(e.currentTarget.scrollLeft);
                        }}
                        onMouseDown={(e) => {
                            // Only left mouse button
                            if (e.button !== 0) return;

                            // Prevent dragging if clicking on a task (simple check)
                            if ((e.target as HTMLElement).closest('[data-task-id]')) return;

                            if (!scrollContainerRef.current) return;
                            setIsDragging(true);
                            setStartX(e.pageX);
                            setStartY(e.pageY);
                            // Store initial scroll positions
                            initialScrollLeft.current = scrollContainerRef.current.scrollLeft;
                            initialScrollTop.current = scrollContainerRef.current.scrollTop;

                            document.body.style.cursor = 'grabbing';
                        }}
                    >
                        {/* Grid Lines */}
                        <div
                            className="relative"
                            style={{ width: totalWidth, height: Math.max(timelineTasks.length * 40, 300) }}
                        >
                            <div className="absolute inset-0 pointer-events-none">
                                {gridLines.map((line, i) => (
                                    <div
                                        key={`v-${i}`}
                                        className={clsx(
                                            "absolute top-0 bottom-0 border-l",
                                            line.isMajor ? "border-[var(--border-color)]" : "border-[var(--border-color)] opacity-30",
                                            viewMode === 'month' && !line.isMajor && "hidden"
                                        )}
                                        style={{ left: getXPosition(line.date) }}
                                    />
                                ))}
                                {/* Horizontal Rows (Alternating Colors) */}
                                {timelineTasks.map((_, i) => (
                                    <div
                                        key={`row-${i}`}
                                        className={clsx(
                                            "absolute left-0 right-0 border-b border-[var(--border-color)] opacity-30 transition-colors",
                                            selectedNodeIds.includes(timelineTasks[i].id)
                                                ? "bg-blue-500/10"
                                                : i % 2 === 0 ? "bg-[var(--text-main)] opacity-[0.03]" : "bg-transparent"
                                        )}
                                        style={{ top: i * 40, height: 40 }}
                                    />
                                ))}
                            </div>

                            {/* Today Marker */}
                            {(() => {
                                const now = new Date();
                                if (now >= minDate && now <= maxDate) {
                                    return (
                                        <div
                                            className="absolute top-0 bottom-0 w-px bg-orange-500 z-10 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                            style={{ left: getXPosition(now) }}
                                        >
                                            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-orange-500" />
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Timeline Tasks */}
                            {timelineTasks.map((task, i) => {
                                const startX = getXPosition(task.start);
                                const endX = getXPosition(task.end);
                                const width = Math.max(4, endX - startX);
                                const left = startX;
                                const ROW_HEIGHT = 40;

                                return (
                                    <div
                                        key={task.id}
                                        className="absolute h-10 flex items-center group pointer-events-none"
                                        style={{ top: i * ROW_HEIGHT, left: 0, right: 0 }}
                                    >
                                        {/* Render Icon for Analysis Types, Bar for others */}
                                        {['swot', 'pdca', 'prioritization', 'fmea', 'ishikawa', 'fiveWTwoH', 'meeting', 'projectCharter', 'stakeholderMatrix', 'wbs', 'external', 'document', 'decision'].includes(task.type || '') ? (
                                            <div
                                                className={clsx(
                                                    "absolute flex items-center justify-center w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--border-color)] shadow-lg cursor-pointer hover:scale-110 transition-transform z-10 pointer-events-auto",
                                                    task.dimmed && "opacity-30 grayscale"
                                                )}
                                                style={{ left }}
                                                onClick={() => onTaskClick?.(task.id)}
                                                onMouseEnter={(e) => setHoveredTask({ ...task, x: e.clientX, y: e.clientY })}
                                                onMouseLeave={() => setHoveredTask(null)}
                                            >
                                                {task.type === 'swot' && <Target size={16} className="text-green-400" />}
                                                {task.type === 'pdca' && <RotateCw size={16} className="text-purple-400" />}
                                                {task.type === 'prioritization' && <BarChart3 size={16} className="text-yellow-400" />}
                                                {task.type === 'fmea' && <ShieldAlert size={16} className="text-red-400" />}
                                                {task.type === 'ishikawa' && <Fish size={16} className="text-teal-400" />}
                                                {task.type === 'fiveWTwoH' && <HelpCircle size={16} className="text-blue-400" />}
                                                {task.type === 'meeting' && <CalendarIcon size={16} className="text-orange-400" />}
                                                {task.type === 'projectCharter' && <Layers size={16} className="text-indigo-400" />}
                                                {task.type === 'stakeholderMatrix' && <Users size={16} className="text-pink-400" />}
                                                {task.type === 'wbs' && <Network size={16} className="text-emerald-400" />}
                                                {task.type === 'external' && <Globe size={16} className="text-sky-400" />}
                                                {task.type === 'document' && <FileText size={16} className="text-slate-400" />}
                                                {task.type === 'decision' && <GitBranch size={16} className="text-amber-400" />}
                                            </div>
                                        ) : (
                                            <div
                                                className={clsx(
                                                    "h-6 rounded-md shadow-sm relative transition-all cursor-pointer flex items-center px-2 pointer-events-auto",
                                                    task.status === 'completed' || task.status === 'done' ? "bg-green-600/80 hover:bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] border border-green-400/50 z-10" :
                                                        task.status === 'in-progress' ? "bg-blue-600/80 hover:bg-blue-500" :
                                                            task.status === 'blocked' ? "bg-red-600/80 hover:bg-red-500" :
                                                                "bg-gray-600/80 hover:bg-gray-500",
                                                    selectedNodeIds.includes(task.id) && "ring-2 ring-white ring-offset-1 ring-offset-[#121212]",
                                                    task.end < new Date() && task.status !== 'completed' && "ring-2 ring-red-500 ring-offset-1 ring-offset-[#121212]",
                                                    task.dimmed && "opacity-30 grayscale"
                                                )}
                                                style={{ left, width }}
                                                onClick={() => onTaskClick?.(task.id)}
                                                onMouseEnter={(e) => setHoveredTask({ ...task, x: e.clientX, y: e.clientY })}
                                                onMouseLeave={() => setHoveredTask(null)}
                                            >
                                                {width > 30 && (
                                                    <span className="text-[10px] text-white font-medium truncate drop-shadow-md">
                                                        {task.label}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {hoveredTask && (
                <div
                    className="fixed z-50 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] text-xs p-2 rounded-lg shadow-xl pointer-events-none"
                    style={{ left: hoveredTask.x + 15, top: hoveredTask.y }}
                >
                    <div className="font-semibold mb-1">{hoveredTask.label}</div>
                    {!['swot', 'pdca', 'prioritization', 'fmea', 'ishikawa', 'fiveWTwoH', 'projectCharter', 'stakeholderMatrix', 'wbs', 'external', 'document', 'decision'].includes(hoveredTask.type || '') && (
                        <div className="text-gray-400 flex flex-col gap-0.5">
                            <span>Start: {hoveredTask.start.toLocaleDateString()}</span>
                            <span>Due: {hoveredTask.end.toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
