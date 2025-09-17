'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
// @ts-ignore - react-window types issue
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogicError } from '@/types/analysis';
import { DEFAULT_THEME } from '@/types/visualization';
import { AlertCircle, ChevronRight, MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizedErrorListProps {
  errors: LogicError[];
  selectedError?: LogicError | null;
  onErrorSelect?: (error: LogicError) => void;
  title?: string;
  height?: number;
  itemHeight?: number;
}

interface ErrorRowData {
  errors: LogicError[];
  selectedError?: LogicError | null;
  onErrorSelect?: (error: LogicError) => void;
}

// Move these outside to avoid recreating on each render
const severityVariants = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'outline'
} as const;

const getSeverityColor = (severity: string) => {
  return DEFAULT_THEME.colors[severity as keyof typeof DEFAULT_THEME.colors];
};

const getSeverityVariant = (severity: string): any => {
  return severityVariants[severity as keyof typeof severityVariants] || 'outline';
};

const ErrorRow = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: ErrorRowData;
}>(({ index, style, data }) => {
  const { errors, selectedError, onErrorSelect } = data;
  const error = errors[index];
  
  const isSelected = selectedError?.id === error.id;
  
  return (
    <div style={style}>
      <div
        className={cn(
          'mx-2 p-3 border rounded-lg cursor-pointer transition-all',
          'hover:shadow-md hover:border-blue-300',
          isSelected && 'border-blue-500 bg-blue-50 shadow-md'
        )}
        onClick={() => onErrorSelect?.(error)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={getSeverityVariant(error.severity)}>
                {error.severity}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {error.type}
              </Badge>
              {error.location.sceneNumber && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} />
                  <span>Scene {error.location.sceneNumber}</span>
                </div>
              )}
              {error.location.characterName && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} />
                  <span>{error.location.characterName}</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-gray-700 line-clamp-2">
              {error.description}
            </p>
            
            {error.suggestion && (
              <p className="text-xs text-blue-600 italic line-clamp-1">
                Suggestion: {error.suggestion}
              </p>
            )}
          </div>
          
          <ChevronRight 
            size={20} 
            className={cn(
              'text-gray-400 transition-transform',
              isSelected && 'rotate-90'
            )}
          />
        </div>
      </div>
    </div>
  );
});

ErrorRow.displayName = 'ErrorRow';

export const OptimizedErrorList = React.memo<OptimizedErrorListProps>(({
  errors,
  selectedError,
  onErrorSelect,
  title = 'Error List',
  height = 600,
  itemHeight = 120
}) => {
  // Progressive rendering for large datasets
  const LARGE_DATASET_THRESHOLD = 500;
  const ITEMS_PER_PAGE = 50;
  const useVirtualScrolling = errors.length > 50 && errors.length < LARGE_DATASET_THRESHOLD;
  const usePagination = errors.length >= LARGE_DATASET_THRESHOLD;
  
  const [currentPage, setCurrentPage] = useState(0);
  const [displayedErrors, setDisplayedErrors] = useState<LogicError[]>([]);
  
  // Reset page when errors change
  useEffect(() => {
    setCurrentPage(0);
  }, [errors]);
  
  // Calculate displayed errors based on rendering strategy
  useEffect(() => {
    if (usePagination) {
      const start = currentPage * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      setDisplayedErrors(errors.slice(start, end));
    } else {
      setDisplayedErrors(errors);
    }
  }, [errors, currentPage, usePagination]);
  
  const totalPages = Math.ceil(errors.length / ITEMS_PER_PAGE);
  const itemData: ErrorRowData = useMemo(() => ({
    errors: displayedErrors,
    selectedError,
    onErrorSelect
  }), [displayedErrors, selectedError, onErrorSelect]);
  
  const errorStats = useMemo(() => {
    // Use reduce for better performance
    const severityCounts = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: errors.length,
      critical: severityCounts.critical || 0,
      high: severityCounts.high || 0,
      medium: severityCounts.medium || 0,
      low: severityCounts.low || 0
    };
  }, [errors]);
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{title}</span>
          </div>
          <div className="text-sm font-normal">
            Total: {errorStats.total}
          </div>
        </CardTitle>
        
        <div className="flex gap-3 mt-2">
          {errorStats.critical > 0 && (
            <div className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: DEFAULT_THEME.colors.critical }}
              />
              <span className="text-xs">{errorStats.critical} Critical</span>
            </div>
          )}
          {errorStats.high > 0 && (
            <div className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: DEFAULT_THEME.colors.high }}
              />
              <span className="text-xs">{errorStats.high} High</span>
            </div>
          )}
          {errorStats.medium > 0 && (
            <div className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: DEFAULT_THEME.colors.medium }}
              />
              <span className="text-xs">{errorStats.medium} Medium</span>
            </div>
          )}
          {errorStats.low > 0 && (
            <div className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: DEFAULT_THEME.colors.low }}
              />
              <span className="text-xs">{errorStats.low} Low</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <AlertCircle size={48} className="mb-4" />
            <p>No errors to display</p>
          </div>
        ) : usePagination ? (
          // Pagination mode for very large datasets
          <div>
            <div style={{ height: height - 180, overflow: 'auto' }}>
              {displayedErrors.map((error, index) => (
                <ErrorRow
                  key={error.id}
                  index={index}
                  style={{ position: 'relative' }}
                  data={itemData}
                />
              ))}
            </div>
            <div className="flex justify-center items-center gap-2 p-4 border-t">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage === totalPages - 1}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        ) : useVirtualScrolling ? (
          // Virtual scrolling for medium datasets
          <List
            height={height - 120}
            itemCount={displayedErrors.length}
            itemSize={itemHeight}
            itemData={itemData}
            overscanCount={5}
          >
            {ErrorRow}
          </List>
        ) : (
          // Regular scrolling for small datasets
          <div style={{ height: height - 120, overflow: 'auto' }}>
            {displayedErrors.map((error, index) => (
              <ErrorRow
                key={error.id}
                index={index}
                style={{ position: 'relative' }}
                data={itemData}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedErrorList.displayName = 'OptimizedErrorList';