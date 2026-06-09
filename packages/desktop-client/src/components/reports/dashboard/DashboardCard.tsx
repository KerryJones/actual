import React from 'react';
import type { ComponentProps, ReactNode } from 'react';

import type { Menu } from '@actual-app/components/menu';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ReportCard } from '../ReportCard';

type DashboardCardProps = {
  children: ReactNode;
  isEditing?: boolean;
  menuItems?: ComponentProps<typeof Menu<string>>['items'];
  onMenuSelect?: ComponentProps<typeof Menu<string>>['onMenuSelect'];
};

export function DashboardCard({
  children,
  isEditing,
  menuItems,
  onMenuSelect,
}: DashboardCardProps) {
  return (
    <ReportCard
      isEditing={isEditing}
      menuItems={menuItems}
      onMenuSelect={onMenuSelect}
    >
      <View
        style={{
          height: '100%',
          padding: 20,
          color: theme.pageText,
        }}
      >
        {children}
      </View>
    </ReportCard>
  );
}
