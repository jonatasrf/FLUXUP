import { clsx } from 'clsx';
import type { Node } from '../../store/store';

interface PointNodeProps {
    node: Node;
    selected: boolean;
}

export function PointNode({ node: _node, selected }: PointNodeProps) {
    return (
        <div className="w-full h-full flex items-center justify-center group">
            <div
                className={clsx(
                    "w-3 h-3 rounded-full border-2 transition-all",
                    selected ? "bg-orange-500 border-white scale-125" : "bg-[var(--text-main)] border-transparent opacity-0 group-hover:opacity-100"
                )}
            />
            {/* Larger invisible hit area */}
            <div className="absolute inset-0 -m-2" />
        </div>
    );
}
