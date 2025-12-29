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

    // Determine which handle to use and normalize aliases
    let effectiveHandleId = handleId || defaultPos;
    if (effectiveHandleId === 'target') effectiveHandleId = 'left';
    if (effectiveHandleId === 'source') effectiveHandleId = 'right';

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
            // Final fallback: use standard left/right logic if standard IDs are missing
            if (defaultPos === 'left') return { x: x, y: y + h / 2 };
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
 * Generate SVG path for orthogonal (Manhattan) connection with rounded corners
 * Inspired by N8N/circuit-board style.
 * Fully handle-aware: Respects Top/Bottom/Left/Right exit vectors.
 */
export function getOrthogonalPath(
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    sourceHandle: string = 'right',
    targetHandle: string = 'left',
    floorY?: number,
    manualPoints?: { x: number; y: number }[] // Optional manual waypoints
): {
    pathData: string;
    center: { x: number; y: number };
    points: [number, number][];
} {
    if (manualPoints && manualPoints.length > 0) {
        const points: [number, number][] = [[sourcePos.x, sourcePos.y], ...manualPoints.map(p => [p.x, p.y] as [number, number]), [targetPos.x, targetPos.y]];
        const pathData = points.map((p, i) => (i === 0 ? "M" : "L") + ` ${p[0]} ${p[1]}`).join(" ");
        let midIdx = Math.floor(points.length / 2);
        const pA = points[midIdx - 1] || points[0];
        const pB = points[midIdx] || points[1] || pA;
        return {
            pathData,
            center: { x: (pA[0] + pB[0]) / 2, y: (pA[1] + pB[1]) / 2 },
            points
        };
    }


    const sX = sourcePos.x;
    const sY = sourcePos.y;
    const tX = targetPos.x;
    const tY = targetPos.y;

    const margin = 30; // Min distance to move perpendicular before turning

    // Helper to get direction vector
    const getDir = (handle: string) => {
        if (!handle) return { dx: 1, dy: 0 };
        if (handle.includes('top')) return { dx: 0, dy: -1 };
        if (handle.includes('bottom')) return { dx: 0, dy: 1 };
        if (handle.includes('left')) return { dx: -1, dy: 0 };
        return { dx: 1, dy: 0 }; // Default Right
    };

    const sDir = getDir(sourceHandle);
    const tDir = getDir(targetHandle);

    // 1. Start Point (Source) -> Move out by margin
    let p1x = sX + sDir.dx * margin;
    let p1y = sY + sDir.dy * margin;

    // Special Case: "Floor" Routing for backward/bottom loops
    const isBottomExit = sourceHandle && sourceHandle.includes('bottom');
    const isBottomEntry = targetHandle && targetHandle.includes('bottom');


    // If Floor is provided satisfy collision avoidance
    if (floorY !== undefined) {
        if (isBottomExit) {
            // For bottom exit, go straight to floor if needed
            // But if we just go 'margin', we might not be at floor.
            // If we want to guarantee "under" routing:
            p1y = Math.max(p1y, floorY);
        }
    }

    // 2. Approach Point (Target) -> Move out (backwards) by margin
    // Target handle direction is "out of node", so we enter "into node" (opposite)
    const tApproachX = tX + tDir.dx * margin;
    const tApproachY = tY + tDir.dy * margin;

    const points: [number, number][] = [];
    points.push([sX, sY]);
    points.push([p1x, p1y]);

    // 3. Connect p1(x,y) to tApproach(x,y) using Manhattan steps

    // Logic depends on Exit Axis
    if (sDir.dy === 0) {
        // Horizontal Exit (Left/Right)

        if (tDir.dy === 0) {
            // Horizontal Entry (Left/Right) -> Standard S-shape or C-shape
            const midX = (p1x + tApproachX) / 2;
            points.push([midX, p1y]);
            points.push([midX, tApproachY]);
        } else {
            // Vertical Entry (Top/Bottom) -> Horizontal then Vertical
            // Try to go to Target X, then move Y?
            points.push([tApproachX, p1y]); // Corner
            // Then straight to tApproachY
        }
    } else {
        // Vertical Exit (Top/Bottom)

        if (tDir.dy === 0) {
            // Horizontal Entry (Left/Right)
            // Go vertical to Target Y? No, Target Y is Fixed.
            // Be careful of overlapping node body.

            // If Bottom Exit, go to Floor?
            if (isBottomExit && floorY !== undefined) {
                // Already at p1y (floor-ish).
                // Go Horizontal to Approach X
                points.push([tApproachX, p1y]);
                // Then Vertical to Approach Y
                points.push([tApproachX, tApproachY]);
            } else {
                // Generic Vertical: Go to mid Y?
                const midY = (p1y + tApproachY) / 2;
                points.push([sX, midY]); // Stay on Source X until Mid Y? No, p1 already exited.
                // p1 is (sX, p1y).
                points.push([sX, midY]);
                points.push([tApproachX, midY]);
                // points.push([tApproachX, tApproachY]); // Implicit next
            }
        } else {
            // Vertical Entry (Top/Bottom) -> U-shape or Z-shape

            // If Bottom -> Bottom (Under)
            if (isBottomExit && isBottomEntry && floorY !== undefined) {
                // Route via Floor
                const floorLevel = Math.max(p1y, tApproachY, floorY);
                points.push([sX, floorLevel]); // Ensure we hit floor
                points.push([tApproachX, floorLevel]); // Across
                points.push([tApproachX, tApproachY]); // Up to approach
            }
            // If Top -> Top (Over)
            else if (sourceHandle.includes('top') && targetHandle.includes('top')) {
                // Route via Ceiling (min Y)
                const ceiling = Math.min(p1y, tApproachY) - 50;
                points.push([sX, ceiling]);
                points.push([tApproachX, ceiling]);
                points.push([tApproachX, tApproachY]);
            }
            else {
                // Top -> Bottom or Bottom -> Top
                const midY = (p1y + tApproachY) / 2;
                points.push([sX, midY]);
                points.push([tApproachX, midY]);
            }
        }
    }

    // Final segment to Target
    points.push([tApproachX, tApproachY]);
    points.push([tX, tY]);

    // Filter and Construct Path
    const cleanPoints: [number, number][] = [];
    if (points.length > 0) cleanPoints.push(points[0]);
    for (let i = 1; i < points.length; i++) {
        const last = cleanPoints[cleanPoints.length - 1];
        const curr = points[i];
        if (Math.abs(curr[0] - last[0]) < 1 && Math.abs(curr[1] - last[1]) < 1) continue;
        cleanPoints.push(curr);
    }

    // Calculate Center
    let midIdx = Math.floor(cleanPoints.length / 2);
    const pA = cleanPoints[midIdx - 1] || cleanPoints[0];
    const pB = cleanPoints[midIdx] || cleanPoints[1] || pA;
    const centerX = (pA[0] + pB[0]) / 2;
    const centerY = (pA[1] + pB[1]) / 2;

    const pathString = cleanPoints.map((p, i) => (i === 0 ? "M" : "L") + ` ${p[0]} ${p[1]}`).join(" ");

    return {
        pathData: pathString,
        center: { x: centerX, y: centerY },
        points: cleanPoints
    };

}
