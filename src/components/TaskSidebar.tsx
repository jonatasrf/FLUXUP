import { useStore } from '../store/store';
import { X, Calendar, User, CheckCircle2, Trash2, Type, AlertCircle, GitBranch, Circle, Clock, ShieldAlert, Fish, RotateCw, HelpCircle, Target, BarChart3, FileText, Briefcase, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

// Tag Input Component
function TagInput({ value, onChange }: { value: string[], onChange: (tags: string[]) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {value.map((tag, idx) => (
                <div key={idx} className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                    <span>{tag}</span>
                    <button
                        onClick={() => onChange(value.filter((_, i) => i !== idx))}
                        className="hover:text-orange-300"
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
            <input
                type="text"
                placeholder="Add tag..."
                className="flex-1 min-w-[100px] bg-[var(--input-bg)] border border-[var(--input-border)] rounded px-2 py-1 text-sm text-[var(--text-main)] focus:outline-none focus:border-orange-500"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        const newTag = e.currentTarget.value.trim();
                        if (newTag && !value.includes(newTag)) {
                            onChange([...value, newTag]);
                            e.currentTarget.value = '';
                        }
                    }
                }}
            />
        </div>
    );
}

export function TaskSidebar() {
    const selectedNodeIds = useStore((state) => state.selectedNodeIds);
    const selectedEdgeId = useStore((state) => state.selectedEdgeId);
    const nodes = useStore((state) => state.nodes);
    const edges = useStore((state) => state.edges);
    const updateNodeData = useStore((state) => state.updateNodeData);
    const updateEdgeData = useStore((state) => state.updateEdgeData);
    const setSelectedNodes = useStore((state) => state.setSelectedNodes);
    const setSelectedEdge = useStore((state) => state.setSelectedEdge);
    const deleteNode = useStore((state) => state.deleteNode);
    const deleteEdge = useStore((state) => state.deleteEdge);

    // Only show sidebar if exactly one node is selected
    const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

    if (!selectedNode && !selectedEdge) return null;
    if (selectedNode && (selectedNode.type === 'note' || selectedNode.type === 'point')) return null;

    const handleClose = () => {
        setSelectedNodes([]);
        setSelectedEdge(null);
    };

    // === STAKEHOLDER MATRIX SIDEBAR ===
    if (selectedNode && selectedNode.type === 'stakeholderMatrix') {
        const stakeholders = (selectedNode.data as any).stakeholders || [];

        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <Users size={18} className="text-pink-400" />
                        Stakeholder Matrix
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
                        <p className="text-xs text-gray-400">
                            Manage stakeholders directly in the node or view summary here.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Matrix Overview</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[var(--card-bg)] p-2 rounded border border-[var(--border-color)]">
                                <div className="text-xs text-gray-500 mb-1">High Power / High Interest</div>
                                <div className="text-lg font-bold text-red-400">
                                    {(stakeholders as any[]).filter(s => s.influence > 5 && s.interest > 5).length}
                                </div>
                                <div className="text-[10px] text-gray-600">Manage Closely</div>
                            </div>
                            <div className="bg-[var(--card-bg)] p-2 rounded border border-[var(--border-color)]">
                                <div className="text-xs text-gray-500 mb-1">High Power / Low Interest</div>
                                <div className="text-lg font-bold text-orange-400">
                                    {(stakeholders as any[]).filter(s => s.influence > 5 && s.interest <= 5).length}
                                </div>
                                <div className="text-[10px] text-gray-600">Keep Satisfied</div>
                            </div>
                            <div className="bg-[var(--card-bg)] p-2 rounded border border-[var(--border-color)]">
                                <div className="text-xs text-gray-500 mb-1">Low Power / High Interest</div>
                                <div className="text-lg font-bold text-yellow-400">
                                    {(stakeholders as any[]).filter(s => s.influence <= 5 && s.interest > 5).length}
                                </div>
                                <div className="text-[10px] text-gray-600">Keep Informed</div>
                            </div>
                            <div className="bg-[var(--card-bg)] p-2 rounded border border-[var(--border-color)]">
                                <div className="text-xs text-gray-500 mb-1">Low Power / Low Interest</div>
                                <div className="text-lg font-bold text-green-400">
                                    {(stakeholders as any[]).filter(s => s.influence <= 5 && s.interest <= 5).length}
                                </div>
                                <div className="text-[10px] text-gray-600">Monitor</div>
                            </div>
                        </div>
                    </div>

                    {/* Delete Button */}
                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => {
                                deleteNode(selectedNode.id);
                                setSelectedNodes([]);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Matrix
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === DECISION NODE: Simplified Sidebar ===
    if (selectedNode && selectedNode.type === 'decision') {
        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <GitBranch size={18} className="text-orange-500" />
                        Decision Point
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Question Field */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Question
                        </label>
                        <textarea
                            value={selectedNode.data.question || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { question: e.target.value })}
                            placeholder="Enter decision question..."
                            className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-main)] placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Decision Toggle */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Active Path
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateNodeData(selectedNode.id, { decision: 'yes' })}
                                className={clsx(
                                    "flex-1 px-4 py-3 rounded-lg font-medium transition-all text-sm",
                                    selectedNode.data.decision === 'yes'
                                        ? "bg-green-500 text-white shadow-lg ring-2 ring-green-500/50"
                                        : "bg-[var(--input-bg)] text-gray-400 hover:bg-[var(--bg-main)] border border-[var(--input-border)]"
                                )}
                            >
                                YES
                            </button>
                            <button
                                onClick={() => updateNodeData(selectedNode.id, { decision: 'no' })}
                                className={clsx(
                                    "flex-1 px-4 py-3 rounded-lg font-medium transition-all text-sm",
                                    selectedNode.data.decision === 'no'
                                        ? "bg-red-500 text-white shadow-lg ring-2 ring-red-500/50"
                                        : "bg-[var(--input-bg)] text-gray-400 hover:bg-[var(--bg-main)] border border-[var(--input-border)]"
                                )}
                            >
                                NO
                            </button>
                        </div>
                        {!selectedNode.data.decision && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                No path selected - both paths are active
                            </p>
                        )}
                    </div>

                    {/* Delete Button */}
                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => {
                                deleteNode(selectedNode.id);
                                setSelectedNodes([]);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Decision Node
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === EDGE SIDEBAR ===
    if (selectedEdge) {
        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)]">Connection Details</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} /> Label
                        </label>
                        <input
                            type="text"
                            value={selectedEdge.label as string || ''}
                            onChange={(e) => updateEdgeData(selectedEdge.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="e.g. Yes, No, API Call"
                        />
                    </div>

                    {/* Delete Button */}
                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => {
                                deleteEdge(selectedEdge.id);
                                setSelectedEdge(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Connection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === DOCUMENT NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'document') {
        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)]">Document Details</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Document Name
                        </label>
                        <input
                            type="text"
                            value={selectedNode.data.label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="e.g. API Spec"
                        />
                    </div>

                    {/* URL */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Document URL
                        </label>
                        <input
                            type="text"
                            value={selectedNode.data.documentUrl || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { documentUrl: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="https://..."
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                        </label>
                        <textarea
                            value={selectedNode.data.description || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500 transition-colors min-h-[100px] resize-none"
                            placeholder="Add details..."
                        />
                    </div>

                    {/* Delete Button */}
                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => {
                                deleteNode(selectedNode.id);
                                setSelectedNodes([]);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Document
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedNode && selectedNode.type === 'projectCharter') {
        const data = (selectedNode.data.projectCharter || {}) as any;
        const updateCharter = (updates: any) => {
            updateNodeData(selectedNode.id, {
                projectCharter: { ...data, ...updates }
            } as any);
        };

        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <Briefcase size={18} className="text-blue-400" />
                        Project Charter
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</label>
                            <input
                                type="text"
                                value={data.projectName || ''}
                                onChange={(e) => updateCharter({ projectName: e.target.value })}
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                                placeholder="Project Name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</label>
                                <input
                                    type="text"
                                    value={data.projectManager || ''}
                                    onChange={(e) => updateCharter({ projectManager: e.target.value })}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                                    placeholder="Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</label>
                                <input
                                    type="text"
                                    value={data.budget || ''}
                                    onChange={(e) => updateCharter({ budget: e.target.value })}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                                    placeholder="$0.00"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Justification</label>
                            <textarea
                                value={data.justification || ''}
                                onChange={(e) => updateCharter({ justification: e.target.value })}
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500 resize-none"
                                rows={3}
                                placeholder="Why this project?"
                            />
                        </div>
                    </div>

                    {/* Delete Button */}
                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => {
                                deleteNode(selectedNode.id);
                                setSelectedNodes([]);
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Charter
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === FMEA NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'fmea') {
        const { failureMode, severity, occurrence, detection, rpn, action } = selectedNode.data;
        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <ShieldAlert size={18} className="text-red-400" />
                        FMEA Analysis
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Failure Mode</label>
                        <textarea
                            value={failureMode || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { failureMode: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-red-500 resize-none"
                            rows={3}
                            placeholder="Describe the failure mode..."
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-gray-500 uppercase">Severity</label>
                            <input
                                type="number" min="1" max="10"
                                value={severity || 1}
                                onChange={(e) => {
                                    const s = Number(e.target.value);
                                    updateNodeData(selectedNode.id, { severity: s, rpn: s * (occurrence || 1) * (detection || 1) });
                                }}
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-2 py-1.5 text-center text-[var(--text-main)] focus:border-red-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-gray-500 uppercase">Occurrence</label>
                            <input
                                type="number" min="1" max="10"
                                value={occurrence || 1}
                                onChange={(e) => {
                                    const o = Number(e.target.value);
                                    updateNodeData(selectedNode.id, { occurrence: o, rpn: (severity || 1) * o * (detection || 1) });
                                }}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded px-2 py-1.5 text-center text-[var(--text-main)] focus:border-red-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-gray-500 uppercase">Detection</label>
                            <input
                                type="number" min="1" max="10"
                                value={detection || 1}
                                onChange={(e) => {
                                    const d = Number(e.target.value);
                                    updateNodeData(selectedNode.id, { detection: d, rpn: (severity || 1) * (occurrence || 1) * d });
                                }}
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded px-2 py-1.5 text-center text-[var(--text-main)] focus:border-red-500"
                            />
                        </div>
                    </div>

                    <div className="bg-[var(--bg-main)] rounded-lg p-4 flex items-center justify-between border border-[var(--border-color)]">
                        <span className="text-sm font-medium text-gray-400">RPN Score</span>
                        <span className={clsx("text-2xl font-bold", (rpn || 1) >= 100 ? "text-red-500" : "text-green-500")}>
                            {rpn || 1}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended Action</label>
                        <textarea
                            value={action || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { action: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-red-500 resize-none"
                            rows={4}
                            placeholder="Action to reduce risk..."
                        />
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => { deleteNode(selectedNode.id); setSelectedNodes([]); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete FMEA Node
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === ISHIKAWA NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'ishikawa') {
        const { label, causes } = selectedNode.data;
        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <Fish size={18} className="text-teal-400" />
                        Ishikawa Diagram
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Problem / Effect</label>
                        <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-teal-500"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Causes by Category</label>
                        {Object.entries(causes || {}).map(([category, items]) => (
                            <div key={category} className="space-y-2">
                                <h3 className="text-xs font-bold text-teal-500 uppercase">{category}</h3>
                                {(!items || (items as string[]).length === 0) ? (
                                    <p className="text-xs text-gray-600 italic">No causes added</p>
                                ) : (
                                    <ul className="space-y-1">
                                        {(items as string[]).map((cause, idx) => (
                                            <li key={idx} className="text-sm text-[var(--text-main)] bg-[var(--input-bg)] px-2 py-1 rounded border border-[var(--border-color)] flex justify-between items-center group">
                                                <span>{cause}</span>
                                                <button
                                                    onClick={() => {
                                                        if (!causes) return;
                                                        const newCauses = { ...causes };
                                                        // @ts-ignore
                                                        newCauses[category] = (items as string[]).filter((_, i) => i !== idx);
                                                        updateNodeData(selectedNode.id, { causes: newCauses });
                                                    }}
                                                    className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => { deleteNode(selectedNode.id); setSelectedNodes([]); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Ishikawa Node
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === PDCA NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'pdca') {
        const { label, pdca } = selectedNode.data;
        const phases = [
            { key: 'plan', label: 'Plan', color: 'text-blue-500' },
            { key: 'do', label: 'Do', color: 'text-yellow-500' },
            { key: 'check', label: 'Check', color: 'text-green-500' },
            { key: 'act', label: 'Act', color: 'text-red-500' }
        ] as const;

        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <RotateCw size={18} className="text-purple-400" />
                        PDCA Cycle
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cycle Name</label>
                        <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <div className="space-y-6">
                        {phases.map((phase) => (
                            <div key={phase.key} className="space-y-2">
                                <h3 className={clsx("text-xs font-bold uppercase border-b border-gray-700 pb-1", phase.color)}>
                                    {phase.label}
                                </h3>
                                <ul className="space-y-1">
                                    {(pdca?.[phase.key] || []).map((item: string, idx: number) => (
                                        <li key={idx} className="text-sm text-[var(--text-main)] bg-[var(--input-bg)] px-2 py-1 rounded border border-[var(--border-color)] flex justify-between items-center group">
                                            <span>{item}</span>
                                            <button
                                                onClick={() => {
                                                    if (!pdca) return;
                                                    const newPDCA = { ...pdca };
                                                    // @ts-ignore
                                                    newPDCA[phase.key] = (pdca[phase.key] || []).filter((_, i) => i !== idx);
                                                    updateNodeData(selectedNode.id, { pdca: newPDCA });
                                                }}
                                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={12} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <input
                                    type="text"
                                    placeholder={`Add to ${phase.label}...`}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-main)] focus:outline-none focus:border-gray-500"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value.trim();
                                            if (val) {
                                                const newPDCA = { ...(pdca || { plan: [], do: [], check: [], act: [] }) };
                                                // @ts-ignore
                                                newPDCA[phase.key] = [...(newPDCA[phase.key] || []), val];
                                                updateNodeData(selectedNode.id, { pdca: newPDCA });
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => { deleteNode(selectedNode.id); setSelectedNodes([]); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete PDCA Node
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === 5W2H NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'fiveWTwoH') {
        const { label, fiveWTwoH } = selectedNode.data;
        const fields = [
            { key: 'what', label: 'What', sub: '(Action)', placeholder: 'What needs to be done?' },
            { key: 'why', label: 'Why', sub: '(Reason)', placeholder: 'Why is it necessary?' },
            { key: 'where', label: 'Where', sub: '(Location)', placeholder: 'Where will it be done?' },
            { key: 'when', label: 'When', sub: '(Time)', placeholder: 'When will it be done?' },
            { key: 'who', label: 'Who', sub: '(Responsible)', placeholder: 'Who is responsible?' },
            { key: 'how', label: 'How', sub: '(Method)', placeholder: 'How will it be done?' },
            { key: 'howMuch', label: 'How Much', sub: '(Cost)', placeholder: 'How much will it cost?' }
        ] as const;

        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <HelpCircle size={18} className="text-blue-400" />
                        5W2H Action Plan
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Action Title</label>
                        <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="space-y-4">
                        {fields.map((field) => (
                            <div key={field.key} className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1">
                                    {field.label} <span className="font-normal text-gray-600 lowercase">{field.sub}</span>
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder={field.placeholder}
                                    // @ts-ignore
                                    value={fiveWTwoH?.[field.key] || ''}
                                    onChange={(e) => {
                                        const newFiveWTwoH = { ...(fiveWTwoH || { what: '', why: '', where: '', when: '', who: '', how: '', howMuch: '' }) };
                                        // @ts-ignore
                                        newFiveWTwoH[field.key] = e.target.value;
                                        updateNodeData(selectedNode.id, { fiveWTwoH: newFiveWTwoH });
                                    }}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-gray-500 resize-none"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => { deleteNode(selectedNode.id); setSelectedNodes([]); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete 5W2H Node
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === SWOT NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'swot') {
        const { label, swot } = selectedNode.data;
        const sections = [
            { key: 'strengths', label: 'Strengths', color: 'text-green-400', placeholder: 'Add a strength...' },
            { key: 'weaknesses', label: 'Weaknesses', color: 'text-red-400', placeholder: 'Add a weakness...' },
            { key: 'opportunities', label: 'Opportunities', color: 'text-blue-400', placeholder: 'Add an opportunity...' },
            { key: 'threats', label: 'Threats', color: 'text-orange-400', placeholder: 'Add a threat...' }
        ] as const;

        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <Target size={18} className="text-purple-400" />
                        SWOT Analysis
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Analysis Title</label>
                        <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="space-y-6">
                        {sections.map((section) => (
                            <div key={section.key} className="space-y-2">
                                <label className={clsx("text-xs font-bold uppercase flex items-center justify-between", section.color)}>
                                    {section.label}
                                    <span className="text-[10px] opacity-50 text-gray-500">
                                        {(swot?.[section.key] || []).length} items
                                    </span>
                                </label>
                                <div className="space-y-2">
                                    {(swot?.[section.key] || []).map((item: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 group">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
                                            <span className="text-sm text-[var(--text-main)] flex-1 break-words">{item}</span>
                                            <button
                                                onClick={() => {
                                                    const newItems = [...(swot?.[section.key] || [])];
                                                    newItems.splice(i, 1);
                                                    const newSwot = { ...(swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] }) };
                                                    // @ts-ignore
                                                    newSwot[section.key] = newItems;
                                                    updateNodeData(selectedNode.id, { swot: newSwot });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <input
                                        type="text"
                                        placeholder={section.placeholder}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-gray-500 transition-colors"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const target = e.target as HTMLInputElement;
                                                const value = target.value.trim();
                                                if (value) {
                                                    const newItems = [...(swot?.[section.key] || []), value];
                                                    const newSwot = { ...(swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] }) };
                                                    // @ts-ignore
                                                    newSwot[section.key] = newItems;
                                                    updateNodeData(selectedNode.id, { swot: newSwot });
                                                    target.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => { deleteNode(selectedNode.id); setSelectedNodes([]); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete SWOT Analysis
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === PRIORITIZATION NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'prioritization') {
        const { label, prioritization } = selectedNode.data;
        const method = prioritization?.method || 'RICE';
        const items = prioritization?.items || [];

        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <BarChart3 size={18} className="text-yellow-400" />
                        Prioritization Matrix
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Matrix Title</label>
                        <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Method</label>
                        <div className="flex bg-[var(--input-bg)] rounded-lg p-1 border border-[var(--border-color)]">
                            <button
                                onClick={() => {
                                    if (method !== 'RICE') {
                                        // Recalculate scores for RICE
                                        const newItems = items.map((item: any) => {
                                            const r = item.reach || 0;
                                            const i = item.impact || 0;
                                            const c = (item.confidence || 0) / 100;
                                            const e = item.effort || 1;
                                            const score = Math.round(((r * i * c) / e) * 100) / 100;
                                            return { ...item, score };
                                        });
                                        updateNodeData(selectedNode.id, { prioritization: { ...prioritization, method: 'RICE', items: newItems.sort((a: any, b: any) => b.score - a.score) } });
                                    }
                                }}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-medium rounded transition-colors",
                                    method === 'RICE' ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-gray-200"
                                )}
                            >
                                RICE
                            </button>
                            <button
                                onClick={() => {
                                    if (method !== 'ICE') {
                                        // Recalculate scores for ICE
                                        const newItems = items.map((item: any) => {
                                            const i = item.impact || 0;
                                            const c = item.confidence || 0;
                                            const e = item.ease || 0;
                                            const score = Math.round(i * c * e * 100) / 100;
                                            return { ...item, score };
                                        });
                                        updateNodeData(selectedNode.id, { prioritization: { ...prioritization, method: 'ICE', items: newItems.sort((a: any, b: any) => b.score - a.score) } });
                                    }
                                }}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-medium rounded transition-colors",
                                    method === 'ICE' ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-gray-200"
                                )}
                            >
                                ICE
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            {method === 'RICE' ? '(Reach * Impact * Confidence) / Effort' : 'Impact * Confidence * Ease'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-between">
                            Top Items
                            <span className="text-gray-600">{items.length} total</span>
                        </label>
                        <div className="space-y-1">
                            {items.slice(0, 5).map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between bg-[var(--input-bg)] px-3 py-2 rounded border border-[var(--border-color)]">
                                    <span className="text-sm text-[var(--text-main)] truncate flex-1 pr-2">{item.label}</span>
                                    <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">{item.score}</span>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="text-xs text-gray-600 italic text-center py-4">No items yet</div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => { deleteNode(selectedNode.id); setSelectedNodes([]); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Matrix
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === MEETING NODE SIDEBAR ===
    if (selectedNode && selectedNode.type === 'meeting') {
        const { label, meeting } = selectedNode.data;
        // Format date to YYYY-MM-DDTHH:mm for datetime-local input (Local Time)
        const date = meeting?.date ? (() => {
            const d = new Date(meeting.date);
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        })() : '';

        return (
            <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
                <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                    <h2 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
                        <Calendar size={18} className="text-orange-400" />
                        Meeting Details
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Title</label>
                        <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500"
                            placeholder="Meeting Subject..."
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</label>
                        <input
                            type="datetime-local"
                            value={date}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) {
                                    updateNodeData(selectedNode.id, {
                                        meeting: { ...meeting, date: '' } as any,
                                        startDate: undefined,
                                        dueDate: undefined
                                    });
                                    return;
                                }
                                try {
                                    const d = new Date(val);
                                    if (!isNaN(d.getTime())) {
                                        const iso = d.toISOString();
                                        updateNodeData(selectedNode.id, {
                                            meeting: { ...meeting, date: iso } as any
                                        });
                                    }
                                } catch (err) {
                                    // Ignore invalid dates while typing
                                }
                            }}
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500"
                        />
                    </div>

                    {/* Participants */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</label>
                        <TagInput
                            value={meeting?.participants || []}
                            onChange={(tags) => updateNodeData(selectedNode.id, { meeting: { ...meeting, participants: tags } as any })}
                        />
                    </div>

                    {/* Minutes */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={14} /> Meeting Minutes (Ata)
                        </label>
                        <textarea
                            value={meeting?.minutes || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { meeting: { ...meeting, minutes: e.target.value } as any })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 resize-none min-h-[150px]"
                            placeholder="Record meeting notes here..."
                        />
                    </div>

                    {/* Attachments */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            📎 Attachments
                        </label>

                        {/* Attachment List */}
                        <div className="space-y-2">
                            {(selectedNode.data.attachments || []).map((attachment: any) => (
                                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-[var(--input-bg)] rounded-lg border border-[var(--border-color)] group hover:border-gray-600 transition-colors">
                                    <span className="text-lg flex-shrink-0">
                                        {attachment.type === 'file' ? '📄' : '🔗'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-[var(--text-main)] truncate">{attachment.name}</div>
                                        {attachment.size && (
                                            <div className="text-xs text-gray-500">
                                                {(attachment.size / 1024).toFixed(1)} KB
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {attachment.type === 'file' && attachment.path && (
                                            <button
                                                onClick={async () => {
                                                    const { activeFlowId } = useStore.getState();
                                                    if (activeFlowId && window.electron?.openAttachment) {
                                                        try {
                                                            await window.electron.openAttachment(activeFlowId, attachment.path);
                                                        } catch (error) {
                                                            toast.error('Failed to open file');
                                                        }
                                                    }
                                                }}
                                                className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Open file"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </button>
                                        )}
                                        {attachment.type === 'link' && attachment.url && (
                                            <a
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Open link"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        )}
                                        <button
                                            onClick={async () => {
                                                const { removeAttachment } = useStore.getState();
                                                await removeAttachment(selectedNode.id, attachment.id);
                                                toast.success('Attachment removed');
                                            }}
                                            className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add File */}
                        <button
                            onClick={async () => {
                                const { activeFlowId, addAttachment } = useStore.getState();
                                if (!activeFlowId || !window.electron?.showOpenDialog || !window.electron?.uploadAttachment) {
                                    toast.error('Upload not available');
                                    return;
                                }

                                try {
                                    const filePath = await window.electron.showOpenDialog();
                                    if (!filePath) return;
                                    const fileName = filePath.split(/[/\\]/).pop() || 'file';

                                    const result = await window.electron.uploadAttachment(
                                        activeFlowId,
                                        selectedNode.id,
                                        filePath
                                    );

                                    addAttachment(selectedNode.id, {
                                        id: crypto.randomUUID(),
                                        name: fileName,
                                        type: 'file',
                                        path: result.path,
                                        size: result.size,
                                        uploadedAt: new Date().toISOString()
                                    });

                                    toast.success('File attached');
                                } catch (error) {
                                    console.error('Upload error:', error);
                                    toast.error('Failed to upload file');
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
                        >
                            <span>📄</span>
                            Upload File
                        </button>

                        {/* Add Link */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add link URL..."
                                className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = e.currentTarget;
                                        const url = input.value.trim();
                                        if (url) {
                                            const { addAttachment } = useStore.getState();
                                            addAttachment(selectedNode.id, {
                                                id: crypto.randomUUID(),
                                                name: url,
                                                type: 'link',
                                                url: url,
                                                uploadedAt: new Date().toISOString()
                                            });
                                            input.value = '';
                                            toast.success('Link added');
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => { deleteNode(selectedNode.id); setSelectedNodes([]); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Meeting Node
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // === TASK/EXTERNAL NODE SIDEBAR ===
    if (!selectedNode) return null;

    const { label, description, status, assignee, dueDate } = selectedNode.data;

    return (
        <div className="absolute right-0 top-0 h-full w-96 bg-[var(--bg-sidebar)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-sidebar)]">
                <h2 className="font-semibold text-[var(--text-main)]">
                    {selectedNode.type === 'external' ? 'External System' : 'Task Details'}
                </h2>
                <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-[var(--text-main)] transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                    </label>
                    <input
                        type="text"
                        value={label || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                        placeholder="Task title"
                    />
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'pending', label: 'Pending', icon: Circle, color: 'text-gray-400' },
                            { id: 'in-progress', label: 'In Progress', icon: Clock, color: 'text-blue-500' },
                            { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
                            { id: 'blocked', label: 'Blocked', icon: AlertCircle, color: 'text-red-500' },
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => updateNodeData(selectedNode.id, { status: s.id as any })}
                                className={clsx(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                                    status === s.id
                                        ? "bg-[var(--sidebar-active)] border-orange-500/50 ring-1 ring-orange-500/20"
                                        : "bg-[var(--input-bg)] border-[var(--input-border)] hover:border-gray-600"
                                )}
                            >
                                <s.icon size={16} className={s.color} />
                                <span className="text-sm text-[var(--text-main)]">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Priority - Hide for External Nodes */}
                {selectedNode.type !== 'external' && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Priority
                        </label>
                        <div className="flex gap-2">
                            {[
                                { id: 'low', label: 'Low' },
                                { id: 'medium', label: 'Medium' },
                                { id: 'high', label: 'High' },
                                { id: 'critical', label: 'Critical' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => updateNodeData(selectedNode.id, { priority: p.id as any })}
                                    className={clsx(
                                        "flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                        (selectedNode.data.priority || 'low') === p.id
                                            ? "bg-[var(--sidebar-active)] border-orange-500 text-orange-500"
                                            : "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-muted)] hover:border-gray-600"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* External System - Only for External Nodes */}
                {selectedNode.type === 'external' && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            External System
                        </label>
                        <input
                            type="text"
                            value={selectedNode.data.externalSystem || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { externalSystem: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="e.g., SAP, TEAMCENTER, Oracle"
                        />
                    </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                    </label>
                    <textarea
                        value={description || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors min-h-[120px] resize-none"
                        placeholder="Add a detailed description..."
                    />
                </div>

                {/* Metadata */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <User size={14} /> Assignee
                        </label>
                        <input
                            type="text"
                            value={assignee || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { assignee: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="Unassigned"
                        />
                    </div>

                    {/* Dates - Only for Task Nodes */}
                    {selectedNode.type === 'task' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Start Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedNode.data.startDate || ''}
                                    onChange={(e) => {
                                        const newStart = e.target.value;
                                        if (selectedNode.data.dueDate && newStart > selectedNode.data.dueDate) {
                                            toast.error("Start date is after due date");
                                        }
                                        updateNodeData(selectedNode.id, { startDate: newStart });
                                    }}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Due Date
                                </label>
                                <input
                                    type="date"
                                    value={dueDate || ''}
                                    onChange={(e) => {
                                        const newDue = e.target.value;
                                        if (selectedNode.data.startDate && newDue < selectedNode.data.startDate) {
                                            toast.error("Due date is before start date");
                                        }
                                        updateNodeData(selectedNode.id, { dueDate: newDue });
                                    }}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                                />
                            </div>

                            {/* Invalid Date Warning */}
                            {selectedNode.data.startDate && selectedNode.data.dueDate && selectedNode.data.startDate > selectedNode.data.dueDate && (
                                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                                    <AlertCircle size={14} />
                                    <span>Invalid date range: Start date is after Due date.</span>
                                </div>
                            )}
                        </>
                    )}

                    {/* Time Estimation - Only for Task Nodes */}
                    {selectedNode.type === 'task' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Est. Hours
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={selectedNode.data.estimatedHours || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { estimatedHours: Number(e.target.value) })}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Act. Hours
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={selectedNode.data.actualHours || ''}
                                    onChange={(e) => updateNodeData(selectedNode.id, { actualHours: Number(e.target.value) })}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tags (comma separated)
                        </label>
                        <TagInput
                            value={selectedNode.data.tags || []}
                            onChange={(tags) => updateNodeData(selectedNode.id, { tags })}
                        />
                    </div>

                    {/* Checklist */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 size={14} /> Checklist
                        </label>

                        <div className="space-y-2">
                            {(selectedNode.data.checklist || []).map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2 group">
                                    <button
                                        onClick={() => {
                                            const newChecklist = (selectedNode.data.checklist || []).map((i: any) =>
                                                i.id === item.id ? { ...i, done: !i.done } : i
                                            );
                                            updateNodeData(selectedNode.id, { checklist: newChecklist });
                                        }}
                                        className={clsx(
                                            "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                            item.done ? "bg-green-500 border-green-500" : "border-gray-600 hover:border-gray-500"
                                        )}
                                    >
                                        {item.done && <CheckCircle2 size={10} className="text-white" />}
                                    </button>
                                    <span className={clsx("flex-1 text-sm text-[var(--text-main)]", item.done && "line-through text-[var(--text-muted)]")}>
                                        {item.text}
                                    </span>
                                    <button
                                        onClick={() => {
                                            const newChecklist = (selectedNode.data.checklist || []).filter((i: any) => i.id !== item.id);
                                            updateNodeData(selectedNode.id, { checklist: newChecklist });
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add item..."
                                className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = e.currentTarget;
                                        const text = input.value.trim();
                                        if (text) {
                                            const newChecklist = [
                                                ...(selectedNode.data.checklist || []),
                                                { id: crypto.randomUUID(), text, done: false }
                                            ];
                                            updateNodeData(selectedNode.id, { checklist: newChecklist });
                                            input.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Attachments */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            📎 Attachments
                        </label>

                        {/* Attachment List */}
                        <div className="space-y-2">
                            {(selectedNode.data.attachments || []).map((attachment: any) => (
                                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-[var(--input-bg)] rounded-lg border border-[var(--border-color)] group hover:border-gray-600 transition-colors">
                                    <span className="text-lg flex-shrink-0">
                                        {attachment.type === 'file' ? '📄' : '🔗'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-[var(--text-main)] truncate">{attachment.name}</div>
                                        {attachment.size && (
                                            <div className="text-xs text-gray-500">
                                                {(attachment.size / 1024).toFixed(1)} KB
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {attachment.type === 'file' && attachment.path && (
                                            <button
                                                onClick={async () => {
                                                    const { activeFlowId } = useStore.getState();
                                                    if (activeFlowId && window.electron?.openAttachment) {
                                                        try {
                                                            await window.electron.openAttachment(activeFlowId, attachment.path);
                                                        } catch (error) {
                                                            toast.error('Failed to open file');
                                                        }
                                                    }
                                                }}
                                                className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Open file"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </button>
                                        )}
                                        {attachment.type === 'link' && attachment.url && (
                                            <a
                                                href={attachment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                                title="Open link"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        )}
                                        <button
                                            onClick={async () => {
                                                const { removeAttachment } = useStore.getState();
                                                await removeAttachment(selectedNode.id, attachment.id);
                                                toast.success('Attachment removed');
                                            }}
                                            className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add File */}
                        <button
                            onClick={async () => {
                                const { activeFlowId, addAttachment } = useStore.getState();
                                if (!activeFlowId || !window.electron?.showOpenDialog || !window.electron?.uploadAttachment) {
                                    toast.error('Upload not available');
                                    return;
                                }

                                try {
                                    // Show file picker dialog
                                    const filePath = await window.electron.showOpenDialog();
                                    if (!filePath) return; // User canceled

                                    // Extract filename from path
                                    const fileName = filePath.split(/[/\\]/).pop() || 'file';

                                    // Upload file
                                    const result = await window.electron.uploadAttachment(
                                        activeFlowId,
                                        selectedNode.id,
                                        filePath
                                    );

                                    addAttachment(selectedNode.id, {
                                        id: crypto.randomUUID(),
                                        name: fileName,
                                        type: 'file',
                                        path: result.path,
                                        size: result.size,
                                        uploadedAt: new Date().toISOString()
                                    });

                                    toast.success('File attached');
                                } catch (error) {
                                    console.error('Upload error:', error);
                                    toast.error('Failed to upload file');
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] hover:border-gray-600 rounded-lg text-[var(--text-muted)] text-sm transition-colors"
                        >
                            <span>📄</span>
                            Upload File
                        </button>

                        {/* Add Link */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Add link URL..."
                                className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = e.currentTarget;
                                        const url = input.value.trim();
                                        if (url) {
                                            const { addAttachment } = useStore.getState();
                                            addAttachment(selectedNode.id, {
                                                id: crypto.randomUUID(),
                                                name: url,
                                                type: 'link',
                                                url: url,
                                                uploadedAt: new Date().toISOString()
                                            });
                                            input.value = '';
                                            toast.success('Link added');
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Delete Button */}
                <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
                    <button
                        onClick={() => {
                            deleteNode(selectedNode.id);
                            setSelectedNodes([]);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium"
                    >
                        <Trash2 size={16} />
                        Delete {selectedNode.type === 'external' ? 'External System' : 'Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}
