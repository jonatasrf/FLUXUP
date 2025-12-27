import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SidebarItem {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    component?: React.ComponentType<any>; // For custom sidebar views
    order?: number;
}

class SidebarRegistry {
    private static instance: SidebarRegistry;
    private items: Map<string, SidebarItem> = new Map();

    private constructor() { }

    public static getInstance(): SidebarRegistry {
        if (!SidebarRegistry.instance) {
            SidebarRegistry.instance = new SidebarRegistry();
        }
        return SidebarRegistry.instance;
    }

    public register(item: SidebarItem): void {
        this.items.set(item.id, item);
    }

    public getItems(): SidebarItem[] {
        return Array.from(this.items.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    }
}

export const sidebarRegistry = SidebarRegistry.getInstance();
