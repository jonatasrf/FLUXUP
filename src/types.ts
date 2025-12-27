export type TaskNodeData = {
    label: string;
    description?: string;
    status?: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'done' | 'in_progress' | 'in_review';
    assignee?: string;
    startDate?: string;
    dueDate?: string;
    color?: string;
    checklist?: { id: string; text: string; done: boolean }[];
    estimatedHours?: number;
    actualHours?: number;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    documentUrl?: string;
    url?: string;
    content?: string;
    isMagnetic?: boolean;
    decision?: 'yes' | 'no';
    decisionSwapped?: boolean;
    question?: string;
    externalSystem?: string;
    attachments?: Array<{
        id: string;
        name: string;
        type: 'file' | 'link';
        path?: string;  // For files: relative path from flow folder
        url?: string;   // For links
        size?: number;  // File size in bytes
        uploadedAt: string; // ISO timestamp
    }>;
    // FMEA Fields
    failureMode?: string;
    severity?: number;
    occurrence?: number;
    detection?: number;
    rpn?: number;
    action?: string;
    // Ishikawa Fields
    causes?: {
        method: string[];
        machine: string[];
        material: string[];
        manpower: string[];
        measurement: string[];
        environment: string[];
    };
    // PDCA Fields
    pdca?: {
        plan: string[];
        do: string[];
        check: string[];
        act: string[];
    };
    // 5W2H Fields
    fiveWTwoH?: {
        what: string;
        why: string;
        where: string;
        when: string;
        who: string;
        how: string;
        howMuch: string;
    };
    // SWOT Fields
    swot?: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
    // Prioritization Fields
    prioritization?: {
        method: 'RICE' | 'ICE';
        items: Array<{
            id: string;
            label: string;
            reach?: number;      // RICE only
            impact: number;      // RICE & ICE
            confidence: number;  // RICE & ICE
            effort?: number;     // RICE only
            ease?: number;       // ICE only
            score: number;       // Calculated
        }>;
    };
    // Meeting Fields
    meeting?: {
        date: string; // ISO string
        participants: string[];
        minutes: string; // Ata de reunião
    };
    // Project Charter Fields
    projectCharter?: {
        projectName: string;
        projectManager: string;
        sponsor?: string;
        budget?: string;
        objectives: string[];
        justification: string;
        successCriteria: string[];
        assumptions: string[];
        premise: string[];
        constraints: string[];
        milestones: { date: string; title: string }[];
    };
    // Stakeholder Matrix Fields
    stakeholderMatrix?: {
        stakeholders: Array<{
            id: string;
            name: string;
            role: string;
            power: 'low' | 'high'; // or number 1-5
            interest: 'low' | 'high'; // or number 1-5
            notes?: string;
        }>;
    };
    // WBS Fields
    wbs?: {
        items: Array<{
            id: string;
            code: string;
            name: string;
            cost: string;
            responsible: string;
        }>;
    };
};
