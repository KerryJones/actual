import React from 'react';
import type { ComponentProps, ReactNode } from 'react';

import type { Menu } from '@actual-app/components/menu';

import { ReportCard } from '../ReportCard';

type DashboardCardProps = {
  children: ReactNode;
  isEditing?: boolean;
  menuItems?: ComponentProps<typeof Menu<string>>['items'];
  onMenuSelect?: ComponentProps<typeof Menu<string>>['onMenuSelect'];
  className?: string;
};

const GLASS_CHROME =
  'dark relative h-full w-full rounded-xl border border-slate-800/50 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl shadow-slate-950/50 text-slate-300 overflow-hidden';

// ReportCard is upstream and stays unmodified for rebase safety; we strip
// its Mercury chrome via inline style overrides and render the obsidian
// surface inside.
export function DashboardCard({
  children,
  isEditing,
  menuItems,
  onMenuSelect,
  className,
}: DashboardCardProps) {
  return (
    <ReportCard
      isEditing={isEditing}
      menuItems={menuItems}
      onMenuSelect={onMenuSelect}
      style={{
        backgroundColor: 'transparent',
        boxShadow: 'none',
        borderRadius: 0,
      }}
    >
      <div className={`${GLASS_CHROME}${className ? ' ' + className : ''}`}>
        {children}
      </div>
    </ReportCard>
  );
}
