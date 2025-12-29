import { useRef, useLayoutEffect } from 'react';
import { FileText, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { type Node, useStore } from '../../store/store';
import { NodeHandles } from './NodeHandles';


interface DocumentNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export function DocumentNode({ node, selected, onConnectionStart }: DocumentNodeProps) {
    const updateNodeDimensions = useStore(state => state.updateNodeDimensions);
    const contentRef = useRef<HTMLDivElement>(null);

    // Auto-resize logic
    useLayoutEffect(() => {
        if (contentRef.current) {
            const { offsetWidth, offsetHeight } = contentRef.current;
            const newWidth = Math.max(200, offsetWidth);
            const newHeight = offsetHeight;

            if (Math.abs((node.width || 200) - newWidth) > 5 || Math.abs((node.height || 100) - newHeight) > 5) {
                updateNodeDimensions(node.id, { width: newWidth, height: newHeight });
            }
        }
    }, [node.data.label, node.data.description, node.data.documentUrl, node.width, node.height, updateNodeDimensions, node.id]);



    return (
        <div
            className={clsx(
                "relative group flex flex-col bg-[var(--card-bg)] rounded-lg shadow-md border-2 transition-all duration-200",
                selected ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "border-[var(--border-color)] hover:border-blue-300"
            )}
            style={{
                minWidth: '200px',
                maxWidth: '400px'
            }}
        >
            {/* Content Container for measuring */}
            <div ref={contentRef} className="p-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 flex-shrink-0">
                        <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--text-main)] text-sm leading-tight break-words">
                            {node.data.label || "New Document"}
                        </h3>
                        {node.data.documentUrl && (
                            <a
                                href={node.data.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1 break-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <LinkIcon size={10} className="flex-shrink-0" />
                                <span className="break-all">{node.data.documentUrl}</span>
                                <ExternalLink size={10} className="flex-shrink-0" />
                            </a>
                        )}
                    </div>
                </div>

                {node.data.description && (
                    <div className="mt-2 text-xs text-[var(--text-muted)] break-words">
                        {node.data.description}
                    </div>
                )}
            </div>

            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />

        </div>
    );
}
