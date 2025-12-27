import { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { clsx } from 'clsx';
import { Plus } from 'lucide-react';
import { useStore, type Node } from '../store/store';
import { nodeRegistry } from '../registry/NodeRegistry';

interface DraggableNodeProps {
    node: Node;
    onConnectionStart: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
    onAddBranch: (nodeId: string, handleId?: string) => void;
    onConflictClick?: (assignee: string) => void;
    className?: string;
}

export const DraggableNode = memo(function DraggableNode({
    node,
    onConnectionStart,
    onAddBranch,
    onConflictClick,
    className
}: DraggableNodeProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const updateNodePosition = useStore(state => state.updateNodePosition);
    const setSelectedNodes = useStore(state => state.setSelectedNodes);
    const addSelectedNode = useStore(state => state.addSelectedNode);
    const selectedNodeIds = useStore(state => state.selectedNodeIds);
    const updateNodesPositions = useStore(state => state.updateNodesPositions);
    const [showBranchOptions, setShowBranchOptions] = useState(false);

    const positionRef = useRef(node.position);
    useEffect(() => { positionRef.current = node.position; }, [node.position]);

    useEffect(() => {
        if (!elementRef.current) return;

        const drag = d3.drag<HTMLDivElement, unknown>()
            .filter((event) => {
                const target = event.target as HTMLElement;
                return !target.closest('.connection-handle') &&
                    !target.closest('button') &&
                    !target.closest('input') &&
                    !target.closest('textarea') &&
                    !target.closest('.resize-handle') &&
                    !target.closest('a');
            })
            .subject(() => ({ x: positionRef.current.x, y: positionRef.current.y }))
            .on('start', (event) => {
                if (event.sourceEvent) event.sourceEvent.stopPropagation();
                if (!event.sourceEvent.shiftKey && !selectedNodeIds.includes(node.id)) {
                    setSelectedNodes([node.id]);
                } else if (event.sourceEvent.shiftKey && !selectedNodeIds.includes(node.id)) {
                    addSelectedNode(node.id);
                }
                // Reset first drag flag
                (elementRef.current as any).__isFirstDrag = true;
            })
            .on('drag', (event) => {
                const currentSelectedIds = useStore.getState().selectedNodeIds;
                if (currentSelectedIds.includes(node.id) && currentSelectedIds.length > 1) {
                    const dx = event.dx;
                    const dy = event.dy;
                    const updates = currentSelectedIds.map(id => {
                        const n = useStore.getState().nodes.find(n => n.id === id);
                        if (n) return { id, position: { x: n.position.x + dx, y: n.position.y + dy } };
                        return null;
                    }).filter(Boolean) as { id: string, position: { x: number, y: number } }[];
                    if (updates.length > 0) updateNodesPositions(updates);
                } else {
                    updateNodePosition(node.id, { x: positionRef.current.x + event.dx, y: positionRef.current.y + event.dy });
                }

                // Pause history tracking after first move to avoid flooding undo stack
                if ((elementRef.current as any).__isFirstDrag) {
                    useStore.temporal.getState().pause();
                    (elementRef.current as any).__isFirstDrag = false;
                }
            })
            .on('end', () => {
                useStore.temporal.getState().resume();
            });

        d3.select(elementRef.current).call(drag);
    }, [node.id, updateNodePosition, updateNodesPositions, setSelectedNodes, addSelectedNode, selectedNodeIds]);

    const NodeComponent = nodeRegistry.get(node.type);

    if (!NodeComponent) {
        return (
            <div ref={elementRef} className={clsx("w-full h-full pointer-events-auto group relative p-4 bg-red-100 border border-red-500 rounded", className)}>
                Unknown Node Type: {node.type}
            </div>
        );
    }

    return (
        <div ref={elementRef} className={clsx("w-full h-full pointer-events-auto group relative", className)} onClick={(e) => e.stopPropagation()} onMouseLeave={() => setShowBranchOptions(false)}>
            <NodeComponent
                node={node}
                selected={useStore(state => state.selectedNodeIds.includes(node.id))}
                onConnectionStart={onConnectionStart}
                onAddBranch={onAddBranch}
                onConflictClick={onConflictClick}
            />

            <div
                className="absolute top-1/2 -translate-y-1/2 translate-x-full opacity-0 group-hover:opacity-100 transition-opacity z-50 pl-2"
                style={{
                    right: node.type === 'decision' ? '-48px' :
                        (node.type === 'swot' || node.type === 'prioritization' || node.type === 'ishikawa' || node.type === 'pdca') ? '-6px' :
                            node.type === 'fiveWTwoH' ? '-6px' :
                                node.type === 'fmea' ? '-6px' : '-24px'
                }}
            >
                {node.type === 'decision' ? (
                    <div className="flex flex-col gap-1">
                        {showBranchOptions ? (
                            <>
                                <button
                                    className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-[10px] rounded shadow-lg whitespace-nowrap"
                                    onClick={(e) => { e.stopPropagation(); onAddBranch(node.id, 'yes'); setShowBranchOptions(false); }}
                                >
                                    Yes
                                </button>
                                <button
                                    className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] rounded shadow-lg whitespace-nowrap"
                                    onClick={(e) => { e.stopPropagation(); onAddBranch(node.id, 'no'); setShowBranchOptions(false); }}
                                >
                                    No
                                </button>
                            </>
                        ) : (
                            <button
                                className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                onClick={(e) => { e.stopPropagation(); setShowBranchOptions(true); }}
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        className="w-6 h-6 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); onAddBranch(node.id); }}
                    >
                        <Plus size={16} />
                    </button>
                )}
            </div>
        </div>
    );
});
