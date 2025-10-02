'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react';

export type ActType =
  | 'ACT1_DIAGNOSTICS'
  | 'ACT2_CHARACTER'
  | 'ACT3_WORLDBUILDING'
  | 'ACT4_PACING'
  | 'ACT5_THEME';

export interface ActInfo {
  type: ActType;
  label: string;
  shortLabel: string;
  description: string;
}

const ACT_INFO: Record<ActType, ActInfo> = {
  ACT1_DIAGNOSTICS: {
    type: 'ACT1_DIAGNOSTICS',
    label: 'Act 1: 基础诊断',
    shortLabel: 'Act 1',
    description: '识别剧本中的逻辑错误和不一致性'
  },
  ACT2_CHARACTER: {
    type: 'ACT2_CHARACTER',
    label: 'Act 2: 角色弧光',
    shortLabel: 'Act 2',
    description: '深化角色发展和内在矛盾'
  },
  ACT3_WORLDBUILDING: {
    type: 'ACT3_WORLDBUILDING',
    label: 'Act 3: 世界构建',
    shortLabel: 'Act 3',
    description: '完善故事世界的逻辑和细节'
  },
  ACT4_PACING: {
    type: 'ACT4_PACING',
    label: 'Act 4: 节奏调整',
    shortLabel: 'Act 4',
    description: '优化叙事节奏和戏剧张力'
  },
  ACT5_THEME: {
    type: 'ACT5_THEME',
    label: 'Act 5: 主题提炼',
    shortLabel: 'Act 5',
    description: '强化主题表达和深层含义'
  }
};

export type ActStatus = 'completed' | 'current' | 'upcoming';

export interface ActProgressBarProps {
  currentAct: ActType;
  completedActs: ActType[];
  className?: string;
  onActClick?: (act: ActType) => void;
  compact?: boolean;
}

function getActStatus(
  act: ActType,
  currentAct: ActType,
  completedActs: ActType[]
): ActStatus {
  if (completedActs.includes(act)) {
    return 'completed';
  }
  if (act === currentAct) {
    return 'current';
  }
  return 'upcoming';
}

function getActIcon(status: ActStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5" />;
    case 'current':
      return <PlayCircle className="w-5 h-5" />;
    case 'upcoming':
      return <Circle className="w-5 h-5" />;
  }
}

function getActColor(status: ActStatus): string {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'current':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'upcoming':
      return 'text-gray-400 bg-gray-50 border-gray-200';
  }
}

export function ActProgressBar({
  currentAct,
  completedActs,
  className,
  onActClick,
  compact = false
}: ActProgressBarProps) {
  const acts: ActType[] = [
    'ACT1_DIAGNOSTICS',
    'ACT2_CHARACTER',
    'ACT3_WORLDBUILDING',
    'ACT4_PACING',
    'ACT5_THEME'
  ];

  return (
    <div className={cn('w-full', className)}>
      {/* Progress bar */}
      <div className="flex items-center justify-between gap-2">
        {acts.map((act, index) => {
          const actInfo = ACT_INFO[act];
          const status = getActStatus(act, currentAct, completedActs);
          const icon = getActIcon(status);
          const colorClass = getActColor(status);
          const isClickable = onActClick && status !== 'upcoming';

          return (
            <React.Fragment key={act}>
              {/* Act step */}
              <div
                className={cn(
                  'flex flex-col items-center gap-2 flex-1',
                  isClickable && 'cursor-pointer hover:opacity-80',
                  !isClickable && 'cursor-not-allowed'
                )}
                onClick={() => isClickable && onActClick(act)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    onActClick(act);
                  }
                }}
              >
                {/* Icon and label */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full border-2 p-3 transition-colors',
                    colorClass
                  )}
                >
                  {icon}
                </div>

                {/* Act number and status badge */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-600">
                    {actInfo.shortLabel}
                  </span>
                  {status === 'current' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                      进行中
                    </Badge>
                  )}
                  {status === 'completed' && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-600">
                      已完成
                    </Badge>
                  )}
                </div>

                {/* Description (non-compact mode) */}
                {!compact && (
                  <p className="text-xs text-center text-gray-500 max-w-[120px]">
                    {actInfo.description}
                  </p>
                )}
              </div>

              {/* Connector line */}
              {index < acts.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1',
                    status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current act info card (compact mode) */}
      {compact && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900">
            {ACT_INFO[currentAct].label}
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            {ACT_INFO[currentAct].description}
          </p>
        </div>
      )}
    </div>
  );
}
