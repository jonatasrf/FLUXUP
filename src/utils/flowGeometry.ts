import type { Node } from '../store/store';

/**
 * Get default dimensions for a node type
 */
export function getNodeDimensions(nodeType: string): { width: number; height: number } {
    switch (nodeType) {
        case 'note':
            return { width: 200, height: 200 };
        case 'document':
        case 'external':
            return { width: 200, height: 80 };
        case 'fmea':
            return { width: 320, height: 400 };
        case 'ishikawa':
            return { width: 600, height: 400 };
        case 'pdca':
            return { width: 500, height: 400 };
        case 'fiveWTwoH':
            return { width: 400, height: 350 };
        case 'swot':
            return { width: 600, height: 450 };
        case 'prioritization':
            return { width: 600, height: 450 };
        case 'stakeholderMatrix':
            return { width: 600, height: 500 };
        default:
            return { width: 256, height: 100 };
    }
}

/**
 * Calculate the position of a connection handle on a node
 */
export function getHandlePosition(
    node: Node,
    handleId?: string,
    defaultPos: 'left' | 'right' = 'right'
): { x: number; y: number } {
    // Point nodes use their position directly
    if (node.type === 'point') return node.position;

    // Get dimensions
    let w = node.width;
    let h = node.height;

    if (!w || !h) {
        const dims = getNodeDimensions(node.type || 'task');
        w = dims.width;
        h = dims.height;
    }

    if (!node.position) return { x: 0, y: 0 };

    const x = node.position.x;
    const y = node.position.y;

    // Determine which handle to use
    const effectiveHandleId = handleId || defaultPos;

    // Special case: Decision Node input handle is always on the left center
    if (node.type === 'decision' && (effectiveHandleId === 'left' || effectiveHandleId === 'target' || defaultPos === 'left')) {
        return { x: x, y: y + h / 2 };
    }

    // Handle positions for different handles
    switch (effectiveHandleId) {
        case 'top':
            return { x: x + w / 2, y: y };
        case 'bottom':
            return { x: x + w / 2, y: y + h };
        case 'left':
            return { x: x, y: y + h / 2 };
        case 'right':
            return { x: x + w, y: y + h / 2 };
        case 'yes': {
            if (node.type !== 'decision') return { x: x + w, y: y + h / 2 };
            const center = h / 2;
            const spacing = 14;
            const isSwapped = node.data?.decisionSwapped;
            const yOffset = isSwapped ? (center + spacing) : (center - spacing);
            return { x: x + w + 6, y: y + yOffset + 12 };
        }
        case 'no': {
            if (node.type !== 'decision') return { x: x + w, y: y + h / 2 };
            const center = h / 2;
            const spacing = 14;
            const isSwapped = node.data?.decisionSwapped;
            const yOffset = isSwapped ? (center - spacing) : (center + spacing);
            return { x: x + w + 6, y: y + yOffset + 12 };
        }
        default:
            return { x: x + w, y: y + h / 2 };
    }
}

/**
 * Get perpendicular offset for bezier curve control points
 */
export function getOffset(handleId?: string, distance: number = 100): { x: number; y: number } {
    switch (handleId) {
        case 'top':
            return { x: 0, y: -distance };
        case 'bottom':
            return { x: 0, y: distance };
        case 'left':
            return { x: -distance, y: 0 };
        case 'right':
            return { x: distance, y: 0 };
        case 'target':
            return { x: -distance, y: 0 }; // DecisionNode Input (Left)
        case 'yes':
            return { x: distance, y: 0 }; // DecisionNode Output (Right)
        case 'no':
            return { x: distance, y: 0 }; // DecisionNode Output (Right)
        default:
            return { x: distance, y: 0 };
    }
}

/**
 * Generate SVG path for bezier curve connection
 */
export function getBezierPath(
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    sourceHandle?: string,
    targetHandle?: string
): {
    pathData: string;
    cp1x: number;
    cp1y: number;
    cp2x: number;
    cp2y: number;
} {
    const sourceX = sourcePos.x;
    const sourceY = sourcePos.y;
    const targetX = targetPos.x;
    const targetY = targetPos.y;

    const off1 = getOffset(sourceHandle || 'right', 100);
    const off2 = getOffset(targetHandle || 'left', 100);

    let cp1x = sourceX + off1.x;
    let cp1y = sourceY + off1.y;
    let cp2x = targetX + off2.x;
    let cp2y = targetY + off2.y;

    // Check for backward edge (target is significantly to the left of source)
    const isBackward = targetX < sourceX - 50;

    if (isBackward) {
        // Deep curve logic for backward edges
        const verticalDistance = Math.abs(targetY - sourceY);
        const depth = Math.max(verticalDistance * 0.8, 300);

        cp1x = sourceX + 100; // Go right first
        cp1y = sourceY + depth; // Then deep down
        cp2x = targetX - 100; // Come from left
        cp2y = targetY + depth; // From deep down
    } else if (Math.abs(targetX - sourceX) < 50 && targetY < sourceY - 100) {
        // Vertical Upward Connection Curve
        const mid = (sourceY + targetY) / 2;
        const sideways = 100;
        cp1x = sourceX + sideways;
        cp1y = mid;
        cp2x = targetX - sideways;
        cp2y = mid;
    }

    const pathData = `M${sourceX},${sourceY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;

    return { pathData, cp1x, cp1y, cp2x, cp2y };
}
