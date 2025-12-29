import { memo } from 'react';
import { Calendar, Clock, Users, FileText } from 'lucide-react';
import { NodeHandles } from './NodeHandles';
import { clsx } from 'clsx';

import type { NodeProps } from '../../registry/NodeRegistry';

export const MeetingNode = memo(({ node, selected, onConnectionStart }: NodeProps) => {
    const { label, meeting } = node.data;
    const date = meeting?.date ? new Date(meeting.date) : null;

    return (
        <div
            className={clsx(
                "relative group flex flex-col bg-[var(--bg-sidebar)] border-2 rounded-xl transition-all duration-200 min-w-[250px] w-full h-full",
                selected ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]" : "border-[var(--border-color)] hover:border-gray-700",
                "shadow-xl"
            )}
        >
            {/* Header */}
            <div className="h-2 bg-orange-500 rounded-t-sm w-full" />

            <div className="p-4 space-y-3">
                {/* Title */}
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                        <Calendar size={20} className="text-orange-500" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[var(--text-main)] leading-tight line-clamp-2">
                            {label || 'New Meeting'}
                        </h3>
                        {date ? (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-orange-600 dark:text-orange-400">
                                <Clock size={12} />
                                <span>
                                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ) : (
                            <p className="text-[10px] text-gray-500 mt-1 italic">No date set</p>
                        )}
                    </div>
                </div>

                {/* Details */}
                {(meeting?.participants?.length || 0) > 0 || meeting?.minutes ? (
                    <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-color)]">
                        {(meeting?.participants?.length || 0) > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--input-bg)] px-2 py-1 rounded">
                                <Users size={12} />
                                <span>{meeting?.participants?.length}</span>
                            </div>
                        )}
                        {meeting?.minutes && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] bg-[var(--input-bg)] px-2 py-1 rounded">
                                <FileText size={12} />
                                <span>Minutes</span>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />

        </div>
    );
});
