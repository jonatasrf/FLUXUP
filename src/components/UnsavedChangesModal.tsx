import { X, AlertTriangle, Save, Trash2 } from 'lucide-react';

interface UnsavedChangesModalProps {
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export function UnsavedChangesModal({ onSave, onDiscard, onCancel }: UnsavedChangesModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[400px] bg-[#181818] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="h-14 px-6 border-b border-gray-800 flex items-center justify-between bg-[#202020]">
                    <div className="flex items-center gap-2 text-orange-500">
                        <AlertTriangle size={20} />
                        <h2 className="font-semibold text-gray-200">Unsaved Changes</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-300 text-sm leading-relaxed">
                        You have unsaved changes in your current flow.
                        <br />
                        What would you like to do before closing?
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#202020] border-t border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onDiscard}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium border border-red-500/20"
                    >
                        <Trash2 size={16} />
                        Discard
                    </button>
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-orange-500/20"
                    >
                        <Save size={16} />
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
}
