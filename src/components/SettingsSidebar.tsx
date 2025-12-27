import { X, Magnet, Moon, Sun, Palette, RotateCcw } from 'lucide-react';
import { useStore } from '../store/store';
import { clsx } from 'clsx';

interface SettingsSidebarProps {
    onClose: () => void;
}

export function SettingsSidebar({ onClose }: SettingsSidebarProps) {
    const isMagnetismEnabled = useStore((state) => state.isMagnetismEnabled);
    const setMagnetismEnabled = useStore((state) => state.setMagnetismEnabled);
    const theme = useStore((state) => state.theme);
    const setTheme = useStore((state) => state.setTheme);
    const canvasColor = useStore((state) => state.canvasColor);
    const setCanvasColor = useStore((state) => state.setCanvasColor);

    return (
        <div className="absolute left-16 top-0 h-full w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="h-14 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-[var(--bg-sidebar)]">
                <h2 className="font-semibold text-gray-200">Settings</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Editor Settings */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Editor</h3>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-300">
                            <Magnet size={16} />
                            <span className="text-sm">Node Magnetism</span>
                        </div>
                        <button
                            onClick={() => setMagnetismEnabled(!isMagnetismEnabled)}
                            className={clsx(
                                "w-10 h-5 rounded-full transition-colors relative",
                                isMagnetismEnabled ? "bg-orange-500" : "bg-gray-700"
                            )}
                        >
                            <div className={clsx(
                                "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                                isMagnetismEnabled ? "translate-x-5" : "translate-x-0"
                            )} />
                        </button>
                    </div>
                </div>

                {/* Theme Configuration */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Appearance</h3>

                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[var(--text-main)]">
                            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                            <span className="text-sm">Theme Mode</span>
                        </div>
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className={clsx(
                                "w-10 h-5 rounded-full transition-colors relative",
                                theme === 'light' ? "bg-orange-500" : "bg-gray-700"
                            )}
                        >
                            <div className={clsx(
                                "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform",
                                theme === 'light' ? "translate-x-5" : "translate-x-0"
                            )} />
                        </button>
                    </div>

                    {/* Canvas Color */}
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-gray-300">
                            <div className="flex items-center gap-2">
                                <Palette size={16} />
                                <span className="text-sm">Canvas Color</span>
                            </div>
                            <button
                                onClick={() => setCanvasColor(null)}
                                className="p-1 hover:text-white transition-colors"
                                title="Reset to Default"
                            >
                                <RotateCcw size={14} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={canvasColor || (theme === 'dark' ? '#121212' : '#f8f9fa')}
                                onChange={(e) => setCanvasColor(e.target.value)}
                                className="w-8 h-8 rounded border border-[var(--border-color)] bg-transparent cursor-pointer p-0 overflow-hidden"
                            />
                            <input
                                type="text"
                                value={canvasColor || ''}
                                onChange={(e) => setCanvasColor(e.target.value || null)}
                                placeholder="Default (Theme)"
                                className="flex-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded px-2 py-1 text-xs text-[var(--text-main)] focus:border-orange-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* AI Configuration */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Configuration</h3>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-300">Google Gemini API Key</label>
                        <input
                            type="password"
                            value={useStore(state => state.apiKey) || ''}
                            onChange={(e) => useStore.getState().setApiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-main)] focus:border-orange-500 focus:outline-none placeholder-gray-600"
                        />
                        <p className="text-xs text-gray-500">
                            Required for AI flow generation. Your key is stored locally.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
