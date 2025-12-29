import { memo } from 'react';
import { HelpCircle } from 'lucide-react';
import { useStore, type Node } from '../../store/store';
import { NodeHandles } from './NodeHandles';
import { clsx } from 'clsx';


interface FiveWTwoHNodeProps {
    node: Node;
    selected: boolean;
    onConnectionStart?: (nodeId: string, handleType: 'source' | 'target', clientX: number, clientY: number, handleId?: string) => void;
}

const FIELDS = [
    { key: 'what', label: 'What', sub: '(Action)', color: 'text-blue-400' },
    { key: 'why', label: 'Why', sub: '(Reason)', color: 'text-purple-400' },
    { key: 'where', label: 'Where', sub: '(Location)', color: 'text-green-400' },
    { key: 'when', label: 'When', sub: '(Time)', color: 'text-yellow-400' },
    { key: 'who', label: 'Who', sub: '(Responsible)', color: 'text-orange-400' },
    { key: 'how', label: 'How', sub: '(Method)', color: 'text-cyan-400' },
    { key: 'howMuch', label: 'How Much', sub: '(Cost)', color: 'text-red-400' }
] as const;

export const FiveWTwoHNode = memo(({ node, selected, onConnectionStart }: FiveWTwoHNodeProps) => {
    const updateNodeData = useStore((state) => state.updateNodeData);
    const data = node.data;
    const fiveWTwoH = data.fiveWTwoH || {
        what: '',
        why: '',
        where: '',
        when: '',
        who: '',
        how: '',
        howMuch: ''
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(node.id, { label: e.target.value });
    };

    return (
        <div
            className={clsx(
                "w-[400px] bg-[var(--bg-sidebar)] rounded-lg shadow-xl border-2 transition-all duration-200 relative group overflow-hidden",
                selected ? "border-blue-500 shadow-blue-500/20" : "border-[var(--border-color)]"
            )}
        >
            {/* Header */}
            <div className="px-4 py-2 bg-[var(--header-bg)] flex items-center justify-between border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-blue-400" />
                    <span className="font-semibold text-sm text-[var(--text-main)]">5W2H Action Plan</span>
                </div>
                <input
                    className="bg-transparent text-right text-[var(--text-muted)] text-xs focus:outline-none focus:text-[var(--text-main)] transition-colors"
                    placeholder="Action Title"
                    value={data.label || ''}
                    onChange={handleLabelChange}
                />
            </div>

            {/* Table Layout */}
            <div className="divide-y divide-[var(--border-color)]">
                {FIELDS.map((field) => (
                    <div key={field.key} className="flex text-xs">
                        <div className="w-24 flex-shrink-0 bg-[var(--bg-main)]/50 p-2 border-r border-[var(--border-color)] flex flex-col justify-center">
                            <span className={clsx("font-bold uppercase", field.color)}>{field.label}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">{field.sub}</span>
                        </div>
                        <div className="flex-1 min-h-[40px] flex items-center bg-[var(--bg-sidebar)]">
                            <textarea
                                className="w-full h-full min-h-[40px] bg-transparent text-[var(--text-main)] p-2 resize-none focus:outline-none focus:bg-[var(--bg-main)]/50 transition-colors nodrag"
                                placeholder="..."
                                value={fiveWTwoH[field.key as keyof typeof fiveWTwoH] || ''}
                                onChange={(e) => {
                                    const newFiveWTwoH = { ...fiveWTwoH };
                                    // @ts-ignore
                                    newFiveWTwoH[field.key] = e.target.value;
                                    updateNodeData(node.id, { fiveWTwoH: newFiveWTwoH });
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Standard 4-side handles */}
            <NodeHandles
                nodeId={node.id}
                onConnectionStart={onConnectionStart}
            />

        </div>
    );
});
