'use client';

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LogicError, ErrorSeverity } from '@/types/analysis';
import { DEFAULT_THEME } from '@/types/visualization';
import { cn } from '@/lib/utils';

interface ScriptViewerProps {
  scriptContent: string;
  errors: LogicError[];
  selectedError?: LogicError | null;
  onErrorClick?: (error: LogicError) => void;
  title?: string;
  height?: number;
  showLineNumbers?: boolean;
}

interface LineError {
  error: LogicError;
  startLine: number;
  endLine: number;
}

export const ScriptViewer = React.memo<ScriptViewerProps>(({
  scriptContent,
  errors,
  selectedError,
  onErrorClick,
  title = 'Script Viewer',
  height = 600,
  showLineNumbers = true
}) => {
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    // Sanitize the script content to prevent XSS attacks
    const sanitized = DOMPurify.sanitize(scriptContent, { 
      ALLOWED_TAGS: [], // Strip all HTML tags
      KEEP_CONTENT: true // Keep text content
    });
    return sanitized.split('\n');
  }, [scriptContent]);

  const errorsByLine = useMemo(() => {
    const lineErrorMap = new Map<number, LineError[]>();
    
    errors.forEach(error => {
      const startLine = error.location.lineNumber || error.location.line || 0;
      const endLine = error.location.endLine || startLine;
      
      if (startLine > 0) {
        for (let line = startLine; line <= endLine && line <= lines.length; line++) {
          if (!lineErrorMap.has(line)) {
            lineErrorMap.set(line, []);
          }
          lineErrorMap.get(line)!.push({
            error,
            startLine,
            endLine
          });
        }
      }
    });
    
    return lineErrorMap;
  }, [errors, lines.length]);

  const scrollToLine = useCallback((lineNumber: number) => {
    const lineElement = lineRefs.current.get(lineNumber);
    if (lineElement && scrollAreaRef.current) {
      lineElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      lineElement.classList.add('animate-pulse');
      setTimeout(() => {
        lineElement.classList.remove('animate-pulse');
      }, 2000);
    }
  }, []);

  useEffect(() => {
    if (selectedError) {
      const lineNumber = selectedError.location.lineNumber || selectedError.location.line;
      if (lineNumber) {
        scrollToLine(lineNumber);
      }
    }
  }, [selectedError, scrollToLine]);

  const getSeverityColor = (severity: string) => {
    return DEFAULT_THEME.colors[severity as keyof typeof DEFAULT_THEME.colors] || DEFAULT_THEME.colors.medium;
  };

  const getLineHighlightClass = (lineErrors: LineError[] | undefined) => {
    if (!lineErrors || lineErrors.length === 0) return '';
    
    const highestSeverity = lineErrors.reduce((highest, { error }) => {
      const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[error.severity] > severityOrder[highest] ? error.severity : highest;
    }, 'low' as ErrorSeverity);
    
    const severityClasses = {
      critical: 'bg-red-50 border-l-4 border-red-500',
      high: 'bg-orange-50 border-l-4 border-orange-500',
      medium: 'bg-yellow-50 border-l-4 border-yellow-500',
      low: 'bg-green-50 border-l-4 border-green-500'
    };
    
    return severityClasses[highestSeverity];
  };

  const renderErrorMarkers = (lineErrors: LineError[] | undefined) => {
    if (!lineErrors || lineErrors.length === 0) return null;
    
    return (
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
        {lineErrors.map(({ error }, index) => (
          <button
            key={`${error.id}-${index}`}
            onClick={(e) => {
              e.stopPropagation();
              onErrorClick?.(error);
            }}
            className="group relative"
            title={error.description}
          >
            <Badge
              variant="destructive"
              className="cursor-pointer hover:scale-110 transition-transform text-xs px-1 py-0"
              style={{ backgroundColor: getSeverityColor(error.severity) }}
            >
              {error.type.substring(0, 1).toUpperCase()}
            </Badge>
            
            <div className="absolute z-10 hidden group-hover:block bottom-full right-0 mb-2 w-64 p-2 bg-white border rounded-lg shadow-lg">
              <p className="text-xs font-semibold mb-1">{error.type} Error</p>
              <p className="text-xs text-gray-600">
                {DOMPurify.sanitize(error.description, { ALLOWED_TAGS: [] })}
              </p>
              {error.suggestion && (
                <p className="text-xs text-blue-600 mt-1">
                  Suggestion: {DOMPurify.sanitize(error.suggestion, { ALLOWED_TAGS: [] })}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex gap-2 text-sm">
            <span>Lines: {lines.length}</span>
            <span>Errors: {errors.length}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full" style={{ height }} ref={scrollAreaRef}>
          <div className="font-mono text-sm">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const lineErrors = errorsByLine.get(lineNumber);
              const isSelected = selectedError && (
                selectedError.location.lineNumber === lineNumber ||
                selectedError.location.line === lineNumber
              );
              
              return (
                <div
                  key={lineNumber}
                  ref={(el) => {
                    if (el) lineRefs.current.set(lineNumber, el);
                  }}
                  className={cn(
                    'flex relative group hover:bg-gray-50 transition-colors',
                    getLineHighlightClass(lineErrors),
                    isSelected && 'ring-2 ring-blue-500 bg-blue-50'
                  )}
                >
                  {showLineNumbers && (
                    <div className="w-12 px-2 py-1 text-right text-gray-500 select-none border-r">
                      {lineNumber}
                    </div>
                  )}
                  
                  <div className="flex-1 px-4 py-1 pr-20 relative">
                    <pre className="whitespace-pre-wrap break-all">
                      {line || ' '}
                    </pre>
                    {renderErrorMarkers(lineErrors)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

ScriptViewer.displayName = 'ScriptViewer';