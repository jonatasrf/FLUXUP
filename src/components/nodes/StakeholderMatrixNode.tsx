import { memo, useCallback, useEffect, useRef } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { NodeHandles } from './NodeHandles';
import { clsx } from 'clsx';


interface StakeholderMatrixNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

export const StakeholderMatrixNode = memo(({ node, selected, onConnectionStart }: StakeholderMatrixNodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const updateNodeDimensions = useStore((state) => state.updateNodeDimensions);
    const nodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!nodeRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { inlineSize: width, blockSize: height } = entry.borderBoxSize[0];
                updateNodeDimensions(node.id, { width, height });
            }
        });

        observer.observe(nodeRef.current);
        return () => observer.disconnect();
    }, [node.id, updateNodeDimensions]);
    const data = node.data.stakeholderMatrix || {
        stakeholders: []
    };

    const stakeholders = data.stakeholders || [];

    const handleChange = useCallback((newStakeholders: typeof stakeholders) => {
        updateNodeData(node.id, {
            stakeholderMatrix: {
                ...node.data.stakeholderMatrix,
                stakeholders: newStakeholders
            } as any
        });
    }, [node.id, node.data.stakeholderMatrix, updateNodeData]);

    const handleAddStakeholder = () => {
        const newStakeholder = {
            id: crypto.randomUUID(),
            name: '',
            role: '',
            power: 'low' as const,
            interest: 'low' as const
        };
        handleChange([...stakeholders, newStakeholder]);
    };

    const handleUpdateStakeholder = (id: string, field: string, value: any) => {
        const newStakeholders = stakeholders.map(s =>
            s.id === id ? { ...s, [field]: value } : s
        );
        handleChange(newStakeholders);
    };

    const handleRemoveStakeholder = (id: string) => {
        const newStakeholders = stakeholders.filter(s => s.id !== id);
        handleChange(newStakeholders);
    };

    const getStrategy = (power: 'low' | 'high', interest: 'low' | 'high') => {
        if (power === 'high' && interest === 'high') return { text: 'Manage Closely', color: 'text-red-400' };
        if (power === 'high' && interest === 'low') return { text: 'Keep Satisfied', color: 'text-orange-400' };
        if (power === 'low' && interest === 'high') return { text: 'Keep Informed', color: 'text-blue-400' };
        return { text: 'Monitor', color: 'text-gray-400' };
    };

    return (
        <div
            ref={nodeRef}
            className={clsx(
                "w-[600px] bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group font-sans flex flex-col",
                selected ? "border-blue-500 shadow-blue-500/20" : "border-[var(--border-color)]"
            )}
        >
            {/* Header */}
            <div className="px-4 py-3 rounded-t-lg flex items-center justify-between border-b bg-[var(--header-bg)] border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-purple-400" />
                    <span className="font-semibold text-sm text-[var(--text-main)] uppercase tracking-wide">
                        Stakeholder Matrix
                    </span>
                </div>
                <button
                    onClick={handleAddStakeholder}
                    className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded hover:bg-purple-500/30 transition-colors"
                >
                    <Plus size={12} /> Add Stakeholder
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* List View */}
                {stakeholders.length > 0 ? (
                    <div className="space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 border border-[var(--border-color)] rounded bg-[var(--bg-main)]">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 text-[10px] uppercase text-[var(--text-muted)] font-bold bg-[var(--bg-sidebar)] p-2 sticky top-0 z-10 border-b border-[var(--border-color)] tracking-wider">
                            <div className="col-span-3">Name / Role</div>
                            <div className="col-span-2 text-center">Power</div>
                            <div className="col-span-2 text-center">Interest</div>
                            <div className="col-span-4 text-center">Strategy</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Rows */}
                        {stakeholders.map((s) => {
                            const strategy = getStrategy(s.power, s.interest);
                            return (
                                <div key={s.id} className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-[var(--bg-sidebar)] transition-colors border-b border-[var(--border-color)] last:border-0">
                                    <div className="col-span-3 flex flex-col gap-1">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent text-[var(--text-main)] text-xs font-medium focus:outline-none nodrag placeholder:text-gray-600"
                                            placeholder="Name"
                                            value={s.name}
                                            onChange={(e) => handleUpdateStakeholder(s.id, 'name', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="w-full bg-transparent text-[var(--text-muted)] text-[10px] focus:outline-none nodrag placeholder:text-gray-700"
                                            placeholder="Role"
                                            value={s.role}
                                            onChange={(e) => handleUpdateStakeholder(s.id, 'role', e.target.value)}
                                        />
                                    </div>

                                    <div className="col-span-2 flex justify-center">
                                        <select
                                            className={clsx(
                                                "text-[10px] uppercase font-bold rounded px-1.5 py-0.5 focus:outline-none nodrag cursor-pointer appearance-none text-center min-w-[50px]",
                                                s.power === 'high' ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-green-500/20 text-green-300 border border-green-500/30"
                                            )}
                                            value={s.power}
                                            onChange={(e) => handleUpdateStakeholder(s.id, 'power', e.target.value)}
                                        >
                                            <option value="low" className="bg-[#1e1e1e]">Low</option>
                                            <option value="high" className="bg-[#1e1e1e]">High</option>
                                        </select>
                                    </div>

                                    <div className="col-span-2 flex justify-center">
                                        <select
                                            className={clsx(
                                                "text-[10px] uppercase font-bold rounded px-1.5 py-0.5 focus:outline-none nodrag cursor-pointer appearance-none text-center min-w-[50px]",
                                                s.interest === 'high' ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                            )}
                                            value={s.interest}
                                            onChange={(e) => handleUpdateStakeholder(s.id, 'interest', e.target.value)}
                                        >
                                            <option value="low" className="bg-[#1e1e1e]">Low</option>
                                            <option value="high" className="bg-[#1e1e1e]">High</option>
                                        </select>
                                    </div>

                                    <div className="col-span-4 flex justify-center">
                                        <span className={clsx(
                                            "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-dashed",
                                            s.power === 'high' && s.interest === 'high' ? "bg-red-500/10 text-red-400 border-red-500/50" :
                                                s.power === 'high' && s.interest === 'low' ? "bg-orange-500/10 text-orange-400 border-orange-500/50" :
                                                    s.power === 'low' && s.interest === 'high' ? "bg-blue-500/10 text-blue-400 border-blue-500/50" :
                                                        "bg-gray-500/10 text-gray-400 border-gray-500/50"
                                        )}>
                                            {strategy.text}
                                        </span>
                                    </div>

                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            onClick={() => handleRemoveStakeholder(s.id)}
                                            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-white/5"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-8 text-sm italic border-2 border-dashed border-[var(--border-color)] rounded">
                        No stakeholders mapped yet.
                    </div>
                )}

                {/* Matrix Visualization */}
                {stakeholders.length > 0 && (
                    <div className="border border-[var(--border-color)] rounded p-4 bg-[var(--bg-main)]">
                        <h4 className="text-xs text-[var(--text-muted)] font-bold uppercase mb-4 text-center">Strategies Map</h4>
                        <div className="relative w-full aspect-video border-l-2 border-b-2 border-gray-600 grid grid-cols-2 grid-rows-2 gap-1 bg-[var(--bg-sidebar)]/50">
                            {/* Labels */}
                            <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Power</div>
                            <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Interest</div>

                            {/* Quadrants */}
                            {/* High Power, Low Interest - Keep Satisfied */}
                            <div className="border border-dashed border-[var(--border-color)] p-2 relative">
                                <span className="absolute top-1 left-1 text-[9px] text-orange-500/50 font-bold uppercase">Keep Satisfied</span>
                                <div className="flex flex-wrap gap-1 mt-4">
                                    {stakeholders.filter(s => s.power === 'high' && s.interest === 'low').map(s => (
                                        <div key={s.id} className="w-2 h-2 rounded-full bg-orange-500" title={`${s.name} (Keep Satisfied)`} />
                                    ))}
                                </div>
                            </div>

                            {/* High Power, High Interest - Manage Closely */}
                            <div className="border border-dashed border-gray-800 p-2 relative bg-red-900/10">
                                <span className="absolute top-1 right-1 text-[9px] text-red-500/50 font-bold uppercase">Manage Closely</span>
                                <div className="flex flex-wrap gap-1 mt-4">
                                    {stakeholders.filter(s => s.power === 'high' && s.interest === 'high').map(s => (
                                        <div key={s.id} className="w-2 h-2 rounded-full bg-red-500" title={`${s.name} (Manage Closely)`} />
                                    ))}
                                </div>
                            </div>

                            {/* Low Power, Low Interest - Monitor */}
                            <div className="border border-dashed border-[var(--border-color)] p-2 relative">
                                <span className="absolute bottom-1 left-1 text-[9px] text-gray-500/50 font-bold uppercase">Monitor</span>
                                <div className="flex flex-wrap gap-1 mt-auto">
                                    {stakeholders.filter(s => s.power === 'low' && s.interest === 'low').map(s => (
                                        <div key={s.id} className="w-2 h-2 rounded-full bg-gray-500" title={`${s.name} (Monitor)`} />
                                    ))}
                                </div>
                            </div>

                            {/* Low Power, High Interest - Keep Informed */}
                            <div className="border border-dashed border-gray-800 p-2 relative">
                                <span className="absolute bottom-1 right-1 text-[9px] text-blue-500/50 font-bold uppercase">Keep Informed</span>
                                <div className="flex flex-wrap gap-1 mt-auto">
                                    {stakeholders.filter(s => s.power === 'low' && s.interest === 'high').map(s => (
                                        <div key={s.id} className="w-2 h-2 rounded-full bg-blue-500" title={`${s.name} (Keep Informed)`} />
                                    ))}
                                </div>
                            </div>
                        </div>
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
});
