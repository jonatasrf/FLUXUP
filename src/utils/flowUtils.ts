import type { Node, Edge } from '../store/store';

export const calculateReachability = (nodes: Node[], edges: Edge[]) => {
    const dimmed = new Set<string>();

    // 1. Identify Roots (Nodes with no incoming edges)
    const roots = nodes.filter(n => !edges.some(e => e.target === n.id));

    // If no roots (e.g. pure cycle), pick the first node as a pseudo-root to ensure visibility
    if (roots.length === 0 && nodes.length > 0) {
        roots.push(nodes[0]);
    }

    const activeNodes = new Set<string>();
    const queue = [...roots];

    // Initialize active nodes with roots
    roots.forEach(r => activeNodes.add(r.id));

    // BFS for Active Reachability
    while (queue.length > 0) {
        const curr = queue.shift()!;

        // Find outgoing edges
        const outgoingEdges = edges.filter(e => e.source === curr.id);

        for (const edge of outgoingEdges) {
            // Check if edge is enabled
            let isEnabled = true;
            if (curr.type === 'decision') {
                if (curr.data.decision) {
                    // If swapped, invert the decision logic
                    const effectiveDecision = curr.data.decisionSwapped
                        ? (curr.data.decision === 'yes' ? 'no' : 'yes')
                        : curr.data.decision;

                    // If decision is made, only the matching handle is enabled
                    if (edge.sourceHandle !== effectiveDecision) {
                        isEnabled = false;
                    }
                }
                // If no decision, both are enabled
            }

            if (isEnabled) {
                const targetNode = nodes.find(n => n.id === edge.target);
                if (targetNode && !activeNodes.has(targetNode.id)) {
                    activeNodes.add(targetNode.id);
                    queue.push(targetNode);
                }
            }
        }
    }

    // BFS for Full Reachability (ignoring decisions)
    const allReachable = new Set<string>();
    const fullQueue = [...roots];
    roots.forEach(r => allReachable.add(r.id));

    while (fullQueue.length > 0) {
        const curr = fullQueue.shift()!;
        const outgoingEdges = edges.filter(e => e.source === curr.id);
        for (const edge of outgoingEdges) {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode && !allReachable.has(targetNode.id)) {
                allReachable.add(targetNode.id);
                fullQueue.push(targetNode);
            }
        }
    }

    // Dim nodes that are in AllReachable but NOT in ActiveNodes
    nodes.forEach(node => {
        if (allReachable.has(node.id) && !activeNodes.has(node.id)) {
            dimmed.add(node.id);
        }
    });

    // Dim edges
    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) return;

        // Edge is dimmed if:
        // 1. Source is dimmed
        // 2. Source is active, but edge is disabled by decision

        if (dimmed.has(sourceNode.id)) {
            dimmed.add(edge.id);
        } else if (sourceNode.type === 'decision' && sourceNode.data.decision) {
            // If swapped, invert the decision logic
            const effectiveDecision = sourceNode.data.decisionSwapped
                ? (sourceNode.data.decision === 'yes' ? 'no' : 'yes')
                : sourceNode.data.decision;

            if (edge.sourceHandle !== effectiveDecision) {
                dimmed.add(edge.id);
            }
        }
    });

    return dimmed;
};

/**
 * Infer overdue status for nodes without dates based on their position in the flow.
 * A node without dates is considered "inferred overdue" if any of its active predecessor nodes are overdue.
 */
export const inferOverdueStatus = (nodes: Node[], edges: Edge[]): Set<string> => {
    const inferredOverdue = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active nodes (not dimmed)
    const dimmedElements = calculateReachability(nodes, edges);

    // Build adjacency list for predecessors (reversed graph) AND successors (forward graph)
    const predecessors = new Map<string, string[]>();
    const successors = new Map<string, string[]>();

    edges.forEach(edge => {
        if (!dimmedElements.has(edge.id)) { // Only consider active edges
            // Predecessors
            if (!predecessors.has(edge.target)) {
                predecessors.set(edge.target, []);
            }
            predecessors.get(edge.target)!.push(edge.source);

            // Successors
            if (!successors.has(edge.source)) {
                successors.set(edge.source, []);
            }
            successors.get(edge.source)!.push(edge.target);
        }
    });

    // Helper to check if a node is explicitly overdue
    const isExplicitlyOverdue = (node: Node): boolean => {
        if (!node.data.dueDate) return false;
        const dueDate = new Date(node.data.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today && node.data.status !== 'completed' && node.data.status !== 'done';
    };

    // Helper to check if a node has any predecessors that are overdue (recursive with cycle detection)
    const hasOverduePredecessor = (nodeId: string, visited = new Set<string>()): boolean => {
        if (visited.has(nodeId)) return false; // Cycle detection
        visited.add(nodeId);

        const preds = predecessors.get(nodeId) || [];
        for (const predId of preds) {
            const predNode = nodes.find(n => n.id === predId);
            if (!predNode) continue;

            // If predecessor is explicitly overdue, return true
            if (isExplicitlyOverdue(predNode)) {
                return true;
            }

            // If predecessor has no dates, check its predecessors recursively
            if (!predNode.data.startDate && !predNode.data.dueDate) {
                if (hasOverduePredecessor(predId, visited)) {
                    return true;
                }
            }
        }

        return false;
    };

    // Helper to check if a node has any successors that are overdue (recursive with cycle detection)
    const hasOverdueSuccessor = (nodeId: string, visited = new Set<string>()): boolean => {
        if (visited.has(nodeId)) return false; // Cycle detection
        visited.add(nodeId);

        const succs = successors.get(nodeId) || [];
        for (const succId of succs) {
            const succNode = nodes.find(n => n.id === succId);
            if (!succNode) continue;

            // If successor is explicitly overdue, return true
            if (isExplicitlyOverdue(succNode)) {
                return true;
            }

            // If successor has no dates, check its successors recursively
            if (!succNode.data.startDate && !succNode.data.dueDate) {
                if (hasOverdueSuccessor(succId, visited)) {
                    return true;
                }
            }
        }

        return false;
    };

    // Check each node
    nodes.forEach(node => {
        // Skip if node is dimmed or already has dates
        if (dimmedElements.has(node.id)) return;
        if (node.data.dueDate || node.data.startDate) return;

        // Skip if node is completed (user request: "que não estão como Completed")
        if (node.data.status === 'completed' || node.data.status === 'done') return;

        // Check if any active predecessor OR successor is overdue
        if (hasOverduePredecessor(node.id) || hasOverdueSuccessor(node.id)) {
            inferredOverdue.add(node.id);
        }
    });

    return inferredOverdue;
};

/**
 * Normalizes status strings to standard set: 'pending', 'in-progress', 'completed', 'blocked'
 * Handles Portuguese variations and other common synonyms.
 */
export const normalizeStatus = (status: string | undefined): 'pending' | 'in-progress' | 'completed' | 'blocked' => {
    if (!status) return 'pending';

    const s = status.toLowerCase().trim().replace('_', '-');

    if (['completed', 'complete', 'done', 'finished', 'completo', 'concluido', 'concluído', 'finalizado'].includes(s)) {
        return 'completed';
    }

    if (['in-progress', 'in progress', 'ongoing', 'working', 'em progresso', 'em andamento', 'fazendo'].includes(s)) {
        return 'in-progress';
    }

    if (['blocked', 'stuck', 'waiting', 'bloqueado', 'travado', 'esperando'].includes(s)) {
        return 'blocked';
    }

    if (['pending', 'todo', 'to-do', 'pendente', 'a fazer'].includes(s)) {
        return 'pending';
    }

    return 'pending'; // Default fallback
};
