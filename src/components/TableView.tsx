import { useStore } from '../store/store';
import { clsx } from 'clsx';
import { useState, useMemo } from 'react';
import {
    Search, Filter, Calendar, User,
    ChevronDown, ChevronUp
} from 'lucide-react';
import type { TaskNodeData } from '../types';

export function TableView() {
    const { nodes, updateNodeData } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof TaskNodeData | 'label', direction: 'asc' | 'desc' } | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Filter only task nodes
    const tasks = useMemo(() => {
        return nodes.filter(n => n.type === 'task');
    }, [nodes]);

    // Filter and Sort
    const filteredTasks = useMemo(() => {
        let result = [...tasks];

        // Search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.data.label.toLowerCase().includes(lowerQuery) ||
                t.data.assignee?.toLowerCase().includes(lowerQuery)
            );
        }

        // Status Filter
        if (statusFilter !== 'all') {
            result = result.filter(t => t.data.status === statusFilter);
        }

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: any = sortConfig.key === 'label' ? a.data.label : a.data[sortConfig.key];
                let bValue: any = sortConfig.key === 'label' ? b.data.label : b.data[sortConfig.key];

                // Handle undefined
                if (aValue === undefined) aValue = '';
                if (bValue === undefined) bValue = '';

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [tasks, searchQuery, sortConfig, statusFilter]);

    const handleSort = (key: keyof TaskNodeData | 'label') => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'completed':
            case 'done': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'in-progress':
            case 'in_progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'blocked': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'in_review': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'critical': return 'text-red-500';
            case 'high': return 'text-orange-500';
            case 'medium': return 'text-yellow-500';
            case 'low': return 'text-green-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-main)] text-[var(--text-main)]">
            {/* Toolbar */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between gap-4 bg-[var(--bg-sidebar)]">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors text-[var(--text-main)]"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 text-[var(--text-main)]"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="blocked">Blocked</option>
                        </select>
                    </div>
                </div>

                <div className="text-sm text-gray-500">
                    {filteredTasks.length} tasks found
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[var(--header-bg)] sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-4 font-medium text-[var(--text-muted)] text-sm border-b border-[var(--border-color)] w-[40%] cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => handleSort('label')}>
                                <div className="flex items-center gap-2">
                                    Task Name
                                    {sortConfig?.key === 'label' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th className="p-4 font-medium text-[var(--text-muted)] text-sm border-b border-[var(--border-color)] w-[15%] cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => handleSort('status')}>
                                <div className="flex items-center gap-2">
                                    Status
                                    {sortConfig?.key === 'status' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th className="p-4 font-medium text-gray-400 text-sm border-b border-gray-800 w-[15%] cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('assignee')}>
                                <div className="flex items-center gap-2">
                                    Assignee
                                    {sortConfig?.key === 'assignee' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th className="p-4 font-medium text-gray-400 text-sm border-b border-gray-800 w-[15%] cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('dueDate')}>
                                <div className="flex items-center gap-2">
                                    Due Date
                                    {sortConfig?.key === 'dueDate' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th className="p-4 font-medium text-gray-400 text-sm border-b border-gray-800 w-[15%] cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('priority')}>
                                <div className="flex items-center gap-2">
                                    Priority
                                    {sortConfig?.key === 'priority' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {filteredTasks.map(task => (
                            <tr key={task.id} className="hover:bg-[var(--bg-sidebar)] transition-colors group">
                                <td className="p-4">
                                    <input
                                        type="text"
                                        value={task.data.label}
                                        onChange={(e) => updateNodeData(task.id, { label: e.target.value })}
                                        className="bg-transparent border-none focus:ring-0 w-full text-[var(--text-main)] font-medium placeholder-[var(--text-muted)]"
                                        placeholder="Task Name"
                                    />
                                </td>
                                <td className="p-4">
                                    <select
                                        value={task.data.status || 'pending'}
                                        onChange={(e) => updateNodeData(task.id, { status: e.target.value as any })}
                                        className={clsx(
                                            "px-2 py-1 rounded text-xs border appearance-none cursor-pointer outline-none",
                                            getStatusColor(task.data.status)
                                        )}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="blocked">Blocked</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[var(--border-color)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                                            {task.data.assignee ? task.data.assignee.charAt(0).toUpperCase() : <User size={12} />}
                                        </div>
                                        <input
                                            type="text"
                                            value={task.data.assignee || ''}
                                            onChange={(e) => updateNodeData(task.id, { assignee: e.target.value })}
                                            className="bg-transparent border-none focus:ring-0 w-full text-sm text-gray-400"
                                            placeholder="Unassigned"
                                        />
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Calendar size={14} />
                                        <input
                                            type="date"
                                            value={task.data.dueDate || ''}
                                            onChange={(e) => updateNodeData(task.id, { dueDate: e.target.value })}
                                            className="bg-transparent border-none focus:ring-0 text-[var(--text-muted)] w-full [color-scheme:var(--color-scheme)]"
                                        />
                                    </div>
                                </td>
                                <td className="p-4">
                                    <select
                                        value={task.data.priority || 'medium'}
                                        onChange={(e) => updateNodeData(task.id, { priority: e.target.value as any })}
                                        className={clsx(
                                            "bg-transparent border-none focus:ring-0 text-sm font-medium cursor-pointer",
                                            getPriorityColor(task.data.priority)
                                        )}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {filteredTasks.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    No tasks found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
