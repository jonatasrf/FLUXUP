import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Check, AlertCircle, Wand2, FileText, Edit } from 'lucide-react';
import { useStore } from '../store/store';
import { generateFlowFromPrompt, analyzeFlow, modifyFlow } from '../utils/aiService';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';

interface AIAssistantModalProps {
    onClose: () => void;
    initialTab?: 'generate' | 'edit' | 'analyze';
}

export function AIAssistantModal({ onClose, initialTab = 'generate' }: AIAssistantModalProps) {
    const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'analyze'>(initialTab);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Analysis State
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [improvedFlow, setImprovedFlow] = useState<{ nodes: any[], edges: any[] } | null>(null);

    const apiKey = useStore((state) => state.apiKey);
    const nodes = useStore((state) => state.nodes);
    const edges = useStore((state) => state.edges);
    const loadState = useStore((state) => state.loadState);
    const saveCurrentFlow = useStore((state) => state.saveCurrentFlow);
    const activeFlowId = useStore((state) => state.activeFlowId);

    // Auto-switch to 'edit' or 'analyze' if there is an active flow, unless explicitly set
    useEffect(() => {
        if (activeFlowId && nodes.length > 0 && initialTab === 'generate') {
            setActiveTab('edit');
        }
    }, [activeFlowId, nodes.length, initialTab]);



    const handleGenerate = async () => {
        if (!apiKey) return toast.error("Please configure API Key in Settings");
        if (!prompt.trim()) return;

        setIsLoading(true);
        try {
            const { nodes: newNodes, edges: newEdges } = await generateFlowFromPrompt(prompt, apiKey);
            loadState({ nodes: newNodes, edges: newEdges });
            await saveCurrentFlow();
            toast.success("Flow generated successfully!");
            onClose();
        } catch (error: any) {
            toast.error("Generation failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!apiKey) return toast.error("Please configure API Key in Settings");
        if (!prompt.trim()) return;

        setIsLoading(true);
        try {
            const result = await modifyFlow(nodes, edges, prompt, apiKey);
            loadState(result);
            await saveCurrentFlow();
            toast.success("Flow updated successfully!");
            onClose();
        } catch (error: any) {
            toast.error("Modification failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!apiKey) return toast.error("Please configure API Key in Settings");

        setIsLoading(true);
        try {
            const result = await analyzeFlow(nodes, edges, apiKey);
            setAnalysis(result.analysis);
            setImprovedFlow(result.improvedFlow);
        } catch (error: any) {
            toast.error("Analysis failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyImprovements = async () => {
        if (!improvedFlow) return;
        try {
            loadState(improvedFlow);
            await saveCurrentFlow();
            toast.success("Improvements applied successfully!");
            onClose();
        } catch (error) {
            toast.error("Failed to apply improvements");
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'generate':
                return (
                    <div className="space-y-4">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-blue-200 text-sm">
                            <p>Describe a process you want to create from scratch. The AI will generate the entire flow for you.</p>
                        </div>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Create a hiring process flow starting with application review..."
                            className="w-full h-40 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg p-3 text-sm text-[var(--text-main)] focus:border-orange-500 focus:outline-none resize-none placeholder-[var(--text-muted)]"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || !prompt.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                Generate Flow
                            </button>
                        </div>
                    </div>
                );
            case 'edit':
                return (
                    <div className="space-y-4">
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-purple-200 text-sm">
                            <p>Describe how you want to modify the current flow. You can add steps, remove tasks, or change logic.</p>
                        </div>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Add a 'Manager Approval' step after 'Code Review'..."
                            className="w-full h-40 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg p-3 text-sm text-[var(--text-main)] focus:border-orange-500 focus:outline-none resize-none placeholder-[var(--text-muted)]"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleEdit}
                                disabled={isLoading || !prompt.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Edit size={16} />}
                                Update Flow
                            </button>
                        </div>
                    </div>
                );
            case 'analyze':
                return (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                                    <Loader2 size={32} className="animate-spin text-orange-500" />
                                    <p className="text-[var(--text-muted)]">Analyzing your flow...</p>
                                </div>
                            ) : analysis ? (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{analysis}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
                                    <Sparkles size={32} />
                                    <p className="text-[var(--text-muted)]">Ready to analyze your flow structure.</p>
                                    <button
                                        onClick={handleAnalyze}
                                        className="mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
                                    >
                                        Start Analysis
                                    </button>
                                </div>
                            )}
                        </div>
                        {improvedFlow && (
                            <div className="pt-4 mt-4 border-t border-[var(--border-color)] flex justify-end flex-shrink-0">
                                <button
                                    onClick={handleApplyImprovements}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg text-sm font-medium transition-all"
                                >
                                    <Check size={16} />
                                    Apply Improvements
                                </button>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--header-bg)] flex-shrink-0">
                    <div className="flex items-center gap-2 text-[var(--text-main)] font-semibold">
                        <Sparkles size={18} className="text-orange-500" />
                        AI Assistant
                    </div>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border-color)] bg-[var(--header-bg)]">
                    {[
                        { id: 'generate', label: 'Generate', icon: Wand2 },
                        { id: 'edit', label: 'Edit', icon: Edit },
                        { id: 'analyze', label: 'Analyze', icon: FileText },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative",
                                activeTab === tab.id ? "text-orange-500" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                    {!apiKey && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 text-xs flex items-center gap-2">
                            <AlertCircle size={14} />
                            API Key is missing. Please go to Settings to configure it.
                        </div>
                    )}
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
