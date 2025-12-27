import type { Node, Edge } from '../store/store';
import dagre from 'dagre';

interface LayoutResult {
    id: string;
    position: { x: number; y: number };
}

/**
 * Calculate automatic layout for a flowchart using dagre
 * @param nodes - Array of nodes to layout
 * @param edges - Array of edges connecting nodes
 * @returns Array of position updates for each node
 */
export function calculateAutoLayout(
    nodes: Node[],
    edges: Edge[]
): LayoutResult[] {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // Configure the layout
    dagreGraph.setGraph({
        rankdir: 'LR',
        nodesep: 100, // Vertical spacing between nodes in LR
        ranksep: 200, // Horizontal spacing between ranks
        marginx: 50,
        marginy: 50
    });

    // Add nodes to dagre
    nodes.forEach((node) => {
        // Use actual node dimensions if available, otherwise defaults
        // Adding a buffer helps prevent tight packing
        const width = node.width || 250;
        const height = node.height || 100;
        dagreGraph.setNode(node.id, { width, height });
    });

    // Add edges to dagre
    edges.forEach((edge) => {
        if (edge.label) {
            dagreGraph.setEdge(edge.source, edge.target, { width: 100, height: 20 });
        } else {
            dagreGraph.setEdge(edge.source, edge.target);
        }
    });

    // Calculate layout
    dagre.layout(dagreGraph);

    // Get new positions
    // dagre returns center coordinates, but React Flow expects top-left
    const layoutResults: LayoutResult[] = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Sanity check in case node wasn't added correctly
        if (!nodeWithPosition) {
            return {
                id: node.id,
                position: { x: node.position.x, y: node.position.y }
            };
        }

        return {
            id: node.id,
            position: {
                x: nodeWithPosition.x - (node.width || 250) / 2,
                y: nodeWithPosition.y - (node.height || 100) / 2,
            },
        };
    });

    return layoutResults;
}
