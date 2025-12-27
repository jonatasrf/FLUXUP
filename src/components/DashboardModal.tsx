import { X, PieChart, BarChart as BarChartIcon, AlertCircle, Calendar, CheckCircle2, Clock, TrendingUp, FileText, HelpCircle } from 'lucide-react';
import { useStore } from '../store/store';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip } from 'recharts';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { generateProjectReport } from '../utils/pdfGenerator';
import { normalizeStatus } from '../utils/flowUtils';

interface DashboardModalProps {
    onClose: () => void;
}

export function DashboardModal({ onClose }: DashboardModalProps) {
    const { nodes, edges } = useStore();

    // Filter for task nodes
    const tasks = nodes.filter(n => n.type === 'task');
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => normalizeStatus(t.data.status) === 'completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // --- Metrics Calculation ---

    // 1. Status Distribution
    const statusCounts = {
        pending: 0,
        'in-progress': 0,
        completed: 0,
        blocked: 0
    };
    tasks.forEach(t => {
        const status = normalizeStatus(t.data.status);
        if (statusCounts[status] !== undefined) statusCounts[status]++;
    });

    const statusData = [
        { name: 'Completed', value: statusCounts.completed, color: '#22c55e' }, // Green
        { name: 'In Progress', value: statusCounts['in-progress'], color: '#3b82f6' }, // Blue
        { name: 'Pending', value: statusCounts.pending, color: '#737373' }, // Gray
        { name: 'Blocked', value: statusCounts.blocked, color: '#ef4444' }, // Red
    ].filter(d => d.value > 0);

    // 2. Workload by Assignee
    const assigneeCounts: Record<string, number> = {};
    tasks.forEach(t => {
        const assignee = t.data.assignee || 'Unassigned';
        assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
    });

    const workloadData = Object.entries(assigneeCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

    // 3. Overdue Tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasks = tasks.filter(t => {
        const status = normalizeStatus(t.data.status);
        if (!t.data.dueDate || status === 'completed') return false;
        const dueDate = new Date(t.data.dueDate);
        return dueDate < today;
    });

    // 4. Priority Distribution
    const priorityCounts = {
        high: 0,
        medium: 0,
        low: 0,
        critical: 0
    };
    tasks.forEach(t => {
        const priority = (t.data.priority || 'medium') as keyof typeof priorityCounts;
        if (priorityCounts[priority] !== undefined) priorityCounts[priority]++;
    });

    const priorityData = [
        { name: 'Critical', value: priorityCounts.critical, color: '#ef4444' }, // Red
        { name: 'High', value: priorityCounts.high, color: '#f97316' }, // Orange
        { name: 'Medium', value: priorityCounts.medium, color: '#eab308' }, // Yellow
        { name: 'Low', value: priorityCounts.low, color: '#22c55e' }, // Green
    ].filter(d => d.value > 0);

    // 5. Upcoming Deadlines (Next 7 days)
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const upcomingTasks = tasks.filter(t => {
        const status = normalizeStatus(t.data.status);
        if (!t.data.dueDate || status === 'completed') return false;
        const dueDate = new Date(t.data.dueDate);
        return dueDate >= today && dueDate <= nextWeek;
    }).sort((a, b) => new Date(a.data.dueDate!).getTime() - new Date(b.data.dueDate!).getTime());

    // 6. Hours Tracked
    let totalEstimated = 0;
    let totalActual = 0;
    tasks.forEach(t => {
        totalEstimated += t.data.estimatedHours || 0;
        totalActual += t.data.actualHours || 0;
    });

    const [mounted, setMounted] = useState(false);

    // 7. Blocked Tasks
    const blockedTasks = tasks.filter(t => normalizeStatus(t.data.status) === 'blocked');

    // 8. Unassigned Tasks (Pending/In-Progress only)
    const unassignedTasks = tasks.filter(t => {
        const status = normalizeStatus(t.data.status);
        return !t.data.assignee && status !== 'completed';
    });

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm p-8">
            <div className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--header-bg)]">
                    <div className="flex items-center gap-2 text-orange-500">
                        <PieChart size={24} />
                        <h2 className="font-bold text-xl text-[var(--text-main)]">Project Dashboard</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => generateProjectReport(nodes, edges)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors"
                        >
                            <FileText size={16} /> Report
                        </button>
                        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<CheckCircle2 className="text-green-500" />}
                            label="Completion"
                            value={`${progress}%`}
                            subtext={`${completedTasks}/${totalTasks} Tasks`}
                        />
                        <StatCard
                            icon={<Clock className="text-blue-500" />}
                            label="Total Tasks"
                            value={totalTasks}
                        />
                        <StatCard
                            icon={<AlertCircle className="text-red-500" />}
                            label="Overdue"
                            value={overdueTasks.length}
                            alert={overdueTasks.length > 0}
                        />
                        <StatCard
                            icon={<TrendingUp className="text-purple-500" />}
                            label="Hours (Est/Act)"
                            value={`${totalEstimated}h / ${totalActual}h`}
                            subtext={totalActual > totalEstimated ? "Over Budget" : "Under Budget"}
                            alert={totalActual > totalEstimated}
                            progress={totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0}
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Chart */}
                        <div className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col">
                            <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
                                <PieChart size={16} /> Status Distribution
                            </h3>
                            <div className="h-64 w-full">
                                {mounted && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={statusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {statusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1f1f1f', borderColor: '#374151', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="flex justify-center gap-4 mt-2 flex-wrap">
                                {statusData.map(d => (
                                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                        {d.name} ({d.value})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Workload Chart */}
                        <div className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col">
                            <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
                                <BarChartIcon size={16} /> Workload by Assignee
                            </h3>
                            <div className="h-64 w-full">
                                {mounted && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={workloadData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                                            <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={80} />
                                            <BarTooltip
                                                cursor={{ fill: 'var(--border-color)', opacity: 0.2 }}
                                                contentStyle={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                                itemStyle={{ color: 'var(--text-main)' }}
                                            />
                                            <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Priority & Upcoming Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Priority Chart */}
                        <div className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col">
                            <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
                                <AlertCircle size={16} /> Priority Distribution
                            </h3>
                            <div className="h-64 w-full">
                                {mounted && (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={priorityData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {priorityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                                itemStyle={{ color: 'var(--text-main)' }}
                                            />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="flex justify-center gap-4 mt-2 flex-wrap">
                                {priorityData.map(d => (
                                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                        {d.name} ({d.value})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Upcoming Deadlines */}
                        <div className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col">
                            <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
                                <Calendar size={16} className="text-orange-500" /> Upcoming Deadlines (7 Days)
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                {upcomingTasks.length > 0 ? (
                                    upcomingTasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 bg-[var(--header-bg)] rounded-lg border border-[var(--border-color)]">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-main)]">{task.data.label}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{task.data.assignee || 'Unassigned'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-medium text-orange-400">
                                                    {new Date(task.data.dueDate!).toLocaleDateString()}
                                                </p>
                                                <span className={clsx(
                                                    "text-[10px] px-1.5 py-0.5 rounded",
                                                    task.data.priority === 'high' || task.data.priority === 'critical' ? "bg-red-500/10 text-red-400" : "bg-gray-700 text-gray-400"
                                                )}>
                                                    {task.data.priority || 'Normal'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                        <CheckCircle2 size={24} className="mb-2 opacity-50" />
                                        <p className="text-sm">No upcoming deadlines</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Overdue Tasks List */}
                    <div className="bg-[#242424] border border-gray-800 rounded-xl p-4">
                        <h3 className="text-[var(--text-main)] font-semibold mb-4 flex items-center gap-2">
                            <AlertCircle size={16} className="text-red-500" />
                            Overdue Tasks ({overdueTasks.length})
                        </h3>
                        {overdueTasks.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-[var(--header-bg)] text-[var(--text-main)] uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg border-b border-[var(--border-color)]">Task</th>
                                            <th className="px-4 py-3 border-b border-[var(--border-color)]">Assignee</th>
                                            <th className="px-4 py-3 border-b border-[var(--border-color)]">Due Date</th>
                                            <th className="px-4 py-3 rounded-r-lg border-b border-[var(--border-color)]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        {overdueTasks.map(task => (
                                            <tr key={task.id} className="hover:bg-[var(--bg-sidebar)] transition-colors">
                                                <td className="px-4 py-3 font-medium text-[var(--text-main)]">{task.data.label}</td>
                                                <td className="px-4 py-3">{task.data.assignee || '-'}</td>
                                                <td className="px-4 py-3 text-red-400">
                                                    {new Date(task.data.dueDate!).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                                                        Overdue
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                                <CheckCircle2 size={32} className="mb-2 text-green-500/50" />
                                <p>No overdue tasks. Great job!</p>
                            </div>
                        )}
                    </div>

                    {/* Attention Needed Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Blocked Tasks */}
                        <div className="bg-[#242424] border border-gray-800 rounded-xl p-4">
                            <h3 className="text-gray-200 font-semibold mb-4 flex items-center gap-2">
                                <AlertCircle size={16} className="text-red-500" />
                                Blocked Tasks ({blockedTasks.length})
                            </h3>
                            {blockedTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {blockedTasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 bg-[var(--header-bg)] rounded-lg border border-red-500/20">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-main)]">{task.data.label}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{task.data.assignee || 'Unassigned'}</p>
                                            </div>
                                            <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                                                Blocked
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <CheckCircle2 size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No blocked tasks</p>
                                </div>
                            )}
                        </div>

                        {/* Unassigned Tasks */}
                        <div className="bg-[#242424] border border-gray-800 rounded-xl p-4">
                            <h3 className="text-gray-200 font-semibold mb-4 flex items-center gap-2">
                                <HelpCircle size={16} className="text-yellow-500" />
                                Unassigned Tasks ({unassignedTasks.length})
                            </h3>
                            {unassignedTasks.length > 0 ? (
                                <div className="space-y-2">
                                    {unassignedTasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between p-3 bg-[var(--header-bg)] rounded-lg border border-[var(--warning-border)]">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-main)]">{task.data.label}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{task.data.priority || 'Medium'} Priority</p>
                                            </div>
                                            <span className="px-2 py-1 rounded-full bg-[var(--warning-bg)] text-[var(--warning-text)] text-xs border border-[var(--warning-border)]">
                                                Unassigned
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <CheckCircle2 size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">All tasks assigned</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>

    );
}

function StatCard({ icon, label, value, subtext, alert, progress }: { icon: React.ReactNode, label: string, value: string | number, subtext?: string, alert?: boolean, progress?: number }) {
    return (
        <div className={clsx(
            "bg-[var(--input-bg)] border rounded-xl p-4 flex items-center gap-4 transition-all hover:bg-[var(--sidebar-active)]",
            alert ? "border-red-500/50 bg-red-500/5" : "border-[var(--border-color)]"
        )}>
            <div className="p-3 bg-[var(--header-bg)] rounded-lg border border-[var(--border-color)]">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-[var(--text-muted)] text-xs uppercase font-medium">{label}</p>
                <p className={clsx("text-2xl font-bold", alert ? "text-red-400" : "text-[var(--text-main)]")}>
                    {value}
                </p>
                {progress !== undefined && (
                    <div className="w-full h-1.5 bg-gray-700 rounded-full mt-2 overflow-hidden">
                        <div
                            className={clsx("h-full rounded-full", alert ? "bg-red-500" : "bg-blue-500")}
                            style={{ width: `${Math.min(100, progress)}%` }}
                        />
                    </div>
                )}
                {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
            </div>
        </div>
    );
}
