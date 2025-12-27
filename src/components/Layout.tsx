import React, { useState, useEffect } from 'react';

import { clsx } from 'clsx';
import { Toaster } from 'sonner';
import { sidebarRegistry } from '../registry/SidebarRegistry';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { useStore } from '../store/store';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    const saveCurrentFlow = useStore(state => state.saveCurrentFlow);
    const theme = useStore(state => state.theme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const electron = (window as any).electron;
        if (!electron) return;

        const handleCloseRequest = () => {
            if (useStore.getState().hasUnsavedChanges) {
                setShowUnsavedModal(true);
            } else {
                electron.confirmClose(false);
            }
        };

        electron.onCloseRequested(handleCloseRequest);

        return () => {
            // Cleanup if needed (though ipcRenderer.on usually persists)
        };
    }, []);

    const handleSaveAndClose = async () => {
        try {
            await saveCurrentFlow();
            (window as any).electron.confirmClose(true);
        } catch (error) {
            console.error('Failed to save before close:', error);
            // Optionally show error toast, but we might want to close anyway or stay open
        }
    };

    const handleDiscardAndClose = () => {
        (window as any).electron.confirmClose(false);
    };

    const sidebarItems = sidebarRegistry.getItems();
    const ActiveComponent = activeItemId ? sidebarItems.find(i => i.id === activeItemId)?.component : null;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
            {/* Sidebar */}
            <aside className="w-16 flex flex-col items-center py-4 border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] z-50">
                <div className="mb-8">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-xl">
                        F
                    </div>
                </div>

                <nav className="flex-1 flex flex-col gap-4 w-full items-center">
                    {sidebarItems.map(item => (
                        <SidebarButton
                            key={item.id}
                            icon={<item.icon />}
                            label={item.label}
                            active={activeItemId === item.id}
                            onClick={() => setActiveItemId(activeItemId === item.id ? null : item.id)}
                        />
                    ))}
                </nav>
            </aside>

            {/* Active Sidebar Component */}
            {ActiveComponent && <ActiveComponent onClose={() => setActiveItemId(null)} />}

            {/* Unsaved Changes Modal */}
            {showUnsavedModal && (
                <UnsavedChangesModal
                    onSave={handleSaveAndClose}
                    onDiscard={handleDiscardAndClose}
                    onCancel={() => setShowUnsavedModal(false)}
                />
            )}

            {/* Backdrop - Click outside to close sidebar */}
            {activeItemId && (
                <div
                    className="fixed inset-0 bg-black/50 z-30"
                    onClick={() => setActiveItemId(null)}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">


                {/* Canvas Area */}
                <main className="flex-1 relative bg-[var(--bg-main)]">
                    {children}
                    <Toaster theme={theme} position="top-center" />
                </main>
            </div>
        </div>
    );
}

function SidebarButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <button
            className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors group relative",
                active ? "bg-gray-800 text-orange-500" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            )}
            onClick={onClick}
        >
            {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                {label}
            </span>
        </button>
    );
}

