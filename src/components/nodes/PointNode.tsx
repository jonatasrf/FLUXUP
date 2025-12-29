import { clsx } from 'clsx';
import type { Node } from '../../store/store';
import { NodeHandles } from './NodeHandles';


interface PointNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}


export function PointNode({ node, selected, onConnectionStart }: PointNodeProps) {

    return (
        <div className="w-full h-full flex items-center justify-center group">
            <div
                className={clsx(
                    "w-3 h-3 rounded-full border-2 transition-all",
                    selected ? "bg-orange-500 border-white scale-125" : "bg-[var(--text-main)] border-transparent opacity-0 group-hover:opacity-100"
                )}
            />
            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />
            {/* Larger invisible hit area */}
            <div className="absolute inset-0 -m-2" />

        </div>
    );
}
