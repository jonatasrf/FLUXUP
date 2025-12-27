import { memo, useState, useEffect, useRef } from 'react';
import { Fish, Plus, X } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { clsx } from 'clsx';

interface IshikawaNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

const CATEGORIES = [
    { key: 'method', label: 'Method' },
    { key: 'machine', label: 'Machine' },
    { key: 'material', label: 'Material' },
    { key: 'manpower', label: 'Manpower' },
    { key: 'measurement', label: 'Measurement' },
    { key: 'environment', label: 'Environment' }
] as const;

export const IshikawaNode = memo(({ node, selected, onConnectionStart }: IshikawaNodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const data = node.data;
    const causes = data.causes || {
        method: [],
        machine: [],
        material: [],
        manpower: [],
        measurement: [],
        environment: []
    };

    // State to track which category is currently adding a cause
    const [activeInput, setActiveInput] = useState<keyof typeof causes | null>(null);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeInput]);

    const handleAddClick = (category: keyof typeof causes) => {
        setActiveInput(category);
        setInputValue('');
    };

    const handleInputConfirm = () => {
        if (activeInput && inputValue.trim()) {
            const updatedCauses = {
                ...causes,
                [activeInput]: [...(causes[activeInput] || []), inputValue.trim()]
            };
            updateNodeData(node.id, { causes: updatedCauses });
        }
        setActiveInput(null);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleInputConfirm();
        } else if (e.key === 'Escape') {
            setActiveInput(null);
            setInputValue('');
        }
    };

    const handleRemoveCause = (category: keyof typeof causes, index: number) => {
        const updatedCauses = {
            ...causes,
            [category]: (causes[category] || []).filter((_, i) => i !== index)
        };
        updateNodeData(node.id, { causes: updatedCauses });
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(node.id, { label: e.target.value });
    };

    return (
        <div
            className={clsx(
                "w-[600px] bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group",
                selected ? "border-blue-500 shadow-blue-500/20" : "border-[var(--border-color)]"
            )}
        >
            {/* Header */}
            <div className="px-4 py-2 bg-[var(--header-bg)] rounded-t-lg flex items-center gap-2 border-b border-[var(--border-color)]">
                <Fish size={16} className="text-teal-400" />
                <span className="font-semibold text-sm text-[var(--text-main)]">Ishikawa (Fishbone) Diagram</span>
            </div>

            <div className="p-6 relative">
                {/* Main Spine */}
                <div className="absolute top-1/2 left-4 right-32 h-1 bg-[var(--border-color)] z-0" />

                {/* Head (Problem) */}
                <div className="absolute top-1/2 right-4 -translate-y-1/2 w-28 h-28 bg-red-500/10 border-2 border-red-500/30 rounded-full flex items-center justify-center z-10 p-2">
                    <input
                        className="w-full bg-transparent text-center text-red-600 dark:text-red-200 text-sm font-bold focus:outline-none nodrag placeholder-red-400"
                        placeholder="Problem / Effect"
                        value={data.label || ''}
                        onChange={handleLabelChange}
                    />
                </div>

                {/* Ribs Container */}
                <div className="grid grid-cols-3 gap-y-12 gap-x-4 relative z-10 mr-32">
                    {CATEGORIES.map((cat, idx) => {
                        const isTop = idx < 3;
                        return (
                            <div key={cat.key} className="flex flex-col items-center relative">
                                {/* Rib Line */}
                                <div className={clsx(
                                    "absolute w-0.5 bg-[var(--border-color)] h-12",
                                    isTop ? "-bottom-6" : "-top-6"
                                )} />

                                {/* Category Box */}
                                <div className="bg-[var(--header-bg)] border border-[var(--border-color)] rounded p-2 w-full min-h-[80px]">
                                    <div className="flex items-center justify-between mb-2 border-b border-gray-700 pb-1">
                                        <span className="text-xs font-bold text-teal-400 uppercase">{cat.label}</span>
                                        <button
                                            onClick={() => handleAddClick(cat.key)}
                                            className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                    <ul className="space-y-1">
                                        {(causes[cat.key] || []).map((cause, i) => (
                                            <li key={i} className="text-xs text-[var(--text-main)] flex items-center justify-between group/item bg-[var(--bg-main)] px-1.5 py-0.5 rounded">
                                                <span className="truncate mr-2" title={cause}>{cause}</span>
                                                <button
                                                    onClick={() => handleRemoveCause(cat.key, i)}
                                                    className="text-gray-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </li>
                                        ))}
                                        {/* Inline Input */}
                                        {activeInput === cat.key && (
                                            <li className="px-1.5 py-0.5">
                                                <input
                                                    ref={inputRef}
                                                    className="w-full bg-[var(--input-bg)] text-white text-xs rounded px-1 py-0.5 border border-blue-500 focus:outline-none nodrag"
                                                    value={inputValue}
                                                    onChange={(e) => setInputValue(e.target.value)}
                                                    onBlur={handleInputConfirm}
                                                    onKeyDown={handleKeyDown}
                                                    placeholder="Type cause..."
                                                />
                                            </li>
                                        )}
                                        {(causes[cat.key] || []).length === 0 && activeInput !== cat.key && (
                                            <li className="text-[10px] text-gray-600 italic text-center py-2">No causes</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                    "absolute w-3 h-3 bg-gray-500 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
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
