import { useStore, type Node } from '../../store/store';
import { NodeHandles } from './NodeHandles';

import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface NoteNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export function NoteNode({ node, selected, onConnectionStart }: NoteNodeProps) {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const updateNodeDimensions = useStore((state) => state.updateNodeDimensions);
    const [localLabel, setLocalLabel] = useState(node.data.label);
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLocalLabel(node.data.label);
    }, [node.data.label]);

    const handleLabelChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalLabel(e.target.value);
    };

    const handleLabelSubmit = () => {
        if (localLabel !== node.data.label) {
            updateNodeData(node.id, { label: localLabel });
        }
    };

    return (
        <div className="relative w-full h-full group">
            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />


            <div
                ref={contentRef}
                className={clsx(
                    "w-full h-full text-[var(--text-main)] p-4 flex flex-col transition-all border-2 border-dashed border-yellow-600/30 hover:border-yellow-600/60 rounded-lg",
                    selected ? "ring-1 ring-orange-500/50 bg-[var(--bg-main)]/50 border-yellow-600" : "hover:bg-[var(--bg-main)]/30",
                )}
                style={{
                    backgroundColor: 'var(--bg-sidebar)'
                }}
            >
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={localLabel}
                        onChange={handleLabelChange}
                        onBlur={() => {
                            handleLabelSubmit();
                            setIsEditing(false);
                        }}
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-sm font-sans placeholder-[var(--text-muted)] text-[var(--text-main)]"
                        placeholder="Type a note..."
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                ) : (
                    <div
                        className="w-full h-full text-sm font-sans text-[var(--text-main)] whitespace-pre-wrap cursor-pointer select-none"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                        }}
                    >
                        {localLabel || <span className="text-[var(--text-muted)] italic">Type a note...</span>}
                    </div>
                )}

                {/* Resize Handle */}
                <div
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 flex items-center justify-center group-hover:opacity-100 opacity-0 transition-opacity resize-handle"
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWidth = node.width || 200;
                        const startHeight = node.height || 200;

                        const handleMouseMove = (moveEvent: MouseEvent) => {
                            const scale = useStore.getState().transform.k || 1;
                            const deltaX = (moveEvent.clientX - startX) / scale;
                            const deltaY = (moveEvent.clientY - startY) / scale;

                            const newWidth = Math.max(150, startWidth + deltaX);
                            const newHeight = Math.max(150, startHeight + deltaY);

                            updateNodeDimensions(node.id, { width: newWidth, height: newHeight });
                        };

                        const handleMouseUp = () => {
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                        };

                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                    }}
                >
                    <div className="w-2 h-2 border-r-2 border-b-2 border-[var(--border-color)]" />
                </div>
            </div>


        </div>
    );
}
