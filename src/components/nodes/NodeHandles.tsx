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
                    className={clsx(
                        "absolute w-3 h-3 rounded-full z-20 cursor-crosshair connection-handle transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100",
                        leftHandleType === 'target' ? "bg-cyan-500 hover:bg-cyan-400" : "bg-orange-500 hover:bg-orange-400",
                        "-left-1.5 top-1/2 -translate-y-1/2 hover:scale-125"
                    )}
                    data-node-id={nodeId}
                    data-handle-type={leftHandleType}
                    data-handle-id={leftHandleId}
                    onMouseDown={(e) => handleMouseDown(e, leftHandleType, leftHandleId)}
                    title="Arrival (Forward)"
                />
            )}

            {/* Right - Departure (Source - Stacked Support) */}
            {!hideRight && rightHandleIds.map((id, index) => {
                const total = rightHandleIds.length;
                const topPercent = total === 1 ? 50 : (100 / (total + 1)) * (index + 1);

                return (
                    <div
                        key={id}
                        className={clsx(
                            "absolute w-3 h-3 rounded-full z-20 cursor-crosshair connection-handle transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100",
                            rightHandleType === 'source' ? "bg-orange-500 hover:bg-orange-400" : "bg-cyan-500 hover:bg-cyan-400",
                            "-right-1.5 -translate-y-1/2 hover:scale-125"
                        )}
                        style={{ top: `${topPercent}%` }}
                        data-node-id={nodeId}
                        data-handle-type={rightHandleType}
                        data-handle-id={id}
                        onMouseDown={(e) => handleMouseDown(e, rightHandleType, id)}
                        title="Departure (Forward)"
                    />
                );
            })}

            {/* Top - Return (Source/Target) */}
            {!hideTop && (
                <div
                    className={clsx(
                        "absolute w-3 h-3 bg-purple-500 rounded-full z-20 cursor-crosshair connection-handle transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100 hover:bg-purple-400",
                        "-top-1.5 left-1/2 -translate-x-1/2 hover:scale-125"
                    )}
                    data-node-id={nodeId}
                    data-handle-type={topHandleType}
                    data-handle-id={topHandleId}
                    onMouseDown={(e) => handleMouseDown(e, topHandleType, topHandleId)}
                    title="Return / Loop"
                />
            )}

            {/* Bottom - Return (Source/Target) */}
            {!hideBottom && (
                <div
                    className={clsx(
                        "absolute w-3 h-3 bg-purple-500 rounded-full z-20 cursor-crosshair connection-handle transition-all border-2 border-[var(--bg-main)] shadow-sm opacity-0 group-hover:opacity-100 hover:bg-purple-400",
                        "-bottom-1.5 left-1/2 -translate-x-1/2 hover:scale-125"
                    )}
                    data-node-id={nodeId}
                    data-handle-type={bottomHandleType}
                    data-handle-id={bottomHandleId}
                    onMouseDown={(e) => handleMouseDown(e, bottomHandleType, bottomHandleId)}
                    title="Return / Loop"
                />
            )}

        </>
    );
});
