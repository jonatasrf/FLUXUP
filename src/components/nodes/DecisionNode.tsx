
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

    return (
        <div className={clsx(
            "relative w-full h-full bg-[var(--bg-sidebar)] rounded-lg border-2 shadow-lg transition-all duration-200 flex flex-col group min-w-[220px]",
            selected ? "border-orange-500 shadow-orange-500/20" : "border-[var(--border-color)] hover:border-gray-600"
        )}>
            {/* Input Handle (Left Center) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-400 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 transition-all",
                    "-left-1.5 top-1/2 -translate-y-1/2 border-2 border-[var(--bg-main)]"
                )}
                data-node-id={node.id}
                data-handle-type="target"
                data-handle-id="target"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onConnectionStart?.(node.id, 'target', e.clientX, e.clientY, 'target');
                }}
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

            {/* Output Handles (Right Side - Stacked) */}
            <div className="absolute -right-3 top-0 bottom-0 flex flex-col justify-center gap-4 py-2 w-12">
                {/* Top handle */}
                <div className="relative flex items-center justify-end w-full overflow-visible">
                    <div
                        className={clsx(
                            "w-3 h-3 rounded-full z-20 cursor-crosshair connection-handle hover:scale-125 transition-all border-2 border-[var(--bg-main)]",
                            // Active if: (not swapped and decision=yes) OR (swapped and decision=no)
                            ((!data.decisionSwapped && data.decision === 'yes') || (data.decisionSwapped && data.decision === 'no'))
                                ? (data.decisionSwapped ? "bg-red-500" : "bg-green-500")
                                : "bg-gray-600"
                        )}
                        data-node-id={node.id}
                        data-handle-type="source"
                        data-handle-id={data.decisionSwapped ? 'no' : 'yes'}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onConnectionStart?.(node.id, 'source', e.clientX, e.clientY, data.decisionSwapped ? 'no' : 'yes');
                        }}
                    />
                    <span className={clsx(
                        "absolute left-full ml-2 text-[10px] font-bold transition-colors pointer-events-none whitespace-nowrap",
                        ((!data.decisionSwapped && data.decision === 'yes') || (data.decisionSwapped && data.decision === 'no'))
                            ? (data.decisionSwapped ? "text-red-500" : "text-green-500")
                            : "text-gray-600"
                    )}>{data.decisionSwapped ? 'NO' : 'YES'}</span>
                </div>

                {/* Bottom handle */}
                <div className="relative flex items-center justify-end w-full overflow-visible">
                    <div
                        className={clsx(
                            "w-3 h-3 rounded-full z-20 cursor-crosshair connection-handle hover:scale-125 transition-all border-2 border-[#121212]",
                            // Active if: (not swapped and decision=no) OR (swapped and decision=yes)
                            ((!data.decisionSwapped && data.decision === 'no') || (data.decisionSwapped && data.decision === 'yes'))
                                ? (data.decisionSwapped ? "bg-green-500" : "bg-red-500")
                                : "bg-gray-600"
                        )}
                        data-node-id={node.id}
                        data-handle-type="source"
                        data-handle-id={data.decisionSwapped ? 'yes' : 'no'}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onConnectionStart?.(node.id, 'source', e.clientX, e.clientY, data.decisionSwapped ? 'yes' : 'no');
                        }}
                    />
                    <span className={clsx(
                        "absolute left-full ml-2 text-[10px] font-bold transition-colors pointer-events-none whitespace-nowrap",
                        ((!data.decisionSwapped && data.decision === 'no') || (data.decisionSwapped && data.decision === 'yes'))
                            ? (data.decisionSwapped ? "text-green-500" : "text-red-500")
                            : "text-gray-600"
                    )}>{data.decisionSwapped ? 'YES' : 'NO'}</span>
                </div>
            </div>
        </div>
    );
});
