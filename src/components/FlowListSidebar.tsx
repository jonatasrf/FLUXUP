import { Plus, Trash2, X, Check, Edit2 } from 'lucide-react';
import { useStore } from '../store/store';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

interface FlowListSidebarProps {
    onClose: () => void;
}

export function FlowListSidebar({ onClose }: FlowListSidebarProps) {
    const flows = useStore((state) => state.flows);
    const activeFlowId = useStore((state) => state.activeFlowId);
    const createFlow = useStore((state) => state.createFlow);
    const switchFlow = useStore((state) => state.switchFlow);
    const deleteFlow = useStore((state) => state.deleteFlow);
    const updateFlowName = useStore((state) => state.updateFlowName);
    const loadFlowsFromDisk = useStore((state) => state.loadFlowsFromDisk);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        loadFlowsFromDisk();
    }, [loadFlowsFromDisk]);

    const handleStartEdit = (id: string, name: string) => {
        setEditingId(id);
        setEditName(name);
    };

    const handleSaveEdit = () => {
        if (editingId && editName.trim()) {
            updateFlowName(editingId, editName.trim());
        }
        setEditingId(null);
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirmId) {
            deleteFlow(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    return (
        <div className="absolute left-16 top-0 h-full w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-[var(--bg-sidebar)]">
                <h2 className="font-semibold text-[var(--text-main)]">My Flows</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-4">
                <button
                    onClick={createFlow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium mb-4"
                >
                    <Plus size={16} />
                    New Flow
                </button>

                <div className="space-y-2">
                    {flows.map((flow, index) => (
                        <div
                            key={`${flow.id}-${index}`}
                            className={clsx(
                                "group flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                                activeFlowId === flow.id
                                    ? "bg-[var(--sidebar-active)] border-orange-500/50 ring-1 ring-orange-500/20"
                                    : "bg-[var(--input-bg)] border-[var(--border-color)] hover:border-[var(--text-muted)]"
                            )}
                            onClick={() => {
                                if (activeFlowId !== flow.id) {
                                    switchFlow(flow.id);
                                }
                            }}
                        >
                            {editingId === flow.id ? (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editName || ''}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit();
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full bg-[var(--bg-sidebar)] text-[var(--text-main)] text-sm px-2 py-1 rounded border border-orange-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveEdit();
                                        }}
                                        className="text-green-500 hover:text-green-400"
                                    >
                                        <Check size={14} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col min-w-0">
                                        <span className={clsx(
                                            "font-medium text-sm truncate",
                                            activeFlowId === flow.id ? "text-orange-500" : "text-[var(--text-main)]"
                                        )}>
                                            {flow.name}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(flow.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className={clsx(
                                        "flex items-center gap-1 transition-opacity",
                                        activeFlowId === flow.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    )}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(flow.id, flow.name);
                                            }}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--sidebar-active)] rounded"
                                            title="Rename"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmId(flow.id);
                                            }}
                                            className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl p-6 max-w-sm mx-4 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Delete Flow?</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6">
                            Are you sure you want to delete this flow? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 px-4 py-2 bg-[var(--input-bg)] hover:bg-[var(--sidebar-active)] text-[var(--text-main)] rounded-lg transition-colors text-sm font-medium border border-[var(--border-color)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
