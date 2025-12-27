import type { Node, Edge } from '../store/store';

/**
 * Check if a node is effectively completed
 * A task node is completed if its status is 'completed' or 'done'
 * A task without dates is considered completed if it leads to completed nodes
 * Non-task nodes (notes, documents) are completed if their outgoing edges lead to completed nodes
 * 
 * @param nodeId - ID of the node to check
 * @param nodes - Array of all nodes
 * @param edges - Array of all edges
 * @param visited - Set of visited nodes for cycle detection
 * @returns true if the node is effectively completed
 */
export function isNodeEffectivelyCompleted(
    nodeId: string,
    nodes: Node[],
    edges: Edge[],
    visited = new Set<string>()
): boolean {
    if (visited.has(nodeId)) return false; // Cycle detection
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;

    if (node.type === 'task') {
        // If task is completed/done, it's effective
        if (node.data.status === 'completed' || node.data.status === 'done') return true;

        // Refinement: "tasks sem data que estão entre tasks concluidas tambem deve ter linhas verdes"
        // If a task has NO date (startDate/dueDate) AND its target is completed, treat it as completed
        if (!node.data.startDate && !node.data.dueDate) {
            // Check if it leads to a completed node
            const outgoing = edges.filter(e => e.source === nodeId);
            if (outgoing.length > 0 && outgoing.some(e => isNodeEffectivelyCompleted(e.target, nodes, edges, new Set(visited)))) {
                return true;
            }
        }
        return false;
    }

    // For non-task nodes (note, document), check outgoing edges
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    if (outgoingEdges.length === 0) return false;

    // If at least one outgoing path is completed, the node is considered passed
    return outgoingEdges.some(e => isNodeEffectivelyCompleted(e.target, nodes, edges, new Set(visited)));
}
