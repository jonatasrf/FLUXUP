import { memo, useState, useRef, useEffect } from 'react';
import { RotateCw, Plus, X } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { NodeHandles } from './NodeHandles';
import { clsx } from 'clsx';


interface PDCANodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

const PHASES = [
    { key: 'plan', label: 'Plan', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    { key: 'do', label: 'Do', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    { key: 'check', label: 'Check', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    { key: 'act', label: 'Act', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' }
] as const;

export const PDCANode = memo(({ node, selected, onConnectionStart }: PDCANodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const data = node.data;
    const pdca = data.pdca || {
        plan: [],
        do: [],
        check: [],
        act: []
    };

    // State for inline input
    const [activeInput, setActiveInput] = useState<keyof typeof pdca | null>(null);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeInput]);

    const handleAddClick = (phase: keyof typeof pdca) => {
        setActiveInput(phase);
        setInputValue('');
    };

    const handleInputConfirm = () => {
        if (activeInput && inputValue.trim()) {
            const updatedPDCA = {
                ...pdca,
                [activeInput]: [...(pdca[activeInput] || []), inputValue.trim()]
            };
            updateNodeData(node.id, { pdca: updatedPDCA });
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

    const handleRemoveItem = (phase: keyof typeof pdca, index: number) => {
        const updatedPDCA = {
            ...pdca,
            [phase]: (pdca[phase] || []).filter((_, i) => i !== index)
        };
        updateNodeData(node.id, { pdca: updatedPDCA });
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(node.id, { label: e.target.value });
    };

    return (
        <div
            className={clsx(
                "w-[500px] bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group",
                selected ? "border-purple-500 shadow-purple-500/20" : "border-[var(--border-color)]"
            )}
        >
            {/* Header */}
            <div className="px-4 py-2 bg-[var(--header-bg)] rounded-t-lg flex items-center justify-between border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <RotateCw size={16} className="text-purple-400" />
                    <span className="font-semibold text-sm text-[var(--text-main)]">PDCA Cycle</span>
                </div>
                <input
                    className="bg-transparent text-right text-gray-400 text-xs focus:outline-none focus:text-white transition-colors"
                    placeholder="Cycle Name"
                    value={data.label || ''}
                    onChange={handleLabelChange}
                />
            </div>

            {/* 2x2 Grid */}
            <div className="p-4 grid grid-cols-2 gap-4">
                {PHASES.map((phase) => (
                    <div key={phase.key} className={clsx("rounded-lg border p-3 min-h-[120px] flex flex-col", phase.bg, phase.border)}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={clsx("text-xs font-bold uppercase", phase.color)}>{phase.label}</span>
                            <button
                                onClick={() => handleAddClick(phase.key as any)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                            >
                                <Plus size={12} />
                            </button>
                        </div>

                        <ul className="space-y-1 flex-1">
                            {(pdca[phase.key as keyof typeof pdca] || []).map((item, i) => (
                                <li key={i} className="text-xs text-[var(--text-main)] flex items-center justify-between group/item bg-[var(--bg-main)]/20 px-1.5 py-1 rounded">
                                    <span className="truncate mr-2" title={item}>{item}</span>
                                    <button
                                        onClick={() => handleRemoveItem(phase.key as any, i)}
                                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    >
                                        <X size={10} />
                                    </button>
                                </li>
                            ))}

                            {/* Inline Input */}
                            {activeInput === phase.key && (
                                <li className="px-0 py-1">
                                    <input
                                        ref={inputRef}
                                        className="w-full bg-[var(--bg-sidebar)] text-[var(--text-main)] text-xs rounded px-1.5 py-1 border border-purple-500 focus:outline-none nodrag"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onBlur={handleInputConfirm}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Add item..."
                                    />
                                </li>
                            )}

                            {(pdca[phase.key as keyof typeof pdca] || []).length === 0 && activeInput !== phase.key && (
                                <li className="text-[10px] text-gray-500 italic text-center py-4">Empty</li>
                            )}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />

        </div>
    );
});
