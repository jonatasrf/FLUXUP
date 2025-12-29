import { useRef, useLayoutEffect } from 'react';
import { Activity, Link as LinkIcon, ExternalLink, CheckSquare, Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { type Node, useStore } from '../../store/store';
import { NodeHandles } from './NodeHandles';


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

interface ExternalNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export function ExternalNode({ node, selected, onConnectionStart }: ExternalNodeProps) {
    const updateNodeDimensions = useStore(state => state.updateNodeDimensions);
    const updateNodeData = useStore(state => state.updateNodeData);
    const contentRef = useRef<HTMLDivElement>(null);

    // Auto-resize logic
    useLayoutEffect(() => {
        if (contentRef.current) {
            const { offsetWidth, offsetHeight } = contentRef.current;
            const newWidth = Math.max(200, offsetWidth);
            const newHeight = offsetHeight;

            if (Math.abs((node.width || 200) - newWidth) > 5 || Math.abs((node.height || 100) - newHeight) > 5) {
                updateNodeDimensions(node.id, { width: newWidth, height: newHeight });
            }
        }
    }, [node.data, node.width, node.height, updateNodeDimensions, node.id]);



    const StatusIcon = (node.data.status && statusIcons[node.data.status]) || Circle;

    return (
        <div
            className={clsx(
                "relative group flex flex-col bg-[var(--card-bg)] rounded-lg shadow-md border-2 transition-all duration-200",
                selected ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "border-[var(--border-color)] hover:border-blue-300"
            )}
            style={{
                minWidth: '200px',
                maxWidth: '400px'
            }}
        >
            {/* Status Bar */}
            <div className={clsx("h-1.5 w-full absolute top-0 left-0 z-10", (node.data.status && statusColors[node.data.status]) || 'bg-gray-500')} />

            {/* Content Container for measuring */}
            <div ref={contentRef} className="p-3 pt-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                        <Activity size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--text-main)] text-sm leading-tight break-words">
                            {node.data.label || "External Action"}
                        </h3>
                        {node.data.externalSystem && (
                            <div className="mt-1">
                                <span className="inline-block px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                                    {node.data.externalSystem}
                                </span>
                            </div>
                        )}
                        {node.data.url && (
                            <a
                                href={node.data.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1 break-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <LinkIcon size={10} className="flex-shrink-0" />
                                <span className="break-all">{node.data.url}</span>
                                <ExternalLink size={10} className="flex-shrink-0" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Status Icon Display */}
                <div className="flex items-center gap-2 mt-2 mb-1">
                    <StatusIcon size={14} className={clsx(
                        (node.data.status === 'pending' || !node.data.status) && "text-gray-400",
                        (node.data.status === 'in-progress' || node.data.status === 'in_progress') && "text-blue-500",
                        (node.data.status === 'completed' || node.data.status === 'done') && "text-green-500",
                        node.data.status === 'blocked' && "text-red-500",
                        node.data.status === 'in_review' && "text-purple-500",
                    )} />
                    <span className="text-xs text-[var(--text-muted)] capitalize">
                        {node.data.status?.replace('-', ' ') || 'Pending'}
                    </span>
                </div>

                {node.data.description && (
                    <div className="mt-2 text-xs text-[var(--text-muted)] break-words">
                        {node.data.description}
                    </div>
                )}

                {/* Checklist rendering */}
                {node.data.checklist && node.data.checklist.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[var(--border-color)] space-y-1">
                        {node.data.checklist.map(item => (
                            <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                                <button
                                    className={clsx(
                                        "w-3 h-3 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                                        item.done ? "bg-blue-500 border-blue-500" : "border-[var(--border-color)] hover:border-blue-500"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newChecklist = node.data.checklist?.map(i =>
                                            i.id === item.id ? { ...i, done: !i.done } : i
                                        );
                                        updateNodeData(node.id, { checklist: newChecklist });
                                    }}
                                >
                                    {item.done && <CheckSquare size={8} className="text-white" />}
                                </button>
                                <span className={clsx(item.done && "line-through opacity-50", "break-words text-[var(--text-main)] text-xs")}>{item.text}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />

        </div>
    );
}
