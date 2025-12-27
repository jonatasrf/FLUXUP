import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Node, Edge } from '../store/store';
import { calculateReachability, normalizeStatus } from './flowUtils';

export const generateProjectReport = (nodes: Node[], _edges: Edge[]) => {
    const doc = new jsPDF();
    const today = new Date();
    const todayStr = today.toLocaleDateString();

    // Calculate which tasks are deactivated
    const dimmedElements = calculateReachability(nodes, _edges);

    // Filter for task nodes
    const tasks = nodes.filter(n => n.type === 'task') as Node[];
    const totalTasks = tasks.length;

    // Stats
    const statusCounts: Record<string, number> = {
        pending: 0,
        'in-progress': 0,
        completed: 0,
        blocked: 0
    };

    let overdueCount = 0;
    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);
    let hasDates = false;

    const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > 270) {
            doc.addPage();
            y = 20;
        }
    };

    const drawSectionTitle = (title: string, currentY: number) => {
        doc.setFillColor(243, 244, 246); // Light gray (Tailwind gray-100)
        doc.rect(14, currentY - 7, 182, 10, 'F');
        doc.setFontSize(12);
        doc.setTextColor(17, 24, 39); // Dark gray (Tailwind gray-900)
        doc.setFont('helvetica', 'bold');
        doc.text(title, 16, currentY);
        doc.setFont('helvetica', 'normal');
        return currentY + 10;
    };

    tasks.forEach(t => {
        const status = normalizeStatus(t.data.status);
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        if (t.data.dueDate) {
            const due = new Date(t.data.dueDate);
            if (due < today && status !== 'completed') {
                overdueCount++;
            }
            if (due > maxDate) maxDate = due;
            if (due < minDate) minDate = due;
            hasDates = true;
        }
        if (t.data.startDate) {
            const start = new Date(t.data.startDate);
            if (start < minDate) minDate = start;
            if (start > maxDate) maxDate = start;
            hasDates = true;
        }
    });

    // Calculate Hours
    let totalEstimated = 0;
    let totalActual = 0;
    tasks.forEach(t => {
        totalEstimated += t.data.estimatedHours || 0;
        totalActual += t.data.actualHours || 0;
    });

    const completedTasks = statusCounts['completed'] || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Colors
    const colors: Record<string, [number, number, number]> = {
        pending: [156, 163, 175], // Gray
        'in-progress': [59, 130, 246], // Blue
        completed: [34, 197, 94], // Green
        blocked: [239, 68, 68], // Red
        overdue: [220, 38, 38] // Dark Red
    };

    // --- Header ---
    doc.setFillColor(24, 24, 27); // Dark bg
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('Project Status Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated: ${todayStr}`, 14, 30);
    doc.text('FluxUp Project Manager', 160, 30);

    // --- Executive Summary ---
    let y = 50;
    y = drawSectionTitle('Executive Summary', y);
    y += 5;

    // Metrics Cards
    const drawCard = (x: number, title: string, value: string, color: [number, number, number]) => {
        doc.setFillColor(245, 245, 245);
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect(x, y, 40, 25, 2, 2, 'FD');

        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(title, x + 4, y + 8);

        doc.setFontSize(16);
        doc.setTextColor(...color);
        doc.text(value, x + 4, y + 20);
    };

    drawCard(14, 'Total Tasks', totalTasks.toString(), [0, 0, 0]);
    drawCard(60, 'Completion', `${progress}%`, [34, 197, 94]);
    drawCard(106, 'Overdue', overdueCount.toString(), [220, 38, 38]);

    if (hasDates) {
        const duration = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        drawCard(152, 'Duration', `${duration} Days`, [59, 130, 246]);
    }

    // Row 2
    drawCard(14, 'Hours (Est/Act)', `${totalEstimated}h / ${totalActual}h`, totalActual > totalEstimated ? [220, 38, 38] : [59, 130, 246]);
    y += 30; // Extra spacing for second row

    y += 35;

    // --- Status Distribution (Bar Chart) ---
    checkPageBreak(70);
    // --- Status Distribution (Bar Chart) ---
    checkPageBreak(70);
    y = drawSectionTitle('Task Status Distribution', y);
    y += 5;

    // Filter out zero counts for cleaner chart
    const activeStatuses = Object.entries(statusCounts).filter(([_, count]) => count > 0);
    const maxCount = Math.max(...activeStatuses.map(([_, count]) => count), 1);
    const chartHeight = 45;
    const barWidth = 20;

    // Calculate responsive spacing to fit within page width
    const availableWidth = 180; // Safe width within margins
    const totalBars = activeStatuses.length;
    const spacing = totalBars > 0 ? Math.min(35, (availableWidth - (totalBars * barWidth)) / (totalBars - 1 || 1)) : 35;
    const startX = 14 + (availableWidth - (totalBars * barWidth + (totalBars - 1) * spacing)) / 2;

    activeStatuses.forEach(([status, count], idx) => {
        const barHeight = (count / maxCount) * chartHeight;
        const x = startX + (idx * (barWidth + spacing));
        const currentY = y + chartHeight - barHeight;

        // Bar with border
        const color = colors[status] || colors.pending;
        doc.setFillColor(...color);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(x, currentY, barWidth, barHeight, 'FD');

        // Count label on top
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(count.toString(), x + (barWidth / 2), currentY - 3, { align: 'center' });

        // Status label below
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(status, x + (barWidth / 2), y + chartHeight + 6, { align: 'center' });
    });

    y += chartHeight + 15;

    // --- Priority Distribution (Horizontal Bar) ---
    checkPageBreak(40);
    const priorityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    };
    tasks.forEach(t => {
        const p = (t.data.priority || 'medium') as keyof typeof priorityCounts;
        if (priorityCounts[p] !== undefined) priorityCounts[p]++;
    });

    y = drawSectionTitle('Priority Distribution', y);
    y += 5;

    const priorityColors: Record<string, [number, number, number]> = {
        critical: [239, 68, 68],
        high: [249, 115, 22],
        medium: [234, 179, 8],
        low: [34, 197, 94]
    };

    let pX = 14;
    const pWidth = 180;
    const pHeight = 12;

    // Draw stacked bar with borders
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(2);
    Object.entries(priorityCounts).forEach(([priority, count]) => {
        if (count === 0) return;
        const width = (count / totalTasks) * pWidth;
        const color = priorityColors[priority as keyof typeof priorityColors];
        doc.setFillColor(...color);
        doc.rect(pX, y, width, pHeight, 'FD');
        pX += width;
    });

    // Legend below in two rows if needed
    y += pHeight + 8;
    let lX = 14;
    let legendCount = 0;
    Object.entries(priorityCounts).forEach(([priority, count]) => {
        if (count === 0) return;

        // Wrap to second row after 2 items
        if (legendCount === 2) {
            lX = 14;
            y += 6;
        }

        const color = priorityColors[priority as keyof typeof priorityColors];
        doc.setFillColor(...color);
        doc.circle(lX + 2, y + 1.5, 1.5, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        const label = `${priority.charAt(0).toUpperCase() + priority.slice(1)}: ${count}`;
        doc.text(label, lX + 6, y + 3);
        lX += doc.getTextWidth(label) + 12;
        legendCount++;
    });

    y += 12;

    // --- Workload by Assignee (Bar Chart) ---
    const assigneeCounts: Record<string, number> = {};
    tasks.forEach(t => {
        const assignee = t.data.assignee || 'Unassigned';
        assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
    });

    // Top 5 assignees
    const topAssignees = Object.entries(assigneeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topAssignees.length > 0) {
        checkPageBreak(70);
        y = drawSectionTitle('Workload by Assignee (Top 5)', y);
        y += 5;

        const maxWorkload = Math.max(...topAssignees.map(a => a[1]));
        const wBarHeight = 8;
        const wLabelWidth = 35;
        const wChartWidth = 130;

        topAssignees.forEach(([assignee, count]) => {
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            // Truncate long names
            const displayName = assignee.length > 20 ? assignee.substring(0, 17) + '...' : assignee;
            doc.text(displayName, 14, y + 5);

            const width = (count / maxWorkload) * wChartWidth;
            doc.setFillColor(59, 130, 246); // Blue
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.rect(14 + wLabelWidth, y, width, wBarHeight, 'FD');

            // Count/label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(count.toString(), 14 + wLabelWidth + width + 3, y + 5);
            doc.setFont('helvetica', 'normal');
            y += wBarHeight + 5;
        });
        y += 8;
    }




    // --- Timeline (Gantt) ---
    if (hasDates) {
        // Check if we have space, else new page
        if (y > 240) {
            doc.addPage();
            y = 20;
        }

        y = drawSectionTitle('Project Timeline', y);
        y += 5;

        const labelWidth = 50;
        const timelineWidth = 130;
        const totalTime = maxDate.getTime() - minDate.getTime();
        // Add buffer
        const buffer = 1000 * 60 * 60 * 24 * 2; // 2 days
        const timeSpan = totalTime + (buffer * 2);
        const startTime = minDate.getTime() - buffer;

        let currentY = y;

        // Draw Today Line (if within range)
        const todayTime = new Date().getTime();
        let todayX = -1;
        if (todayTime >= startTime && todayTime <= (startTime + timeSpan)) {
            todayX = 14 + labelWidth + ((todayTime - startTime) / timeSpan) * timelineWidth;
        }

        tasks.forEach((task) => {
            if (!task.data.startDate || !task.data.dueDate) return;

            // Pagination Check
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
                currentY = drawSectionTitle('Project Timeline (cont.)', currentY);
                currentY += 5;
            }

            const start = new Date(task.data.startDate).getTime();
            const end = new Date(task.data.dueDate).getTime();

            const x = 14 + labelWidth + ((start - startTime) / timeSpan) * timelineWidth;
            const w = Math.max(2, ((end - start) / timeSpan) * timelineWidth);

            // Row Height
            const rowHeight = 10;

            // Grid lines for this row
            doc.setDrawColor(240, 240, 240);
            doc.line(14 + labelWidth, currentY, 14 + labelWidth, currentY + rowHeight); // Vertical start
            doc.line(14 + labelWidth, currentY + rowHeight, 14 + labelWidth + timelineWidth, currentY + rowHeight); // Horizontal bottom

            // Draw Today Line Segment for this row
            if (todayX > 0) {
                doc.setDrawColor(239, 68, 68); // Red
                doc.setLineWidth(0.5);
                doc.setLineDashPattern([1, 1], 0);
                doc.line(todayX, currentY, todayX, currentY + rowHeight);
                doc.setLineDashPattern([], 0); // Reset
                doc.setLineWidth(0.1); // Reset
            }

            // Bar
            const status = normalizeStatus(task.data.status);
            let color = colors[status] || colors.pending;

            // Check if inactive
            const isDeactivated = dimmedElements.has(task.id);
            if (isDeactivated) {
                color = [200, 200, 200]; // Light Gray for inactive
            }

            doc.setFillColor(...color);
            doc.roundedRect(x, currentY + 2, w, 6, 1, 1, 'F');

            // Label - Auto wrapped
            doc.setFontSize(8);
            doc.setTextColor(isDeactivated ? 150 : 0, isDeactivated ? 150 : 0, isDeactivated ? 150 : 0); // Dimmed text if inactive

            let labelText = task.data.label;
            if (isDeactivated) labelText += " (Inactive)";

            const lines = doc.splitTextToSize(labelText, labelWidth - 2);
            doc.text(lines, 14, currentY + 4);

            currentY += rowHeight;
        });

        // Draw "Today" label at the top of the timeline section if visible
        if (todayX > 0) {
            doc.setFontSize(6);
            doc.setTextColor(239, 68, 68);
            doc.text('Today', todayX - 3, y - 2);
        }

        y = currentY + 20;
    }

    // --- Upcoming Deadlines (Next 7 Days) ---
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const upcomingTasks = tasks.filter(t => {
        const status = normalizeStatus(t.data.status);
        if (!t.data.dueDate || status === 'completed') return false;
        const dueDate = new Date(t.data.dueDate);
        return dueDate >= today && dueDate <= nextWeek;
    }).sort((a, b) => new Date(a.data.dueDate!).getTime() - new Date(b.data.dueDate!).getTime());

    if (upcomingTasks.length > 0) {
        // Check space
        if (y > 240) {
            doc.addPage();
            y = 20;
        }

        y = drawSectionTitle('Upcoming Deadlines (Next 7 Days)', y);
        y += 5;

        const uTableData = upcomingTasks.map(task => [
            task.data.label || '',
            task.data.assignee || '-',
            new Date(task.data.dueDate!).toLocaleDateString(),
            task.data.priority || 'medium'
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Task', 'Assignee', 'Due Date', 'Priority']],
            body: uTableData,
            headStyles: { fillColor: [249, 115, 22] }, // Orange
            alternateRowStyles: { fillColor: [255, 247, 237] }, // Light Orange
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 }
        });

        y = (doc as any).lastAutoTable.finalY + 20;
    }

    // --- Blocked Tasks ---
    const blockedTasks = tasks.filter(t => normalizeStatus(t.data.status) === 'blocked');
    if (blockedTasks.length > 0) {
        if (y > 240) {
            doc.addPage();
            y = 20;
        }
        y = drawSectionTitle('Blocked Tasks (Attention Needed)', y);
        y += 5;

        const bTableData = blockedTasks.map(task => [
            task.data.label || '',
            task.data.assignee || '-',
            task.data.priority || 'medium',
            'Blocked'
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Task', 'Assignee', 'Priority', 'Status']],
            body: bTableData,
            headStyles: { fillColor: [239, 68, 68] }, // Red
            alternateRowStyles: { fillColor: [254, 242, 242] }, // Light Red
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 }
        });

        y = (doc as any).lastAutoTable.finalY + 20;
    }

    // --- Unassigned Tasks ---
    const unassignedTasks = tasks.filter(t => {
        const status = normalizeStatus(t.data.status);
        return !t.data.assignee && status !== 'completed';
    });
    if (unassignedTasks.length > 0) {
        if (y > 240) {
            doc.addPage();
            y = 20;
        }
        y = drawSectionTitle('Unassigned Tasks', y);
        y += 5;

        const uTableData = unassignedTasks.map(task => [
            task.data.label || '',
            task.data.priority || 'medium',
            task.data.status || 'pending',
            task.data.dueDate ? new Date(task.data.dueDate).toLocaleDateString() : '-'
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Task', 'Priority', 'Status', 'Due Date']],
            body: uTableData,
            headStyles: { fillColor: [234, 179, 8] }, // Yellow
            alternateRowStyles: { fillColor: [254, 252, 232] }, // Light Yellow
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 }
        });

        y = (doc as any).lastAutoTable.finalY + 20;
    }

    // --- Detailed Table ---
    doc.addPage();
    let detailY = 20;
    detailY = drawSectionTitle('Detailed Task List', detailY);
    // autoTable startY will be adjusted below
    const tableStartY = detailY + 5;

    const tableData = tasks.map(task => {
        const isDeactivated = dimmedElements.has(task.id);
        return [
            task.data.label || '',
            task.data.status || 'pending',
            task.data.assignee || '-',
            task.data.priority || '-',
            task.data.startDate || '-',
            task.data.dueDate || '-',
            task.data.estimatedHours ? `${task.data.estimatedHours}h` : '-',
            task.data.actualHours ? `${task.data.actualHours}h` : '-',
            isDeactivated ? 'Caminho Desativado' : 'Ativo'
        ];
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [['Task Name', 'Status', 'Assignee', 'Priority', 'Start', 'Due', 'Est.', 'Act.', 'Fluxo']],
        body: tableData,
        headStyles: { fillColor: [24, 24, 27] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { fontSize: 8 },
        didParseCell: (data) => {
            // Color status column
            if (data.section === 'body' && data.column.index === 1) {
                const status = normalizeStatus(data.cell.raw as string);
                if (status === 'completed') {
                    data.cell.styles.textColor = [34, 197, 94];
                } else if (status === 'blocked') {
                    data.cell.styles.textColor = [239, 68, 68];
                } else if (status === 'in-progress') {
                    data.cell.styles.textColor = [59, 130, 246];
                }
            }
            // Color flow status column (last column)
            if (data.section === 'body' && data.column.index === 8) {
                const flowStatus = data.cell.raw as string;
                if (flowStatus === 'Caminho Desativado') {
                    data.cell.styles.textColor = [156, 163, 175]; // Gray
                    data.cell.styles.fontStyle = 'italic';
                }
            }
        }
    });

    y = (doc as any).lastAutoTable.finalY + 20;

    // --- SWOT Analysis ---
    const swotNodes = nodes.filter(n => n.type === 'swot');
    if (swotNodes.length > 0) {
        checkPageBreak(60);
        y = drawSectionTitle('SWOT Analysis', y);
        y += 5;

        swotNodes.forEach(node => {
            const data = node.data.swot;
            if (!data) return;

            checkPageBreak(80);
            doc.setFontSize(12);
            doc.text(node.data.label || 'SWOT Analysis', 14, y);
            y += 8;

            const quadrants = [
                { title: 'Strengths', items: data.strengths, color: [34, 197, 94] },
                { title: 'Weaknesses', items: data.weaknesses, color: [239, 68, 68] },
                { title: 'Opportunities', items: data.opportunities, color: [59, 130, 246] },
                { title: 'Threats', items: data.threats, color: [249, 115, 22] }
            ];

            quadrants.forEach(q => {
                if (q.items.length === 0) return;
                checkPageBreak(15 + (q.items.length * 5));
                doc.setFontSize(10);
                doc.setTextColor(...(q.color as [number, number, number]));
                doc.text(q.title, 14, y);
                y += 5;
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(9);
                q.items.forEach(item => {
                    doc.text(`• ${item}`, 20, y);
                    y += 5;
                });
                y += 3;
            });
            y += 10;
        });
    }

    // --- Prioritization Matrix ---
    const prioNodes = nodes.filter(n => n.type === 'prioritization');
    if (prioNodes.length > 0) {
        checkPageBreak(60);
        y = drawSectionTitle('Prioritization Matrices', y);
        y += 5;

        prioNodes.forEach(node => {
            const data = node.data.prioritization;
            if (!data || data.items.length === 0) return;

            checkPageBreak(40);
            doc.setFontSize(12);
            doc.text(`${node.data.label || 'Matrix'} (${data.method})`, 14, y);
            y += 5;

            const headers = data.method === 'RICE'
                ? [['Item', 'Reach', 'Impact', 'Conf.', 'Effort', 'Score']]
                : [['Item', 'Impact', 'Conf.', 'Ease', 'Score']];

            const body = data.items.map(item => {
                if (data.method === 'RICE') {
                    return [item.label, item.reach || 0, item.impact, `${item.confidence}%`, item.effort || 0, item.score];
                } else {
                    return [item.label, item.impact, item.confidence, item.ease || 0, item.score];
                }
            });

            autoTable(doc, {
                startY: y,
                head: headers,
                body: body as any,
                headStyles: { fillColor: [234, 179, 8] }, // Yellow
                styles: { fontSize: 8 },
                margin: { left: 14, right: 14 }
            });
            y = (doc as any).lastAutoTable.finalY + 15;
        });
    }

    // --- FMEA ---
    const fmeaNodes = nodes.filter(n => n.type === 'fmea');
    if (fmeaNodes.length > 0) {
        checkPageBreak(60);
        y = drawSectionTitle('FMEA Risk Analysis', y);
        y += 5;

        const fmeaBody = fmeaNodes.map(node => [
            node.data.failureMode || 'Unknown Failure Mode',
            node.data.severity || 0,
            node.data.occurrence || 0,
            node.data.detection || 0,
            node.data.rpn || 0,
            node.data.action || '-'
        ]);

        autoTable(doc, {
            startY: y,
            head: [['Failure Mode', 'S', 'O', 'D', 'RPN', 'Recommended Action']],
            body: fmeaBody,
            headStyles: { fillColor: [220, 38, 38] }, // Red
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    const rpn = Number(data.cell.raw);
                    if (rpn >= 100) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- Ishikawa ---
    const ishikawaNodes = nodes.filter(n => n.type === 'ishikawa');
    if (ishikawaNodes.length > 0) {
        checkPageBreak(60);
        y = drawSectionTitle('Ishikawa (Fishbone) Diagrams', y);
        y += 5;

        ishikawaNodes.forEach(node => {
            const causes = node.data.causes;
            if (!causes) return;

            checkPageBreak(60);
            doc.setFontSize(12);
            doc.text(node.data.label || 'Cause & Effect', 14, y);
            y += 8;

            const categories = ['Method', 'Machine', 'Material', 'Manpower', 'Measurement', 'Environment'];
            categories.forEach(cat => {
                const key = cat.toLowerCase() as keyof typeof causes;
                const items = causes[key];
                if (items && items.length > 0) {
                    checkPageBreak(10 + (items.length * 5));
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    doc.text(cat, 14, y);
                    doc.setTextColor(0, 0, 0);
                    y += 5;
                    items.forEach(item => {
                        doc.text(`- ${item}`, 20, y);
                        y += 5;
                    });
                    y += 2;
                }
            });
            y += 10;
        });
    }

    // --- PDCA ---
    const pdcaNodes = nodes.filter(n => n.type === 'pdca');
    if (pdcaNodes.length > 0) {
        checkPageBreak(60);
        y = drawSectionTitle('PDCA Cycles', y);
        y += 5;

        pdcaNodes.forEach(node => {
            const pdca = node.data.pdca;
            if (!pdca) return;

            checkPageBreak(80);
            doc.setFontSize(12);
            doc.text(node.data.label || 'PDCA Cycle', 14, y);
            y += 8;

            const phases = [
                { title: 'Plan', items: pdca.plan, color: [59, 130, 246] },
                { title: 'Do', items: pdca.do, color: [234, 179, 8] },
                { title: 'Check', items: pdca.check, color: [34, 197, 94] },
                { title: 'Act', items: pdca.act, color: [168, 85, 247] }
            ];

            phases.forEach(p => {
                if (p.items.length === 0) return;
                checkPageBreak(15 + (p.items.length * 5));
                doc.setFontSize(10);
                doc.setTextColor(...(p.color as [number, number, number]));
                doc.text(p.title, 14, y);
                y += 5;
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(9);
                p.items.forEach(item => {
                    doc.text(`• ${item}`, 20, y);
                    y += 5;
                });
                y += 3;
            });
            y += 10;
        });
    }

    // --- 5W2H ---
    const fiveWNodes = nodes.filter(n => n.type === 'fiveWTwoH');
    if (fiveWNodes.length > 0) {
        checkPageBreak(60);
        y = drawSectionTitle('5W2H Action Plans', y);
        y += 5;

        const body = fiveWNodes.map(node => {
            const d = node.data.fiveWTwoH || {} as any;
            return [
                node.data.label || 'Action',
                d.what || '-',
                d.why || '-',
                d.who || '-',
                d.when || '-',
                d.where || '-',
                d.how || '-',
                d.howMuch || '-'
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['Action', 'What', 'Why', 'Who', 'When', 'Where', 'How', 'Cost']],
            body: body as any,
            headStyles: { fillColor: [75, 85, 99] }, // Gray
            styles: { fontSize: 7 },
            margin: { left: 14, right: 14 }
        });
        y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Add Page Numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, 195, 290, { align: 'right' });
        doc.text(`FluxUp Report - ${todayStr}`, 14, 290);
    }

    // doc.save(fileName);

    // Open the PDF in a new window
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
};
