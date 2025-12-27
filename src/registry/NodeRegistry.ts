import React from 'react';
import type { Node } from '../store/store';

export interface NodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
    onAddBranch?: (nodeId: string, handleId?: string) => void;
    onConflictClick?: (assignee: string) => void;
}

type NodeComponent = React.ComponentType<NodeProps>;

class NodeRegistry {
    private static instance: NodeRegistry;
    private nodes: Map<string, NodeComponent> = new Map();

    private constructor() { }

    public static getInstance(): NodeRegistry {
        if (!NodeRegistry.instance) {
            NodeRegistry.instance = new NodeRegistry();
        }
        return NodeRegistry.instance;
    }

    public register(type: string, component: NodeComponent): void {
        this.nodes.set(type, component);
    }

    public get(type: string): NodeComponent | undefined {
        return this.nodes.get(type);
    }

    public getRegisteredTypes(): string[] {
        return Array.from(this.nodes.keys());
    }
}

export const nodeRegistry = NodeRegistry.getInstance();
