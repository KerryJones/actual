// FINANCE FORK: shared track+fill bar used by FIProgressCard and TopMoversCard.
import React from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type ProgressBarProps = {
  /** 0..100. Caller is responsible for clamping. */
  percent: number;
  color: string;
  height?: number;
};

export function ProgressBar({ percent, color, height = 8 }: ProgressBarProps) {
  const radius = height / 2;
  return (
    <View
      style={{
        height,
        backgroundColor: theme.tableBorder,
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${percent}%`,
          height: '100%',
          backgroundColor: color,
        }}
      />
    </View>
  );
}
