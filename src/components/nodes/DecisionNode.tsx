
import { memo, useRef, useLayoutEffect } from 'react';
import { useStore, type Node } from '../../store/store';
import { clsx } from 'clsx';
import { ArrowUpDown } from 'lucide-react';

interface DecisionNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export const DecisionNode = memo(({ node, selected, onConnectionStart }: DecisionNodeProps) => {
    const updateNodeData = useStore(state => state.updateNodeData);
    const data = node.data;

    const handleToggle = (value: 'yes' | 'no') => {
        updateNodeData(node.id, { decision: value });
    };

    const handleSwap = () => {
        updateNodeData(node.id, { decisionSwapped: !data.decisionSwapped });
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (!el) return;

        // Reset height to measure content
        el.style.height = 'auto';

        // Measure wrapped height
        const contentHeight = el.scrollHeight;
        el.style.height = contentHeight + 'px';

        // Update node dimensions - dynamic height, preserve current width
        const newHeight = Math.max(100, contentHeight + 100);

        // Only update if height actually changed
        if ((node.height || 100) !== newHeight) {
            // Use a timeout to avoid render loops/warnings
            const timer = setTimeout(() => {
                useStore.getState().updateNodeDimensions(node.id, { width: node.width || 220, height: newHeight });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [data.question, node.height, node.width, node.id]);

    const handleMouseDown = (e: React.MouseEvent, type: 'source' | 'target', id: string) => {
        e.stopPropagation();
        e.preventDefault();
        onConnectionStart?.(node.id, type, e.clientX, e.clientY, id);
    };

    return (
        <div className={clsx(
            "relative w-full h-full bg-[var(--bg-sidebar)] rounded-lg border-2 shadow-lg transition-all duration-200 flex flex-col group min-w-[220px]",
            selected ? "border-orange-500 shadow-orange-500/20" : "border-[var(--border-color)] hover:border-gray-600"
        )}>
            {/* Top Handle - Input/Loop Return */}
            <div
                className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white/50 -top-2 hover:w-5 hover:h-5 transition-all shadow-[0_0_10px_rgba(59,130,246,0.6)] cursor-crosshair z-20 left-1/2 -translate-x-1/2"
                onMouseDown={(e) => handleMouseDown(e, 'target', 'top')}
                title="Input"
            />

            {/* Bottom Handle - NO Output (Red) */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20">
                <span className="text-[10px] font-bold text-red-500 bg-[var(--bg-main)] px-1 rounded shadow-sm border border-red-500/30 mb-0.5">NO</span>
            </div>
            <div
                className="absolute w-4 h-4 rounded-full bg-red-500 border-2 border-white/50 -bottom-2 transition-all shadow-[0_0_10px_rgba(239,68,68,0.6)] hover:scale-125 cursor-crosshair z-20 left-1/2 -translate-x-1/2"
                onMouseDown={(e) => handleMouseDown(e, 'source', 'no')}
                title="NO Output"
            />

            {/* Right Handle - YES Output (Green) */}
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20">
                <span className="text-[10px] font-bold text-green-500 bg-[var(--bg-main)] px-1 rounded shadow-sm border border-green-500/30 mr-1">YES</span>
            </div>
            <div
                className="absolute w-4 h-4 rounded-full bg-green-500 border-2 border-white/50 -right-2 transition-all shadow-[0_0_10px_rgba(34,197,94,0.6)] hover:scale-125 cursor-crosshair z-20 top-1/2 -translate-y-1/2"
                onMouseDown={(e) => handleMouseDown(e, 'source', 'yes')}
                title="YES Output"
            />

            {/* Left Handle - Secondary Input */}
            <div
                className="absolute w-3 h-3 rounded-full bg-blue-400 border-2 border-white/50 -left-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-crosshair z-20 top-1/2 -translate-y-1/2"
                onMouseDown={(e) => handleMouseDown(e, 'target', 'left')}
                title="Secondary Input"
            />


            <div className="p-3 flex-1 flex flex-col items-center justify-center min-h-[60px]">
                <div className="text-xs font-medium text-gray-400 mb-1 text-center uppercase tracking-wider">
                    Decision
                </div>

                <textarea
                    ref={textareaRef}
                    className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-1.5 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none text-center nodrag"
                    style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                    placeholder="Ask a question..."
                    value={data.question || ''}
                    onChange={(e) => {
                        updateNodeData(node.id, { question: e.target.value });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    rows={1}
                />

                {/* Decision Switch & Swap */}
                <div className="mt-2 flex items-center justify-center gap-2">
                    <div className="flex items-center justify-center bg-[var(--bg-main)] rounded-full p-0.5 border border-[var(--border-color)]">
                        <button
                            className={clsx(
                                "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                                data.decision === 'yes'
                                    ? "bg-green-500 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggle('yes');
                            }}
                        >
                            YES
                        </button>
                        <button
                            className={clsx(
                                "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                                data.decision === 'no'
                                    ? "bg-red-500 text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggle('no');
                            }}
                        >
                            NO
                        </button>
                    </div>

                    {/* Swap Button */}
                    <button
                        className="p-1.5 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] text-gray-400 hover:text-white hover:border-gray-500 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSwap();
                        }}
                        title="Swap Yes/No positions"
                    >
                        <ArrowUpDown size={12} />
                    </button>
                </div>
            </div>

        </div>
    );
});
