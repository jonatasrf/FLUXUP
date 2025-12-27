import { nodeRegistry } from './NodeRegistry';
import { sidebarRegistry } from './SidebarRegistry';
import { Layers, Settings, LayoutDashboard } from 'lucide-react';

// Core Nodes
import { TaskNode } from '../components/nodes/TaskNode';
import { NoteNode } from '../components/nodes/NoteNode';
import { PointNode } from '../components/nodes/PointNode';
import { DocumentNode } from '../components/nodes/DocumentNode';
import { ExternalNode } from '../components/nodes/ExternalNode';
import { DecisionNode } from '../components/nodes/DecisionNode';
import { FMEANode } from '../components/nodes/FMEANode';
import { IshikawaNode } from '../components/nodes/IshikawaNode';
import { PDCANode } from '../components/nodes/PDCANode';
import { FiveWTwoHNode } from '../components/nodes/FiveWTwoHNode';
import { SWOTNode } from '../components/nodes/SWOTNode';
import { PrioritizationNode } from '../components/nodes/PrioritizationNode';
import { MeetingNode } from '../components/nodes/MeetingNode';
import { ProjectCharterNode } from '../components/nodes/ProjectCharterNode';
import { StakeholderMatrixNode } from '../components/nodes/StakeholderMatrixNode';
import { WBSNode } from '../components/nodes/WBSNode';

// Core Sidebar Views
import { FlowListSidebar } from '../components/FlowListSidebar';
import { SettingsSidebar } from '../components/SettingsSidebar';
import { DashboardModal } from '../components/DashboardModal';

export const registerCoreModules = () => {
    // Register Nodes
    nodeRegistry.register('task', TaskNode);
    nodeRegistry.register('note', NoteNode);
    nodeRegistry.register('point', PointNode);
    nodeRegistry.register('document', DocumentNode);
    nodeRegistry.register('external', ExternalNode);
    nodeRegistry.register('decision', DecisionNode);
    nodeRegistry.register('fmea', FMEANode);
    nodeRegistry.register('ishikawa', IshikawaNode);
    nodeRegistry.register('pdca', PDCANode);
    nodeRegistry.register('fiveWTwoH', FiveWTwoHNode);
    nodeRegistry.register('swot', SWOTNode);
    nodeRegistry.register('prioritization', PrioritizationNode);
    nodeRegistry.register('meeting', MeetingNode);
    nodeRegistry.register('projectCharter', ProjectCharterNode);
    nodeRegistry.register('stakeholderMatrix', StakeholderMatrixNode);
    nodeRegistry.register('wbs', WBSNode);

    // Register Sidebar Items
    sidebarRegistry.register({
        id: 'flows',
        label: 'Flows',
        icon: Layers,
        component: FlowListSidebar,
        order: 10
    });

    sidebarRegistry.register({
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        component: DashboardModal,
        order: 20
    });

    sidebarRegistry.register({
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        component: SettingsSidebar,
        order: 999
    });
};
