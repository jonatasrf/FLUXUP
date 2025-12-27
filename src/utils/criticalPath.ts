import type { Node } from '../store/store';

/**
 * Calculate the duration of a node in days based on its start and due dates
 */
function getDuration(node: Node): number {
    if (node.data.startDate && node.data.dueDate) {
        const start = new Date(node.data.startDate).getTime();
        const end = new Date(node.data.dueDate).getTime();
        return Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
    }
    return 1; // Default weight
}

/**
 * Calculate the longest/critical path through the graph using dynamic programming
 * @param nodes - Array of all nodes
 * @param nodeMap - Map of node IDs to nodes
 * @param adj - Adjacency list
 * @returns Map of node IDs to their longest path information
 */
export function calculateCriticalPath(
    nodes: Node[],
    nodeMap: Map<string, Node>,
    adj: Map<string, string[]>
): Map<string, { dist: number; path: string[] }> {
    const memo = new Map<string, { dist: number, path: string[] }>();
    const visiting = new Set<string>();

    const getLongestPath = (u: string): { dist: number, path: string[] } => {
        if (memo.has(u)) return memo.get(u)!;
        if (visiting.has(u)) return { dist: 0, path: [] }; // Cycle detected

        visiting.add(u);

        let maxDist = 0;
        let bestPath: string[] = [];

        const neighbors = adj.get(u) || [];
        for (const v of neighbors) {
            const res = getLongestPath(v);
            if (res.dist > maxDist) {
                maxDist = res.dist;
                bestPath = res.path;
            }
        }

        visiting.delete(u);

        const myDuration = nodeMap.get(u) ? getDuration(nodeMap.get(u)!) : 0;
        const result = {
            dist: myDuration + maxDist,
            path: [u, ...bestPath]
        };
        memo.set(u, result);
        return result;
    };

    // Calculate longest path for all nodes
    nodes.forEach(node => {
        if (!memo.has(node.id)) {
            getLongestPath(node.id);
        }
    });

    return memo;
}
