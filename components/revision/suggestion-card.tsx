'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LogicError, ErrorLocation } from '@/types/analysis';

// Extended error type to handle different error formats
interface ExtendedError extends Partial<LogicError> {
  id: string;
  status?: 'pending' | 'accepted' | 'rejected';
  // Support for alternative field names
  category?: string;
  message?: string;
  type?: string;
  description?: string;
  severity: string;
  suggestion?: string;
  location?: ErrorLocation;
  context?: {
    line?: number;
    character?: number;
    snippet?: string;
  };
}

export interface SuggestionCardProps {
  error: ExtendedError;
  onAccept: (errorId: string) => void;
  onReject: (errorId: string) => void;
  className?: string;
}

const priorityConfig = {
  critical: {
    color: 'destructive',
    icon: AlertCircle,
    label: '严重'
  },
  high: {
    color: 'destructive', 
    icon: AlertCircle,
    label: '高'
  },
  medium: {
    color: 'warning',
    icon: Info,
    label: '中'
  },
  low: {
    color: 'secondary',
    icon: Info,
    label: '低'
  }
} as const;

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  error,
  onAccept,
  onReject,
  className
}) => {
  const status = error.status || 'pending';
  const priority = error.severity as keyof typeof priorityConfig;
  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        status === 'accepted' && 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
        status === 'rejected' && 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 opacity-60',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={config.color as any} className="text-xs">
              {config.label}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {error.type || error.category || '未分类'}
            </span>
          </div>
          {status !== 'pending' && (
            <Badge 
              variant={status === 'accepted' ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                status === 'accepted' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
              )}
            >
              {status === 'accepted' ? '已接受' : '已拒绝'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className={cn(
          'space-y-1',
          status === 'rejected' && 'line-through opacity-60'
        )}>
          <p className="text-sm font-medium">问题描述</p>
          <p className="text-sm text-muted-foreground">{error.description || error.message || '无描述'}</p>
        </div>

        {error.suggestion && (
          <div className={cn(
            'space-y-1',
            status === 'rejected' && 'line-through opacity-60'
          )}>
            <p className="text-sm font-medium">修改建议</p>
            <p className="text-sm text-muted-foreground">{error.suggestion}</p>
          </div>
        )}

        {(error.location || error.context) && (
          <div className="space-y-1">
            <p className="text-sm font-medium">位置</p>
            <p className="text-sm text-muted-foreground">
              {error.location?.line || error.location?.lineNumber || error.context?.line ? (
                <>
                  第 {error.location?.line || error.location?.lineNumber || error.context?.line} 行
                  {(error.location?.column || error.context?.character) && 
                    `, 第 ${error.location?.column || error.context?.character} 个字符`}
                </>
              ) : (
                '位置未知'
              )}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex gap-2 w-full">
          <Button
            size="sm"
            variant="default"
            className={cn(
              'flex-1',
              status !== 'pending' && 'pointer-events-none opacity-50'
            )}
            onClick={() => onAccept(error.id)}
            disabled={status !== 'pending'}
          >
            <Check className="h-4 w-4 mr-1" />
            接受
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'flex-1',
              status !== 'pending' && 'pointer-events-none opacity-50'
            )}
            onClick={() => onReject(error.id)}
            disabled={status !== 'pending'}
          >
            <X className="h-4 w-4 mr-1" />
            拒绝
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SuggestionCard;