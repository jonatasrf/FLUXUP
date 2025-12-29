import { memo, useCallback, useEffect, useRef } from 'react';
import { GitMerge, Plus, Trash2 } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { NodeHandles } from './NodeHandles';
import { clsx } from 'clsx';


interface WBSNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export const WBSNode = memo(({ node, selected, onConnectionStart }: WBSNodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const updateNodeDimensions = useStore((state) => state.updateNodeDimensions);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!nodeRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { inlineSize: width, blockSize: height } = entry.borderBoxSize[0];
                updateNodeDimensions(node.id, { width, height });
            }
        });

        observer.observe(nodeRef.current);
        return () => observer.disconnect();
    }, [node.id, updateNodeDimensions]);
    const data = node.data.wbs || {
        items: []
    };

    const items = data.items || [];

    const handleChange = useCallback((newItems: typeof items) => {
        updateNodeData(node.id, {
            wbs: {
                ...node.data.wbs,
                items: newItems
            } as any
        });
    }, [node.id, node.data.wbs, updateNodeData]);

    const handleAddItem = () => {
        const newItem = {
            id: crypto.randomUUID(),
            code: `${items.length + 1}`,
            name: '',
            cost: '',
            responsible: ''
        };
        handleChange([...items, newItem]);
    };

    const handleUpdateItem = (id: string, field: string, value: any) => {
        const newItems = items.map(i =>
            i.id === id ? { ...i, [field]: value } : i
        );
        handleChange(newItems);
    };

    const handleRemoveItem = (id: string) => {
        const newItems = items.filter(i => i.id !== id);
        handleChange(newItems);
    };

    const totalCost = items.reduce((acc, item) => {
        const cost = parseFloat(item.cost) || 0;
        return acc + cost;
    }, 0);

    return (
        <div
            ref={nodeRef}
            className={clsx(
                "w-[600px] bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group font-sans flex flex-col",
                selected ? "border-blue-500 shadow-blue-500/20" : "border-[var(--border-color)]"
            )}
        >
            {/* Header */}
            <div className="px-4 py-3 rounded-t-lg flex items-center justify-between border-b bg-[var(--header-bg)] border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <GitMerge size={18} className="text-emerald-400" />
                    <span className="font-semibold text-sm text-[var(--text-main)] uppercase tracking-wide">
                        WBS / EAP
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs text-[var(--text-muted)]">
                        Total: <span className="text-emerald-400 font-bold">${totalCost.toLocaleString()}</span>
                    </div>
                    <button
                        onClick={handleAddItem}
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded hover:bg-emerald-500/30 transition-colors"
                    >
                        <Plus size={12} /> Add Item
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* List View */}
                {items.length > 0 ? (
                    <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-[var(--text-muted)] font-bold mb-2 px-2">
                            <div className="col-span-2">Code</div>
                            <div className="col-span-5">Deliverable Name</div>
                            <div className="col-span-2">Cost</div>
                            <div className="col-span-2">Responsible</div>
                            <div className="col-span-1"></div>
                        </div>
                        {items.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-[var(--bg-main)] p-2 rounded border border-[var(--border-color)] hover:border-gray-600 transition-colors group/item">
                                <div className="col-span-2">
                                    <input
                                        type="text"
                                        className="w-full bg-transparent text-[var(--text-muted)] text-xs focus:outline-none nodrag font-mono"
                                        placeholder="1.0"
                                        value={item.code}
                                        onChange={(e) => handleUpdateItem(item.id, 'code', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-5">
                                    <input
                                        type="text"
                                        className="w-full bg-transparent text-[var(--text-main)] text-sm focus:outline-none nodrag font-medium"
                                        placeholder="Deliverable..."
                                        value={item.name}
                                        onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="text"
                                        className="w-full bg-[var(--input-bg)] rounded px-2 py-1 text-[var(--text-main)] text-xs focus:outline-none focus:border-emerald-500 border border-[var(--input-border)] nodrag text-right"
                                        placeholder="0.00"
                                        value={item.cost}
                                        onChange={(e) => handleUpdateItem(item.id, 'cost', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input
                                        type="text"
                                        className="w-full bg-transparent text-[var(--text-muted)] text-xs focus:outline-none nodrag"
                                        placeholder="Name..."
                                        value={item.responsible}
                                        onChange={(e) => handleUpdateItem(item.id, 'responsible', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all p-1"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8 text-sm italic border-2 border-dashed border-[var(--border-color)] rounded">
                        No items in Work Breakdown Structure.
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
});
