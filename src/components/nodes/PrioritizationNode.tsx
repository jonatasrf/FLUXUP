import { memo, useState, useRef, useLayoutEffect } from 'react';
import { Plus, X, BarChart3, ArrowUpDown } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { NodeHandles } from './NodeHandles';
import { clsx } from 'clsx';


interface PrioritizationNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export const PrioritizationNode = memo(({ node, selected, onConnectionStart }: PrioritizationNodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const updateNodeDimensions = useStore((state) => state.updateNodeDimensions);
    const data = node.data;
    const prioritization = data.prioritization || {
        method: 'RICE',
        items: []
    };

    const [newItemLabel, setNewItemLabel] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    // Auto-resize logic
    useLayoutEffect(() => {
        if (contentRef.current) {
            const { offsetHeight } = contentRef.current;
            const newHeight = Math.max(100, offsetHeight);

            // Allow slight variance to avoid infinite loops if pixel rounding issues occur
            if (!node.height || Math.abs(node.height - newHeight) > 2) {
                updateNodeDimensions(node.id, { width: node.width || 600, height: newHeight });
            }
        }
    }, [prioritization, node.height, updateNodeDimensions, node.id, node.width]);

    const calculateScore = (item: any, method: 'RICE' | 'ICE') => {
        if (method === 'RICE') {
            // (Reach * Impact * Confidence) / Effort
            const r = item.reach || 0;
            const i = item.impact || 0;
            const c = (item.confidence || 0) / 100; // Confidence is usually %
            const e = item.effort || 1; // Avoid division by zero
            return Math.round(((r * i * c) / e) * 100) / 100;
        } else {
            // Impact * Confidence * Ease
            const i = item.impact || 0;
            const c = item.confidence || 0;
            const e = item.ease || 0;
            return Math.round(i * c * e * 100) / 100;
        }
    };

    const handleAddItem = () => {
        if (!newItemLabel.trim()) return;
        const newItem = {
            id: crypto.randomUUID(),
            label: newItemLabel,
            reach: 100,
            impact: 3,
            confidence: 100,
            effort: 1,
            ease: 5,
            score: 0
        };
        newItem.score = calculateScore(newItem, prioritization.method);

        const newItems = [...prioritization.items, newItem];
        updateNodeData(node.id, {
            prioritization: {
                ...prioritization,
                items: newItems.sort((a, b) => b.score - a.score)
            }
        });
        setNewItemLabel('');
    };

    const handleUpdateItem = (id: string, field: string, value: number) => {
        const newItems = prioritization.items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                updatedItem.score = calculateScore(updatedItem, prioritization.method);
                return updatedItem;
            }
            return item;
        });
        updateNodeData(node.id, {
            prioritization: {
                ...prioritization,
                items: newItems.sort((a, b) => b.score - a.score)
            }
        });
    };

    const handleRemoveItem = (id: string) => {
        const newItems = prioritization.items.filter(item => item.id !== id);
        updateNodeData(node.id, {
            prioritization: { ...prioritization, items: newItems }
        });
    };

    const toggleMethod = () => {
        const newMethod = prioritization.method === 'RICE' ? 'ICE' : 'RICE';
        const newItems = prioritization.items.map(item => ({
            ...item,
            score: calculateScore(item, newMethod)
        }));
        updateNodeData(node.id, {
            prioritization: {
                method: newMethod,
                items: newItems.sort((a, b) => b.score - a.score)
            }
        });
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(node.id, { label: e.target.value });
    };

    return (
        <div
            className={clsx(
                "w-[600px] bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group overflow-hidden",
                selected ? "border-blue-500 shadow-blue-500/20" : "border-[var(--border-color)]"
            )}
            ref={contentRef}
        >
            {/* Header */}
            <div className="px-4 py-2 bg-[var(--header-bg)] flex items-center justify-between border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-yellow-400" />
                    <span className="font-semibold text-sm text-[var(--text-main)]">Prioritization Matrix</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleMethod}
                        className="text-xs bg-[var(--bg-main)] hover:bg-[var(--bg-sidebar)] px-2 py-1 rounded text-[var(--text-muted)] transition-colors border border-[var(--border-color)]"
                    >
                        Method: <span className="font-bold text-yellow-400">{prioritization.method}</span>
                    </button>
                    <input
                        className="bg-transparent text-right text-[var(--text-muted)] text-xs focus:outline-none focus:text-[var(--text-main)] transition-colors w-32"
                        placeholder="Matrix Title"
                        value={data.label || ''}
                        onChange={handleLabelChange}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="p-4">
                <div className="grid gap-2 mb-4">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-2 text-xs font-bold text-[var(--text-muted)] uppercase px-2">
                        <div className="col-span-4">Item</div>
                        {prioritization.method === 'RICE' ? (
                            <>
                                <div className="col-span-2 text-center" title="Reach (People/Events)">Reach</div>
                                <div className="col-span-1 text-center" title="Impact (0.25 - 3)">Imp</div>
                                <div className="col-span-1 text-center" title="Confidence (%)">Conf</div>
                                <div className="col-span-1 text-center" title="Effort (Person-Months)">Eff</div>
                            </>
                        ) : (
                            <>
                                <div className="col-span-2 text-center" title="Impact (1-10)">Impact</div>
                                <div className="col-span-2 text-center" title="Confidence (1-10)">Conf</div>
                                <div className="col-span-1 text-center" title="Ease (1-10)">Ease</div>
                            </>
                        )}
                        <div className="col-span-2 text-right flex items-center justify-end gap-1">
                            Score <ArrowUpDown size={10} />
                        </div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {prioritization.items.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-[var(--input-bg)] p-2 rounded hover:bg-[var(--bg-main)] transition-colors group/item">
                                <div className="col-span-4 text-sm text-[var(--text-main)] truncate" title={item.label}>{item.label}</div>

                                {prioritization.method === 'RICE' ? (
                                    <>
                                        <input type="number" className="col-span-2 bg-transparent text-center text-[var(--text-main)] text-xs focus:outline-none focus:border-gray-500" value={item.reach} onChange={(e) => handleUpdateItem(item.id, 'reach', Number(e.target.value))} />
                                        <input type="number" className="col-span-1 bg-transparent text-center text-[var(--text-main)] text-xs focus:outline-none focus:border-gray-500" value={item.impact} onChange={(e) => handleUpdateItem(item.id, 'impact', Number(e.target.value))} />
                                        <input type="number" className="col-span-1 bg-transparent text-center text-[var(--text-main)] text-xs focus:outline-none focus:border-gray-500" value={item.confidence} onChange={(e) => handleUpdateItem(item.id, 'confidence', Number(e.target.value))} />
                                        <input type="number" className="col-span-1 bg-transparent text-center text-[var(--text-main)] text-xs focus:outline-none focus:border-gray-500" value={item.effort} onChange={(e) => handleUpdateItem(item.id, 'effort', Number(e.target.value))} />
                                    </>
                                ) : (
                                    <>
                                        <input type="number" className="col-span-2 bg-transparent text-center text-gray-300 text-xs focus:outline-none focus:text-white border-b border-transparent focus:border-gray-500" value={item.impact} onChange={(e) => handleUpdateItem(item.id, 'impact', Number(e.target.value))} />
                                        <input type="number" className="col-span-2 bg-transparent text-center text-gray-300 text-xs focus:outline-none focus:text-white border-b border-transparent focus:border-gray-500" value={item.confidence} onChange={(e) => handleUpdateItem(item.id, 'confidence', Number(e.target.value))} />
                                        <input type="number" className="col-span-1 bg-transparent text-center text-gray-300 text-xs focus:outline-none focus:text-white border-b border-transparent focus:border-gray-500" value={item.ease} onChange={(e) => handleUpdateItem(item.id, 'ease', Number(e.target.value))} />
                                    </>
                                )}

                                <div className="col-span-2 text-right font-bold text-yellow-400 text-sm">
                                    {item.score}
                                </div>
                                <div className="col-span-1 text-right">
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Item */}
                <div className="flex items-center gap-2 mt-2 border-t border-[var(--border-color)] pt-3">
                    <input
                        type="text"
                        className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors nodrag"
                        placeholder="Add item to prioritize..."
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    />
                    <button
                        onClick={handleAddItem}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-2 rounded transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />

        </div>
    );
});
