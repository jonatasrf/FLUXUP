import { clsx } from 'clsx';
import { memo } from 'react';

interface NodeHandlesProps {
    nodeId: string;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
    // Optional overrides for specific logic (like Decision node)
    rightHandleIds?: string[]; // Allow multiple handles on the right
    bottomHandleId?: string;
    topHandleId?: string;
    leftHandleId?: string;

    rightHandleType?: 'source' | 'target';
    bottomHandleType?: 'source' | 'target';
    topHandleType?: 'source' | 'target';
    leftHandleType?: 'source' | 'target';

    hideLeft?: boolean;
    hideRight?: boolean;
    hideTop?: boolean;
    hideBottom?: boolean;
}

export const NodeHandles = memo(function NodeHandles({
    nodeId,
    onConnectionStart,
    rightHandleIds = ['right'],
    bottomHandleId = 'bottom',
    topHandleId = 'top',
    leftHandleId = 'left',
    rightHandleType = 'source',
    bottomHandleType = 'source',
    topHandleType = 'source',
    leftHandleType = 'target',
    hideLeft = false,
    hideRight = false,
    hideTop = false,
    hideBottom = false
}: NodeHandlesProps) {
    const handleMouseDown = (e: React.MouseEvent, type: 'source' | 'target', id: string) => {
        e.stopPropagation();
        e.preventDefault();
        onConnectionStart?.(nodeId, type, e.clientX, e.clientY, id);
    };

    return (
        <>
            {/* Left - Arrival (Target) */}
            {!hideLeft && (
                <div
                    className="absolute w-8 h-8 -left-4 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center cursor-crosshair group/handle"
                    onMouseDown={(e) => handleMouseDown(e, leftHandleType, leftHandleId)}
                    title="Arrival (Forward)"
                    data-node-id={nodeId}
                    data-handle-type={leftHandleType}
                    data-handle-id={leftHandleId}
                >
                    <div
                        className={clsx(
                            "w-3 h-3 rounded-full transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100 group-hover/handle:opacity-100 group-hover/handle:scale-125",
                            leftHandleType === 'target' ? "bg-cyan-500 hover:bg-cyan-400" : "bg-orange-500 hover:bg-orange-400"
                        )}
                    />
                </div>
            )}

            {/* Right - Departure (Source - Stacked Support) */}
            {!hideRight && rightHandleIds.map((id, index) => {
                const total = rightHandleIds.length;
                const topPercent = total === 1 ? 50 : (100 / (total + 1)) * (index + 1);

                return (
                    <div
                        key={id}
                        className="absolute w-8 h-8 -right-4 -translate-y-1/2 z-30 flex items-center justify-center cursor-crosshair group/handle"
                        style={{ top: `${topPercent}%` }}
                        onMouseDown={(e) => handleMouseDown(e, rightHandleType, id)}
                        title="Departure (Forward)"
                        data-node-id={nodeId}
                        data-handle-type={rightHandleType}
                        data-handle-id={id}
                    >
                        <div
                            className={clsx(
                                "w-3 h-3 rounded-full transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100 group-hover/handle:opacity-100 group-hover/handle:scale-125",
                                rightHandleType === 'source' ? "bg-orange-500 hover:bg-orange-400" : "bg-cyan-500 hover:bg-cyan-400"
                            )}
                        />
                    </div>
                );
            })}

            {/* Top - Return (Source/Target) */}
            {!hideTop && (
                <div
                    className="absolute w-8 h-8 -top-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center cursor-crosshair group/handle"
                    onMouseDown={(e) => handleMouseDown(e, topHandleType, topHandleId)}
                    title="Return / Loop"
                    data-node-id={nodeId}
                    data-handle-type={topHandleType}
                    data-handle-id={topHandleId}
                >
                    <div
                        className={clsx(
                            "w-3 h-3 bg-purple-500 rounded-full transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100 group-hover/handle:opacity-100 hover:bg-purple-400 group-hover/handle:scale-125"
                        )}
                    />
                </div>
            )}

            {/* Bottom - Return (Source/Target) */}
            {!hideBottom && (
                <div
                    className="absolute w-8 h-8 -bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center cursor-crosshair group/handle"
                    onMouseDown={(e) => handleMouseDown(e, bottomHandleType, bottomHandleId)}
                    title="Return / Loop"
                    data-node-id={nodeId}
                    data-handle-type={bottomHandleType}
                    data-handle-id={bottomHandleId}
                >
                    <div
                        className={clsx(
                            "w-3 h-3 bg-purple-500 rounded-full transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100 group-hover/handle:opacity-100 hover:bg-purple-400 group-hover/handle:scale-125"
                        )}
                    />
                </div>
            )}

        </>
    );
});
