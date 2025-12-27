import { memo, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { clsx } from 'clsx';

interface FMEANodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export const FMEANode = memo(({ node, selected, onConnectionStart }: FMEANodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const data = node.data;

    const severity = data.severity || 1;
    const occurrence = data.occurrence || 1;
    const detection = data.detection || 1;
    const rpn = severity * occurrence * detection;

    // Update RPN in store if it differs
    useEffect(() => {
        if (data.rpn !== rpn) {
            updateNodeData(node.id, { rpn });
        }
    }, [severity, occurrence, detection, rpn, node.id, updateNodeData, data.rpn]);

    const handleChange = (field: string, value: any) => {
        updateNodeData(node.id, { [field]: value });
    };

    const isHighRisk = rpn >= 100;

    return (
        <div
            className={clsx(
                "w-80 bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group",
                selected ? "border-blue-500 shadow-blue-500/20" : (isHighRisk ? "border-red-500 shadow-red-500/20" : "border-[var(--border-color)]")
            )}
        >
            {/* Header */}
            <div className={clsx(
                "px-4 py-2 rounded-t-lg flex items-center gap-2 border-b",
                isHighRisk ? "bg-red-500/20 border-red-500/30" : "bg-[var(--header-bg)] border-[var(--border-color)]"
            )}>
                <ShieldAlert size={16} className={isHighRisk ? "text-red-400" : "text-gray-400"} />
                <span className={clsx("font-semibold text-sm", isHighRisk ? "text-red-200" : "text-[var(--text-main)]")}>
                    FMEA Analysis
                </span>
                {isHighRisk && (
                    <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                        High Risk
                    </span>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Failure Mode */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Failure Mode</label>
                    <textarea
                        className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none resize-none nodrag"
                        rows={2}
                        placeholder="What could go wrong?"
                        value={data.failureMode || ''}
                        onChange={(e) => handleChange('failureMode', e.target.value)}
                    />
                </div>

                {/* S-O-D Inputs */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold" title="Severity (1-10)">Sev (S)</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-1.5 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none text-center nodrag"
                            value={severity}
                            onChange={(e) => handleChange('severity', Math.min(10, Math.max(1, parseInt(e.target.value) || 0)))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold" title="Occurrence (1-10)">Occ (O)</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-1.5 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none text-center nodrag"
                            value={occurrence}
                            onChange={(e) => handleChange('occurrence', Math.min(10, Math.max(1, parseInt(e.target.value) || 0)))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-400 uppercase font-bold" title="Detection (1-10)">Det (D)</label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-1.5 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none text-center nodrag"
                            value={detection}
                            onChange={(e) => handleChange('detection', Math.min(10, Math.max(1, parseInt(e.target.value) || 0)))}
                        />
                    </div>
                </div>

                {/* RPN Display */}
                <div className={clsx(
                    "flex items-center justify-between p-2 rounded border",
                    isHighRisk ? "bg-red-900/20 border-red-500/30" : "bg-[var(--header-bg)] border-[var(--border-color)]"
                )}>
                    <span className="text-xs text-gray-400 font-medium">RPN (Risk Priority Number)</span>
                    <span className={clsx(
                        "text-lg font-bold",
                        isHighRisk ? "text-red-400" : "text-blue-400"
                    )}>
                        {rpn}
                    </span>
                </div>

                {/* Recommended Action */}
                <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Recommended Action</label>
                    <textarea
                        className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none resize-none nodrag"
                        rows={2}
                        placeholder="Action to reduce risk..."
                        value={data.action || ''}
                        onChange={(e) => handleChange('action', e.target.value)}
                    />
                </div>
            </div>

            {/* Left Connection Point (Target) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-500 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
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
