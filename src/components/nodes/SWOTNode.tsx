import { memo, useState } from 'react';
import { Plus, X, Target } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { clsx } from 'clsx';

interface SWOTNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

const SECTIONS = [
    { key: 'strengths', label: 'Strengths', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { key: 'weaknesses', label: 'Weaknesses', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { key: 'opportunities', label: 'Opportunities', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { key: 'threats', label: 'Threats', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
] as const;

export const SWOTNode = memo(({ node, selected, onConnectionStart }: SWOTNodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const data = node.data;
    const swot = data.swot || {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: []
    };

    const [newItemText, setNewItemText] = useState<{ [key: string]: string }>({});

    const handleAddItem = (sectionKey: string) => {
        const text = newItemText[sectionKey]?.trim();
        if (!text) return;

        const currentItems = swot[sectionKey as keyof typeof swot] || [];
        const newSwot = {
            ...swot,
            [sectionKey]: [...currentItems, text]
        };

        updateNodeData(node.id, { swot: newSwot });
        setNewItemText(prev => ({ ...prev, [sectionKey]: '' }));
    };

    const handleRemoveItem = (sectionKey: string, index: number) => {
        const currentItems = swot[sectionKey as keyof typeof swot] || [];
        const newItems = [...currentItems];
        newItems.splice(index, 1);

        updateNodeData(node.id, {
            swot: {
                ...swot,
                [sectionKey]: newItems
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
        >
            {/* Header */}
            <div className="px-4 py-2 bg-[var(--header-bg)] flex items-center justify-between border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <Target size={16} className="text-purple-400" />
                    <span className="font-semibold text-sm text-[var(--text-main)]">SWOT Analysis</span>
                </div>
                <input
                    className="bg-transparent text-right text-[var(--text-muted)] text-xs focus:outline-none focus:text-[var(--text-main)] transition-colors"
                    placeholder="Analysis Title"
                    value={data.label || ''}
                    onChange={handleLabelChange}
                />
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 grid-rows-2 h-[400px]">
                {SECTIONS.map((section, index) => (
                    <div
                        key={section.key}
                        className={clsx(
                            "p-3 flex flex-col border-gray-800",
                            section.bg,
                            index % 2 === 0 ? "border-r" : "", // Right border for left columns
                            index < 2 ? "border-b" : ""      // Bottom border for top rows
                        )}
                    >
                        <h3 className={clsx("text-xs font-bold uppercase mb-2 flex items-center justify-between", section.color)}>
                            {section.label}
                            <span className="text-[10px] opacity-50">{(swot[section.key as keyof typeof swot] || []).length} items</span>
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-1 mb-2 custom-scrollbar">
                            {(swot[section.key as keyof typeof swot] || []).map((item, i) => (
                                <div key={i} className="group/item flex items-start gap-2 text-xs text-[var(--text-main)] opacity-100 hover:bg-[var(--bg-main)]/50 p-1 rounded">
                                    <span className="mt-1 w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
                                    <span className="flex-1 break-words">{item}</span>
                                    <button
                                        onClick={() => handleRemoveItem(section.key, i)}
                                        className="opacity-0 group-hover/item:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 mt-auto">
                            <input
                                type="text"
                                className="flex-1 bg-[var(--bg-main)]/20 border border-[var(--border-color)]/50 rounded px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none focus:border-gray-500 transition-colors nodrag"
                                placeholder="Add item..."
                                value={newItemText[section.key] || ''}
                                onChange={(e) => setNewItemText(prev => ({ ...prev, [section.key]: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddItem(section.key);
                                }}
                            />
                            <button
                                onClick={() => handleAddItem(section.key)}
                                className="p-1 hover:bg-[var(--bg-main)]/50 rounded text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Left Connection Point (Target) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-[var(--bg-main)] border-2 border-[var(--border-color)] rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-left-1.5 top-1/2 -translate-y-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="target"
                data-handle-id="left"
            />

            {/* Right Connection Point (Source) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-500/50 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-right-1.5 top-1/2 -translate-y-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="source"
                data-handle-id="right"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onConnectionStart) {
                        onConnectionStart(node.id, 'source', e.clientX, e.clientY, 'right');
                    }
                }}
            />
        </div>
    );
});
