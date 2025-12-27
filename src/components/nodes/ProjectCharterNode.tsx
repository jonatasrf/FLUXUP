import { memo, useCallback } from 'react';
import { Briefcase, Plus, Trash2, DollarSign, User, Target, ShieldCheck, AlertCircle } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { clsx } from 'clsx';
import type { TaskNodeData } from '../../types';

interface ProjectCharterNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export const ProjectCharterNode = memo(({ node, selected, onConnectionStart }: ProjectCharterNodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const data = node.data.projectCharter || {
        projectName: '',
        projectManager: '',
        budget: '',
        objectives: [], // Ensure arrays are initialized
        justification: '',
        successCriteria: [],
        assumptions: [],
        premise: [],
        constraints: [],
        milestones: []
    };

    // Ensure arrays exist if data was created with missing fields
    const objectives = data.objectives || [];
    const successCriteria = data.successCriteria || [];
    const assumptions = data.assumptions || [];
    // const milestones = data.milestones || []; // Unused for now

    const handleChange = useCallback((field: keyof NonNullable<TaskNodeData['projectCharter']>, value: any) => {
        updateNodeData(node.id, {
            projectCharter: {
                ...node.data.projectCharter,
                [field]: value
            } as any // Cast because partial update might be tricky with nested spread
        });
    }, [node.id, node.data.projectCharter, updateNodeData]);

    const handleArrayChange = (field: 'objectives' | 'successCriteria' | 'assumptions', index: number, value: string) => {
        const newArray = [...(data[field] || [])];
        newArray[index] = value;
        handleChange(field, newArray);
    };

    const handleAddArrayItem = (field: 'objectives' | 'successCriteria' | 'assumptions') => {
        const newArray = [...(data[field] || []), ''];
        handleChange(field, newArray);
    };

    const handleRemoveArrayItem = (field: 'objectives' | 'successCriteria' | 'assumptions', index: number) => {
        const newArray = [...(data[field] || [])];
        newArray.splice(index, 1);
        handleChange(field, newArray);
    };

    return (
        <div
            className={clsx(
                "w-[450px] bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group font-sans",
                selected ? "border-blue-500 shadow-blue-500/20" : "border-[var(--border-color)]"
            )}
        >
            {/* Header */}
            <div className="px-4 py-3 rounded-t-lg flex items-center gap-2 border-b bg-[var(--header-bg)] border-[var(--border-color)]">
                <Briefcase size={18} className="text-blue-400" />
                <span className="font-semibold text-sm text-[var(--text-main)] uppercase tracking-wide">
                    Project Charter
                </span>
            </div>

            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-[var(--text-muted)] font-medium ml-1">Project Name</label>
                        <input
                            type="text"
                            className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none nodrag"
                            placeholder="Enter project name..."
                            value={data.projectName || ''}
                            onChange={(e) => handleChange('projectName', e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium ml-1">
                            <User size={12} /> Manager
                        </label>
                        <input
                            type="text"
                            className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none nodrag"
                            placeholder="Project Manager"
                            value={data.projectManager || ''}
                            onChange={(e) => handleChange('projectManager', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium ml-1">
                            <DollarSign size={12} /> Budget
                        </label>
                        <input
                            type="text"
                            className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none nodrag"
                            placeholder="e.g. $50,000"
                            value={data.budget || ''}
                            onChange={(e) => handleChange('budget', e.target.value)}
                        />
                    </div>
                </div>

                {/* Justification */}
                <div className="space-y-1">
                    <label className="text-xs text-[var(--text-muted)] font-medium ml-1">Justification</label>
                    <textarea
                        className="w-full bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none resize-none nodrag"
                        rows={3}
                        placeholder="Why are we undertaking this project?"
                        value={data.justification || ''}
                        onChange={(e) => handleChange('justification', e.target.value)}
                    />
                </div>

                {/* Objectives */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium ml-1">
                            <Target size={12} /> Objectives
                        </label>
                        <button
                            onClick={() => handleAddArrayItem('objectives')}
                            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                    <div className="space-y-2">
                        {objectives.map((obj, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none nodrag"
                                    placeholder="Define objective..."
                                    value={obj}
                                    onChange={(e) => handleArrayChange('objectives', index, e.target.value)}
                                />
                                <button
                                    onClick={() => handleRemoveArrayItem('objectives', index)}
                                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {objectives.length === 0 && (
                            <div className="text-xs text-[var(--text-muted)] italic ml-1">No objectives defined.</div>
                        )}
                    </div>
                </div>

                {/* Success Criteria */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium ml-1">
                            <ShieldCheck size={12} /> Success Criteria
                        </label>
                        <button
                            onClick={() => handleAddArrayItem('successCriteria')}
                            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                    <div className="space-y-2">
                        {successCriteria.map((crit, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none nodrag"
                                    placeholder="Criterion for success..."
                                    value={crit}
                                    onChange={(e) => handleArrayChange('successCriteria', index, e.target.value)}
                                />
                                <button
                                    onClick={() => handleRemoveArrayItem('successCriteria', index)}
                                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {successCriteria.length === 0 && (
                            <div className="text-xs text-gray-500 italic ml-1">No success criteria defined.</div>
                        )}
                    </div>
                </div>

                {/* Assumptions */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium ml-1">
                            <AlertCircle size={12} /> Assumptions
                        </label>
                        <button
                            onClick={() => handleAddArrayItem('assumptions')}
                            className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                    <div className="space-y-2">
                        {assumptions.map((assumption, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-[var(--input-bg)] text-[var(--text-main)] text-sm rounded p-2 border border-[var(--border-color)] focus:border-blue-500 focus:outline-none nodrag"
                                    placeholder="Assumption..."
                                    value={assumption}
                                    onChange={(e) => handleArrayChange('assumptions', index, e.target.value)}
                                />
                                <button
                                    onClick={() => handleRemoveArrayItem('assumptions', index)}
                                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {assumptions.length === 0 && (
                            <div className="text-xs text-gray-500 italic ml-1">No assumptions defined.</div>
                        )}
                    </div>
                </div>

            </div>

            {/* Connection Points */}
            {/* Left (Target) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-[var(--bg-main)] border-2 border-[var(--border-color)] rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-left-1.5 top-1/2 -translate-y-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="target"
                data-handle-id="left"
            />

            {/* Right (Source) */}
            <div
                className={clsx(
                    "absolute w-3 h-3 bg-gray-500 rounded-full z-20 cursor-crosshair connection-handle hover:bg-orange-500 hover:scale-125 transition-all",
                    "-right-1.5 top-1/2 -translate-y-1/2"
                )}
                data-node-id={node.id}
                data-handle-type="source"
                data-handle-id="right"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onConnectionStart) {
                        onConnectionStart(node.id, 'source', e.clientX, e.clientY, 'right');
                    }
                }}
            />
        </div>
    );
});
