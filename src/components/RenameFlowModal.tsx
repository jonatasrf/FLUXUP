import { useState } from 'react';
import { X, Type } from 'lucide-react';

interface RenameFlowModalProps {
    currentName: string;
    onSave: (newName: string) => void;
    onCancel: () => void;
}

export function RenameFlowModal({ currentName, onSave, onCancel }: RenameFlowModalProps) {
    const [name, setName] = useState(currentName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[400px] bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="h-14 px-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-main)] opacity-100">
                    <div className="flex items-center gap-2 text-orange-500">
                        <Type size={20} />
                        <h2 className="font-semibold text-[var(--text-main)]">Name Your Flow</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6">
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                            Flow Name
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-orange-500 transition-colors placeholder-gray-500"
                            placeholder="e.g., My Awesome Project"
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-orange-500/20"
                        >
                            Save Flow
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
