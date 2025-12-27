import { memo, useState } from 'react';
import { useStore, type Node } from '../store/store';
import { clsx } from 'clsx';
import {
    CheckCircle2, Circle, Clock, AlertCircle,
    FileText, StickyNote, Activity, Target,
    ShieldAlert, Fish, RotateCw, HelpCircle, BarChart3
} from 'lucide-react';

interface KanbanBoardProps {
    onNodeClick: (node: Node) => void;
}

const COLUMNS = [
    { id: 'pending', label: 'To Do', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    { id: 'in-progress', label: 'Doing', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'completed', label: 'Done', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' }
] as const;

const getNodeIcon = (type: string) => {
    switch (type) {
        case 'decision': return Activity;
        case 'document': return FileText;
        case 'note': return StickyNote;
        case 'external': return AlertCircle;
        case 'fmea': return ShieldAlert;
        case 'ishikawa': return Fish;
        case 'pdca': return RotateCw;
        case 'fiveWTwoH': return HelpCircle;
        case 'swot': return Target;
        case 'prioritization': return BarChart3;
        default: return CheckCircle2;
    }
};

export const KanbanBoard = memo(({ onNodeClick }: KanbanBoardProps) => {
    const nodes = useStore((state) => state.nodes);
    const updateNodeData = useStore((state) => state.updateNodeData);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

    // Filter to exclude notes, documents, and decisions (keep tasks and analytical nodes)
    const kanbanNodes = nodes.filter(n => n.type !== 'note' && n.type !== 'document' && n.type !== 'decision');

    // We map 'default' status to 'pending' if missing
    const getColumnId = (status?: string) => {
        if (status === 'completed') return 'completed';
        if (status === 'in-progress') return 'in-progress';
        return 'pending';
    };

    const handleDragStart = (e: React.DragEvent, nodeId: string) => {
        setDraggedNodeId(nodeId);
        e.dataTransfer.effectAllowed = 'move';
        // Set transparent drag image or custom one if needed
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (draggedNodeId) {
            // @ts-ignore
            updateNodeData(draggedNodeId, { status: targetStatus });
            setDraggedNodeId(null);
        }
    };

    return (
        <div className="absolute inset-0 bg-[var(--bg-main)] p-8 overflow-x-auto transition-colors">
            <div className="flex gap-6 h-full min-w-[1000px]">
                {COLUMNS.map((col) => (
                    <div
                        key={col.id}
                        className={clsx(
                            "flex-1 flex flex-col rounded-xl border bg-[var(--bg-sidebar)] min-w-[300px]",
                            col.border
                        )}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        {/* Column Header */}
                        <div className={clsx("p-4 border-b flex items-center gap-2", col.border, col.bg)}>
                            <col.icon size={18} className={col.color} />
                            <h3 className="font-bold text-gray-200">{col.label}</h3>
                            <span className="ml-auto text-xs font-mono bg-black/20 px-2 py-1 rounded text-gray-400">
                                {kanbanNodes.filter(n => getColumnId(n.data.status) === col.id).length}
                            </span>
                        </div>

                        {/* Column Content */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                            {kanbanNodes
                                .filter(n => getColumnId(n.data.status) === col.id)
                                .map(node => {
                                    const Icon = getNodeIcon(node.type || 'task');
                                    return (
                                        <div
                                            key={node.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, node.id)}
                                            onClick={() => onNodeClick(node)}
                                            className={clsx(
                                                "bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--border-color)] shadow-sm cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all group",
                                                draggedNodeId === node.id ? "opacity-50" : "opacity-100"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={clsx("p-2 rounded bg-black/20 text-gray-400", col.color)}>
                                                    <Icon size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-[var(--text-main)] leading-tight mb-1 break-words">
                                                        {node.data.label || 'Untitled Node'}
                                                    </h4>
                                                    {node.data.description && (
                                                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                                                            {node.data.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-2 mt-2">
                                                        {node.data.assignee && (
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-black/20 px-1.5 py-0.5 rounded">
                                                                <div className="w-3 h-3 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-[8px]">
                                                                    {node.data.assignee.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="truncate max-w-[80px]">{node.data.assignee}</span>
                                                            </div>
                                                        )}
                                                        {node.data.dueDate && (
                                                            <div className="text-[10px] text-gray-500 bg-black/20 px-1.5 py-0.5 rounded ml-auto">
                                                                {node.data.dueDate}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
