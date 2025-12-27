import { clsx } from 'clsx';
import { Clock, AlertCircle, CheckCircle2, Circle, CheckSquare, Flame, ArrowUp, ArrowDown, Minus, AlertTriangle, Paperclip } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { useState, useEffect, useRef, useLayoutEffect, memo } from 'react';

const statusColors: Record<string, string> = {
    'pending': 'bg-gray-500',
    'in-progress': 'bg-blue-500',
    'in_progress': 'bg-blue-500',
    'completed': 'bg-green-500',
    'done': 'bg-green-500',
    'blocked': 'bg-red-500',
    'in_review': 'bg-purple-500',
};

const statusIcons: Record<string, any> = {
    'pending': Circle,
    'in-progress': Clock,
    'in_progress': Clock,
    'completed': CheckCircle2,
    'done': CheckCircle2,
    'blocked': AlertCircle,
    'in_review': Clock,
};

interface TaskNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
    onConflictClick?: (assignee: string) => void;
}

export const TaskNode = memo(function TaskNode({ node, selected, onConnectionStart, onConflictClick }: TaskNodeProps) {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const updateNodeDimensions = useStore((state) => state.updateNodeDimensions);


    const taskData = node.data;
    const StatusIcon = (taskData.status && statusIcons[taskData.status]) || Circle;
    const [localLabel, setLocalLabel] = useState(taskData.label);
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Auto-resize logic
    useLayoutEffect(() => {
        if (contentRef.current) {
            const { offsetHeight } = contentRef.current;
            // Add some padding/buffer to dimensions if needed, or just use offsetHeight
            // The node width is fixed (256 or 300 etc), but height should be dynamic
            const newHeight = Math.max(100, offsetHeight); // Minimum height 100

            if (node.height !== newHeight) {
                updateNodeDimensions(node.id, { width: node.width || 200, height: newHeight });
            }
        }
    }, [taskData, node.width, node.height, updateNodeDimensions, node.id]);

    useEffect(() => {
        setLocalLabel(taskData.label);
    }, [taskData.label]);

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalLabel(e.target.value);
    };

    const handleLabelSubmit = () => {
        if (localLabel.trim() !== taskData.label) {
            updateNodeData(node.id, { label: localLabel });
        }
    };





    return (
        <div
            className={clsx(
                "relative w-full h-full group rounded-lg",
                // Priority Heatmap/Glow - Applied to OUTER container to avoid clipping
                // Disable if completed
                (taskData.status !== 'completed' && taskData.status !== 'done') && taskData.priority === 'critical' && "shadow-[0_0_30px_rgba(239,68,68,0.9)] ring-2 ring-red-500 animate-pulse",
                (taskData.status !== 'completed' && taskData.status !== 'done') && taskData.priority === 'high' && "shadow-[0_0_25px_rgba(249,115,22,0.8)] ring-1 ring-orange-500",
                (taskData.status !== 'completed' && taskData.status !== 'done') && taskData.priority === 'medium' && "shadow-[0_0_15px_rgba(234,179,8,0.6)]",
                // Only apply default shadow if no priority is set or if completed (with green glow)
                (taskData.status === 'completed' || taskData.status === 'done') && "shadow-[0_0_20px_rgba(34,197,94,0.6)] ring-1 ring-green-500/50",
                (!taskData.priority && taskData.status !== 'completed' && taskData.status !== 'done') && "shadow-lg",
                // Active Today Highlight
                (() => {
                    if (!taskData.startDate || !taskData.dueDate) return false;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const start = new Date(taskData.startDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(taskData.dueDate);
                    end.setHours(0, 0, 0, 0);
                    return today >= start && today <= end;
                })() && "ring-2 ring-orange-500 ring-offset-2 ring-offset-[var(--bg-main)] shadow-[0_0_20px_rgba(249,115,22,0.4)]"
            )}
        >
            {/* Visual Container - Handles Border, Background, Overflow */}
            <div
                className={clsx(
                    "transition-all relative h-full overflow-hidden rounded-lg",
                    "border-2",
                    selected ? "border-orange-500" : "border-[var(--border-color)] hover:border-gray-600"
                )}
                style={{
                    backgroundColor: taskData.color || 'var(--input-bg)'
                }}
            >
                {/* External Task Indicator (SAP) */}
                {taskData.tags?.includes('External') && (
                    <div className="absolute top-0 right-0 p-1 z-20">
                        <div className="bg-blue-900/80 text-blue-200 text-[8px] px-1 rounded border border-blue-700">
                            EXT
                        </div>
                    </div>
                )}

                {/* Status Bar */}
                <div className={clsx("h-1 w-full absolute top-0 left-0 z-10 rounded-t-md", (taskData.status && statusColors[taskData.status]) || 'bg-gray-500')} />



                <div className="" ref={contentRef}>
                    <div className="p-3 pt-4">
                        <div className="flex items-start gap-3 mb-1">
                            <div className="flex-1 min-w-0">
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={localLabel}
                                            onChange={handleLabelChange}
                                            onBlur={() => {
                                                handleLabelSubmit();
                                                setIsEditing(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleLabelSubmit();
                                                    setIsEditing(false);
                                                }
                                            }}
                                            className="font-semibold text-[var(--text-main)] text-sm bg-transparent border-none outline-none w-full p-0 focus:ring-0 cursor-text placeholder-[var(--text-muted)]"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div
                                            className="font-semibold text-[var(--text-main)] text-sm w-full cursor-pointer min-h-[20px] select-none"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditing(true);
                                            }}
                                        >
                                            {localLabel}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <StatusIcon size={14} className={clsx(
                                    (taskData.status === 'pending' || !taskData.status) && "text-gray-400",
                                    (taskData.status === 'in-progress' || taskData.status === 'in_progress') && "text-blue-400",
                                    (taskData.status === 'completed' || taskData.status === 'done') && "text-green-400",
                                    taskData.status === 'blocked' && "text-red-400",
                                    taskData.status === 'in_review' && "text-purple-400",
                                )} />
                                {(taskData.startDate || taskData.dueDate) && (
                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                                        {(() => {
                                            const formatDate = (dateStr: string) => {
                                                // Append T12:00:00 to avoid timezone shifts when parsing YYYY-MM-DD
                                                const date = new Date(`${dateStr}T12:00:00`);
                                                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                            };

                                            if (taskData.startDate && taskData.dueDate) {
                                                return `${formatDate(taskData.startDate)} - ${formatDate(taskData.dueDate)}`;
                                            }
                                            if (taskData.startDate) {
                                                return `Starts: ${formatDate(taskData.startDate)}`;
                                            }
                                            return `Due: ${formatDate(taskData.dueDate!)}`;
                                        })()}
                                    </span>
                                )}
                            </div>
                            {taskData.assignee && (
                                <div className="flex items-center gap-1.5">
                                    {/* Overlap Warning */}
                                    {(() => {
                                        if (!taskData.startDate || !taskData.dueDate) return null;

                                        const allNodes = useStore.getState().nodes;
                                        const myStart = new Date(taskData.startDate).getTime();
                                        const myEnd = new Date(taskData.dueDate).getTime();

                                        const hasOverlap = allNodes.some(n => {
                                            if (n.id === node.id || n.type !== 'task' || n.data.assignee !== taskData.assignee) return false;
                                            if (!n.data.startDate || !n.data.dueDate) return false;

                                            const otherStart = new Date(n.data.startDate).getTime();
                                            const otherEnd = new Date(n.data.dueDate).getTime();

                                            return (myStart < otherEnd && myEnd > otherStart);
                                        });

                                        if (hasOverlap) {
                                            return (
                                                <div
                                                    className="text-red-500 animate-pulse cursor-pointer hover:scale-110 transition-transform"
                                                    title="Assignee has overlapping tasks! Click to focus."
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onConflictClick?.(taskData.assignee!);
                                                    }}
                                                >
                                                    <AlertCircle size={18} strokeWidth={2.5} />
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="flex items-center gap-1.5 bg-[var(--bg-main)] pl-1.5 pr-2 py-0.5 rounded-full border border-[var(--border-color)]">
                                        {/* Priority Icon */}
                                        {(() => {
                                            const priority = taskData.priority || 'low';
                                            switch (priority) {
                                                case 'critical':
                                                    return <Flame size={12} className="text-red-500" fill="currentColor" fillOpacity={0.2} />;
                                                case 'high':
                                                    return <AlertTriangle size={12} className="text-orange-500" />;
                                                case 'medium':
                                                    return <ArrowUp size={12} className="text-blue-400" />;
                                                case 'low':
                                                    return <ArrowDown size={12} className="text-gray-400" />;
                                                default:
                                                    return <Minus size={12} className="text-gray-500" />;
                                            }
                                        })()}

                                        {/* Full Name */}
                                        <span className="text-[10px] text-[var(--text-main)] font-medium max-w-[80px] truncate">
                                            {taskData.assignee}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Attachment Indicator */}
                            {taskData.attachments && taskData.attachments.length > 0 && (
                                <div className="flex items-center gap-1 text-gray-400" title={`${taskData.attachments.length} attachment(s)`}>
                                    <Paperclip size={12} />
                                    <span className="text-[10px] font-medium bg-[var(--input-bg)] px-1.5 py-0.5 rounded-full">
                                        {taskData.attachments.length}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Tags */}
                        {taskData.tags && taskData.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {taskData.tags.map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-[var(--input-bg)] text-gray-300 text-[10px] rounded border border-[var(--border-color)]">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {taskData.description && (
                            <p className="text-xs text-[var(--text-muted)] mb-2 break-words">
                                {taskData.description}
                            </p>
                        )}

                        {/* Footer Info: Time & Progress */}
                        <div className="flex flex-col gap-1 mt-auto">
                            {/* Time Estimation */}
                            {(taskData.estimatedHours || taskData.actualHours) && (
                                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                    {taskData.estimatedHours && <span>Est: {taskData.estimatedHours}h</span>}
                                    {taskData.actualHours && (
                                        <span className={clsx(
                                            taskData.estimatedHours && taskData.actualHours > taskData.estimatedHours ? "text-red-400" : "text-gray-400"
                                        )}>
                                            Act: {taskData.actualHours}h
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Progress Bar */}
                            {taskData.checklist && taskData.checklist.length > 0 && (
                                <div className="w-full h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden mt-1">
                                    <div
                                        className="h-full bg-green-500 transition-all duration-300"
                                        style={{
                                            width: `${(taskData.checklist.filter(i => i.done).length / taskData.checklist.length) * 100}%`
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Checklist rendering - Positioned relative to the wrapper, visible for ALL shapes now */}
            {
                taskData.checklist && taskData.checklist.length > 0 && (
                    <div className={clsx(
                        "absolute left-0 w-64 mt-2 bg-[var(--bg-sidebar)] rounded-md p-2 shadow-md border border-[var(--border-color)] z-10",
                        "top-full"
                    )}>
                        <div className="space-y-1">
                            {taskData.checklist.map(item => (
                                <div key={item.id} className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                                    <button
                                        className={clsx(
                                            "w-3 h-3 rounded border flex items-center justify-center transition-colors",
                                            item.done ? "bg-green-500 border-green-500" : "border-gray-600 hover:border-gray-500"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newChecklist = taskData.checklist?.map(i =>
                                                i.id === item.id ? { ...i, done: !i.done } : i
                                            );
                                            updateNodeData(node.id, { checklist: newChecklist });
                                        }}
                                    >
                                        {item.done && <CheckSquare size={8} className="text-white" />}
                                    </button>
                                    <span className={clsx(item.done && "line-through text-gray-500")}>{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Left Connection Point (Target) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-500 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-left-1.5 top-1/2 -translate-y-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="target"
                data-handle-id="left"
            />

            {/* Right Connection Point (Source) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-500 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-right-1.5 top-1/2 -translate-y-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="source"
                data-handle-id="right"
                onMouseDown={(e) => {
                    e.stopPropagation(); // Stop D3 drag
                    e.preventDefault(); // Prevent text selection etc
                    if (onConnectionStart) {
                        onConnectionStart(node.id, 'source', e.clientX, e.clientY, 'right');
                    }
                }}
            />

            {/* Top Connection Point */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-500 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-top-1.5 left-1/2 -translate-x-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="source"
                data-handle-id="top"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onConnectionStart) {
                        onConnectionStart(node.id, 'source', e.clientX, e.clientY, 'top');
                    }
                }}
            />

            {/* Bottom Connection Point */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-500 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-bottom-1.5 left-1/2 -translate-x-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="source"
                data-handle-id="bottom"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onConnectionStart) {
                        onConnectionStart(node.id, 'source', e.clientX, e.clientY, 'bottom');
                    }
                }}
            />

            {/* Resize Handle (Bottom Right) */}
            <div
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity resize-handle"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startWidth = node.width || 256;
                    const startHeight = node.height || 100;

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                        const scale = useStore.getState().transform.k || 1;
                        const deltaX = (moveEvent.clientX - startX) / scale;
                        const deltaY = (moveEvent.clientY - startY) / scale;

                        const newWidth = Math.max(150, startWidth + deltaX);
                        const newHeight = Math.max(80, startHeight + deltaY);

                        updateNodeDimensions(node.id, { width: newWidth, height: newHeight });
                    };

                    const handleMouseUp = () => {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                    };

                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                }}
            >
                <div className="w-2 h-2 bg-gray-500 rounded-sm" />
            </div>
        </div >
    );
});
