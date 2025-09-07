'use client';

import React, { useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Redo, CheckCircle, XCircle } from 'lucide-react';
import { SuggestionCard } from './suggestion-card';
import { useRevisionStore } from '@/lib/stores/revision-store';
import { useAnalysisStore } from '@/lib/stores/analysis-store';
import { cn } from '@/lib/utils';

export const RevisionErrorList: React.FC = () => {
  const analysisErrors = useAnalysisStore((state) => state.errors);
  const {
    errors,
    setErrors,
    acceptSuggestion,
    rejectSuggestion,
    acceptAll,
    rejectAll,
    resetAll,
    undo,
    redo,
    canUndo,
    canRedo,
    getAcceptedSuggestions,
    getRejectedSuggestions,
    getPendingSuggestions
  } = useRevisionStore();

  // Initialize revision errors from analysis errors
  useEffect(() => {
    if (analysisErrors.length > 0 && errors.length === 0) {
      setErrors(analysisErrors);
    }
  }, [analysisErrors, errors.length, setErrors]);

  const handleAccept = useCallback((errorId: string) => {
    acceptSuggestion(errorId);
  }, [acceptSuggestion]);

  const handleReject = useCallback((errorId: string) => {
    rejectSuggestion(errorId);
  }, [rejectSuggestion]);

  const handleUndo = useCallback(() => {
    if (canUndo()) {
      undo();
    }
  }, [canUndo, undo]);

  const handleRedo = useCallback(() => {
    if (canRedo()) {
      redo();
    }
  }, [canRedo, redo]);

  const acceptedCount = getAcceptedSuggestions().length;
  const rejectedCount = getRejectedSuggestions().length;
  const pendingCount = getPendingSuggestions().length;
  const totalCount = errors.length;

  // Group errors by severity for better organization
  const errorsBySeverity = React.useMemo(() => {
    const grouped: Record<string, typeof errors> = {};
    errors.forEach(error => {
      const severity = (error as any).severity || 'medium';
      if (!grouped[severity]) {
        grouped[severity] = [];
      }
      grouped[severity].push(error);
    });
    return grouped;
  }, [errors]);

  const severityOrder = ['critical', 'high', 'medium', 'low'];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span>修改建议</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-sm">
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                {acceptedCount} 已接受
              </Badge>
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                {rejectedCount} 已拒绝
              </Badge>
              <Badge variant="outline">
                {pendingCount} 待处理
              </Badge>
            </div>
          </div>
        </CardTitle>

        {/* Control Bar */}
        <div className="flex items-center gap-2 mt-4 pb-2 border-b">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUndo}
              disabled={!canUndo()}
              title="撤销 (Ctrl+Z)"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRedo}
              disabled={!canRedo()}
              title="重做 (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={acceptAll}
              disabled={pendingCount === 0}
            >
              全部接受
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={rejectAll}
              disabled={pendingCount === 0}
            >
              全部拒绝
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetAll}
              disabled={acceptedCount === 0 && rejectedCount === 0}
            >
              重置
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <AlertCircle size={48} className="mb-4" />
            <p>暂无修改建议</p>
          </div>
        ) : (
          <div className="space-y-6">
            {severityOrder.map(severity => {
              const severityErrors = errorsBySeverity[severity];
              if (!severityErrors || severityErrors.length === 0) return null;

              return (
                <div key={severity} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                    {severity === 'critical' && '严重问题'}
                    {severity === 'high' && '高优先级'}
                    {severity === 'medium' && '中等优先级'}
                    {severity === 'low' && '低优先级'}
                    <span className="ml-2 text-xs">({severityErrors.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {severityErrors.map(error => (
                      <SuggestionCard
                        key={(error as any).id}
                        error={error as any}
                        onAccept={handleAccept}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevisionErrorList;