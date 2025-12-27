import { Plus } from 'lucide-react';
import { useStore } from '../store/store';

export function EmptyState() {
    const addNode = useStore((state) => state.addNode);
    const createFlow = useStore((state) => state.createFlow);
    const activeFlowId = useStore((state) => state.activeFlowId);

    const handleCreateFirstTask = async () => {
        // If no active flow, create one first
        let currentFlowId = activeFlowId;
        if (!currentFlowId) {
            await createFlow();
            // Get the new ID directly from store state
            currentFlowId = useStore.getState().activeFlowId;
        }

        if (!currentFlowId) return; // Should not happen

        const id = crypto.randomUUID();
        const transform = useStore.getState().transform;

        const centerX = (window.innerWidth / 2 - transform.x) / transform.k;
        const centerY = (window.innerHeight / 2 - transform.y) / transform.k;

        addNode({
            id,
            type: 'task',
            position: { x: centerX - 128, y: centerY - 50 },
            data: { label: 'My First Task', status: 'pending' },
            width: 256,
            height: 100
        });

        // Trigger centerFlow event after node is added
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('centerFlow'));
        }, 100);
    };

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div className="bg-[#181818] border border-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-md pointer-events-auto animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Plus size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Start Your Workflow</h2>
                <p className="text-gray-400 mb-8">
                    Your canvas is empty. Create your first task to begin organizing your work.
                </p>
                <button
                    onClick={handleCreateFirstTask}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                    <Plus size={20} />
                    Create First Task
                </button>
            </div>
        </div>
    );
}
